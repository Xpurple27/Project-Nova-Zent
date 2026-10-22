-- Per-member school choice; all gameplay calculations and grading remain unchanged.
alter table public.room_players add column school_level text check(school_level in ('SD','SMP','SMA'));
-- Existing members keep the choice of their existing room. New memberships must choose explicitly.
update public.room_players p set school_level=r.school_level from public.rooms r where r.id=p.room_id;
alter table public.room_players add constraint ready_requires_school check(not ready or school_level is not null);
alter table private.questions add column school_level text check(school_level in ('SD','SMP','SMA')),
 add column question_class_id private.nz_class;
create index questions_school_class_serving on private.questions(school_level,question_class_id,difficulty) where status='ACTIVE' and content_version='production-v1';
create or replace function private.nz_publish_v1(p_room uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.rooms%rowtype; s private.game_sessions%rowtype; j jsonb;
begin
 select * into r from public.rooms where id=p_room;
 update private.game_sessions set state_version=state_version+1 where room_id=p_room returning * into s;
 j:=jsonb_build_object('id',r.id,'sessionId',s.id,'code',r.code,'coordinatorId',r.coordinator_player_id,'state',s.state,
 'version',s.state_version::text,'expiresAt',r.expires_at,'serverNow',clock_timestamp(),
 'combat',case when s.combat_public is null then null else s.combat_public||jsonb_build_object('version',s.state_version::text) end,
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'userId',p.auth_user_id,'nickname',p.nickname,'classId',p.class_id,'schoolLevel',p.school_level,
 'ready',p.ready,'status',case when p.member_status='ACTIVE' and p.last_seen_at<=clock_timestamp()-interval '60 seconds' then 'INACTIVE' else p.member_status::text end,'seat',p.seat_index,'lastSeenAt',p.last_seen_at) order by p.seat_index)
 from public.room_players p where p.room_id=p_room and p.member_status<>'LEFT'),'[]'::jsonb));
 insert into public.session_views(session_id,room_id,state_version,snapshot_json) values(s.id,r.id,s.state_version,j)
 on conflict(session_id) do update set state_version=excluded.state_version,snapshot_json=excluded.snapshot_json,updated_at=clock_timestamp();
 return j;
end $$;

create or replace function private.nz_lobby_guarded_v1(p_command text,p_payload jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); rid uuid; sid uuid; me public.room_players%rowtype; s private.game_sessions%rowtype;
 result jsonb; receipt private.command_receipts%rowtype; code_value text; nickname_value text; chosen private.nz_class;
 slot integer; members integer; attempt integer; host uuid; target uuid;
begin
 if uid is null then raise exception 'UNAUTHENTICATED';end if;
 if length(p_payload::text)>8192 then raise exception 'PAYLOAD_TOO_LARGE';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if p_command not in ('GET','HEARTBEAT') then
 select * into receipt from private.command_receipts where auth_user_id=uid and request_id=p_request_id;
 if found then
 if receipt.command_type<>p_command or receipt.payload_json<>p_payload then raise exception 'IDEMPOTENCY_KEY_REUSED';end if;
 return receipt.result_json;
 end if;
 if (select count(*) from private.command_receipts where auth_user_id=uid and created_at>clock_timestamp()-interval '10 seconds')>=20 then raise exception 'RATE_LIMITED';end if;
 if p_command in ('CREATE','JOIN') and (select count(*) from private.command_receipts where auth_user_id=uid and command_type in ('CREATE','JOIN') and created_at>clock_timestamp()-interval '1 minute')>=5 then raise exception 'RATE_LIMITED';end if;
 end if;
 if p_command='CREATE' then
 nickname_value:=btrim(coalesce(p_payload->>'nickname',''));
 if length(nickname_value) not between 2 and 20 then raise exception 'INVALID_NICKNAME';end if;
 for attempt in 1..10 loop
 select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',(get_byte(uuid_send(gen_random_uuid()),i)%32)+1,1),'') into code_value from unnest(array[0,1,2,3,4,5,8]) as x(i);
 begin insert into public.rooms(code) values(code_value) returning id into rid;exit;
 exception when unique_violation then if attempt=10 then raise exception 'CODE_ALLOCATION_FAILED';end if;end;
 end loop;
 insert into private.game_sessions(room_id,ruleset_version) values(rid,'nz.v1.0') returning id into sid;
 insert into public.room_players(room_id,auth_user_id,nickname,seat_index) values(rid,uid,nickname_value,0) returning * into me;
 update public.rooms set coordinator_player_id=me.id where id=rid;
 result:=private.nz_publish_v1(rid);
 elsif p_command='JOIN' then
 select id into rid from public.rooms where code=upper(btrim(p_payload->>'code'));
 if rid is null then raise exception 'ROOM_NOT_FOUND';end if;
 select * into s from private.game_sessions where room_id=rid for update;sid:=s.id;
 perform private.nz_reconcile_v1(rid);
 select * into s from private.game_sessions where id=sid;
 if (select expires_at from public.rooms where id=rid)<=clock_timestamp() then raise exception 'ROOM_EXPIRED';end if;
 select * into me from public.room_players where room_id=rid and auth_user_id=uid and member_status<>'LEFT';
 if found then
 update public.room_players set last_seen_at=clock_timestamp(),member_status='ACTIVE' where id=me.id;
 result:=private.nz_publish_v1(rid);
 else
 if s.state not in ('LOBBY','CHARACTER_SELECT','READY') then raise exception 'RUN_ALREADY_STARTED';end if;
 select count(*) into members from public.room_players where room_id=rid and member_status<>'LEFT';
 if members>=4 then raise exception 'ROOM_FULL';end if;
 nickname_value:=btrim(coalesce(p_payload->>'nickname',''));
 if length(nickname_value) not between 2 and 20 then raise exception 'INVALID_NICKNAME';end if;
 select i into slot from generate_series(0,3) as g(i) where not exists(select 1 from public.room_players where room_id=rid and member_status<>'LEFT' and seat_index=i) order by i limit 1;
 insert into public.room_players(room_id,auth_user_id,nickname,seat_index) values(rid,uid,nickname_value,slot)
 on conflict(room_id,auth_user_id) do update set nickname=excluded.nickname,seat_index=excluded.seat_index,class_id=null,school_level=null,ready=false,member_status='ACTIVE',left_at=null,last_seen_at=clock_timestamp();
 update public.room_players set ready=false where room_id=rid;
 update private.game_sessions set state='CHARACTER_SELECT',phase_version=phase_version+1 where id=sid;
 result:=private.nz_publish_v1(rid);
 end if;
 else
 rid:=(p_payload->>'roomId')::uuid;
 select * into s from private.game_sessions where room_id=rid for update;
 if not found then raise exception 'ROOM_NOT_FOUND';end if;sid:=s.id;
 select * into me from public.room_players where room_id=rid and auth_user_id=uid and member_status<>'LEFT';
 if not found then raise exception 'NOT_A_MEMBER';end if;
 if (select expires_at from public.rooms where id=rid)<=clock_timestamp() then raise exception 'ROOM_EXPIRED';end if;
 perform private.nz_reconcile_v1(rid);
 select * into s from private.game_sessions where id=sid;
 select * into me from public.room_players where id=me.id;
 select coordinator_player_id into host from public.rooms where id=rid;
 if p_command='GET' then
 select snapshot_json||jsonb_build_object('serverNow',clock_timestamp()) into result from public.session_views where room_id=rid;return result;
 elsif p_command='HEARTBEAT' then
 update public.room_players set last_seen_at=clock_timestamp(),member_status='ACTIVE' where id=me.id;
 update public.rooms set expires_at=clock_timestamp()+interval '2 hours' where id=rid and s.state in ('LOBBY','CHARACTER_SELECT','READY');
 if me.member_status<>'ACTIVE' then
 update public.room_players set ready=false where id=me.id;
 perform private.nz_reconcile_v1(rid);result:=private.nz_publish_v1(rid);
 else select snapshot_json||jsonb_build_object('serverNow',clock_timestamp()) into result from public.session_views where room_id=rid;end if;
 return result;
 else
 if s.state not in ('LOBBY','CHARACTER_SELECT','READY') then raise exception 'RUN_ALREADY_STARTED';end if;
 if p_command='SELECT_SCHOOL' then
 if coalesce(p_payload->>'schoolLevel','') not in ('SD','SMP','SMA') then raise exception 'INVALID_SCHOOL_LEVEL';end if;
 if me.school_level is not distinct from p_payload->>'schoolLevel' then
 result:=private.nz_publish_v1(rid);
 else
 update public.room_players set school_level=p_payload->>'schoolLevel',last_seen_at=clock_timestamp(),member_status='ACTIVE' where id=me.id;
 update public.room_players set ready=false where room_id=rid;
 update private.game_sessions set state='CHARACTER_SELECT',phase_version=phase_version+1 where id=sid;
 end if;
 elsif p_command='SELECT_CLASS' then
 chosen:=nullif(p_payload->>'classId','')::private.nz_class;
 if exists(select 1 from public.room_players where room_id=rid and member_status<>'LEFT' and class_id=chosen and id<>me.id) then raise exception 'CLASS_TAKEN';end if;
 update public.room_players set class_id=chosen,last_seen_at=clock_timestamp(),member_status='ACTIVE' where id=me.id;
 update public.room_players set ready=false where room_id=rid;
 update private.game_sessions set state='CHARACTER_SELECT',phase_version=phase_version+1 where id=sid;
 elsif p_command='SET_READY' then
 if me.class_id is null then raise exception 'CLASS_REQUIRED';end if;
 if me.school_level is null and coalesce((p_payload->>'ready')::boolean,false) then raise exception 'SCHOOL_LEVEL_REQUIRED';end if;
 update public.room_players set ready=coalesce((p_payload->>'ready')::boolean,false),last_seen_at=clock_timestamp(),member_status='ACTIVE' where id=me.id;
 update private.game_sessions set state=case when not exists(select 1 from public.room_players where room_id=rid and member_status<>'LEFT' and (not ready or class_id is null or school_level is null or member_status<>'ACTIVE')) then 'READY'::private.nz_game_state else 'CHARACTER_SELECT'::private.nz_game_state end,phase_version=phase_version+1 where id=sid;
 elsif p_command='START' then
 if host is distinct from me.id then raise exception 'NOT_COORDINATOR';end if;
 if s.state<>'READY' or exists(select 1 from public.room_players where room_id=rid and member_status<>'LEFT' and (not ready or class_id is null or school_level is null or member_status<>'ACTIVE')) then raise exception 'NOT_READY';end if;
 select count(*) into members from public.room_players where room_id=rid and member_status='ACTIVE';
 if members not between 1 and 4 then raise exception 'INVALID_ROSTER';end if;
 update private.game_sessions set state='STORY',state_context='AWAITING_COMBAT_INTEGRATION',party_size=members,
 locked_roster_json=(select jsonb_agg(jsonb_build_object('playerId',id,'classId',class_id,'schoolLevel',school_level,'seat',seat_index) order by seat_index) from public.room_players where room_id=rid and member_status='ACTIVE'),
 started_at=clock_timestamp(),phase_version=phase_version+1 where id=sid;
 elsif p_command='LEAVE' then
 update public.room_players set member_status='LEFT',left_at=clock_timestamp(),class_id=null,ready=false where id=me.id;
 update public.room_players set ready=false where room_id=rid;
 update private.game_sessions set state='CHARACTER_SELECT',phase_version=phase_version+1 where id=sid;
 perform private.nz_reconcile_v1(rid);
 elsif p_command='REMOVE_INACTIVE' then
 if host is distinct from me.id then raise exception 'NOT_COORDINATOR';end if;
 target:=(p_payload->>'playerId')::uuid;
 update public.room_players set member_status='LEFT',left_at=clock_timestamp(),class_id=null,ready=false
 where id=target and room_id=rid and member_status='INACTIVE' and last_seen_at<=clock_timestamp()-interval '60 seconds';
 if not found then raise exception 'PLAYER_NOT_INACTIVE';end if;
 update public.room_players set ready=false where room_id=rid;
 update private.game_sessions set state='CHARACTER_SELECT',phase_version=phase_version+1 where id=sid;
 else raise exception 'UNKNOWN_COMMAND';end if;
 result:=private.nz_publish_v1(rid);
 end if;
 end if;
 insert into private.command_receipts(auth_user_id,request_id,session_id,command_type,payload_json,result_json) values(uid,p_request_id,sid,p_command,p_payload,result);
 return result;
exception when unique_violation then raise exception 'CLASS_OR_SEAT_TAKEN';
end $$;

create or replace function public.nz_school_level_v1(p_room uuid,p_level text) returns jsonb language sql security invoker set search_path='' as $$
 select public.nz_lobby_v1('SELECT_SCHOOL',jsonb_build_object('roomId',p_room,'schoolLevel',p_level),gen_random_uuid())
$$;
create or replace function public.nz_combat_load_v1(p_session uuid,p_uid uuid default null,p_token uuid default null,p_request uuid default null,p_payload jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.game_sessions%rowtype; receipt private.command_receipts%rowtype; members jsonb;
begin
 select * into s from private.game_sessions where id=p_session;
 if not found then raise exception 'SESSION_NOT_FOUND';end if;
 if p_uid is null then
 if not exists(select 1 from private.combat_jobs where session_id=s.id and token=p_token and expires_at>clock_timestamp()) then raise exception 'INVALID_WORKER_CAPABILITY';end if;
 elsif not exists(select 1 from public.room_players where room_id=s.room_id and auth_user_id=p_uid and member_status<>'LEFT') then raise exception 'NOT_A_MEMBER';end if;
 if p_uid is not null and p_request is not null then
 select * into receipt from private.command_receipts where auth_user_id=p_uid and request_id=p_request;
 if found then
 if receipt.session_id<>p_session or receipt.command_type<>'COMBAT_'||(p_payload->>'kind') or receipt.payload_json<>p_payload then raise exception 'IDEMPOTENCY_KEY_REUSED';end if;
 return jsonb_build_object('receipt',receipt.result_json);
 end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'userId',p.auth_user_id,'schoolLevel',coalesce((select x->>'schoolLevel' from jsonb_array_elements(s.locked_roster_json) x where x->>'playerId'=p.id::text),r.school_level),'classId',p.class_id,'nickname',p.nickname,'seat',p.seat_index,'lastSeen',extract(epoch from p.last_seen_at)*1000,'left',p.member_status='LEFT') order by p.seat_index),'[]') into members
 from public.room_players p join public.rooms r on r.id=p.room_id where p.room_id=s.room_id and exists(select 1 from jsonb_array_elements(s.locked_roster_json) x where x->>'playerId'=p.id::text);
 return jsonb_build_object('sessionId',s.id,'roomId',s.room_id,'state',s.state,'version',s.state_version::text,'now',extract(epoch from clock_timestamp())*1000,'campaignEnabled',s.campaign_enabled,'document',s.combat_json,'members',members,'seed',s.seed,'outcome',s.outcome);
end $$;


-- Only service-role game workers may obtain the private bank. Filter the roster again in TypeScript.
create function public.nz_combat_bank_v3(p_session uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',q.revision_id,'difficulty',q.difficulty,'category',q.tags[1],
 'prompt',q.prompt,'options',q.options_json,'correct',q.correct_option_id,'affinity',q.explanation_json->'affinity',
 'schoolLevel',q.school_level,'classId',q.question_class_id) order by q.logical_question_id),'[]'::jsonb)
 from private.questions q where q.status='ACTIVE' and q.content_version='production-v1' and q.reviewed_at is not null
 and exists(select 1 from private.game_sessions s join public.rooms r on r.id=s.room_id
 cross join lateral jsonb_array_elements(s.locked_roster_json) m where s.id=p_session
 and q.school_level=coalesce(m->>'schoolLevel',r.school_level) and q.question_class_id::text=m->>'classId')
$$;
revoke all on function public.nz_combat_bank_v3(uuid) from public,anon,authenticated;
grant execute on function public.nz_combat_bank_v3(uuid) to service_role;

-- Private, atomic full-bank publication: keep historical revisions/assignments; retire superseded active rows.
create function public.nz_question_import_v2(p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare q jsonb; lvl text; cls text; diff text;
begin
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)<>720 then raise exception 'INVALID_BANK_SIZE';end if;
 perform pg_advisory_xact_lock(hashtextextended('nova-question-bank-v1',0));
 if (select count(distinct x->>'revision_id') from jsonb_array_elements(p_items)x)<>720
 or (select count(distinct lower(regexp_replace(x->>'prompt','\s+',' ','g'))) from jsonb_array_elements(p_items)x)<>720 then raise exception 'DUPLICATE_ITEM';end if;
 foreach lvl in array array['SD','SMP','SMA'] loop
 foreach cls in array array['WARRIOR','MAGE','THIEF','HEALER'] loop
 foreach diff in array array['EASY','MEDIUM','HARD'] loop
 if (select count(*) from jsonb_array_elements(p_items)x where x->>'school_level'=lvl and x->>'question_class_id'=cls and x->>'difficulty'=diff)<>20 then raise exception 'INSUFFICIENT_SCHOOL_CLASS_DIFFICULTY_COVERAGE';end if;
 end loop;end loop;end loop;
 for q in select value from jsonb_array_elements(p_items) loop
 if q->>'content_version' is distinct from 'production-v1' or q->>'status' is distinct from 'ACTIVE'
 or q#>>'{explanation_json,reviewStatus}' is distinct from 'reviewed' or length(coalesce(q->>'reviewed_by',''))=0
 or length(coalesce(q#>>'{explanation_json,expectedSolution}',''))=0 or length(coalesce(q#>>'{explanation_json,explanation}',''))=0
 or q#>>'{explanation_json,schoolLevel}' is distinct from q->>'school_level'
 or q#>>'{explanation_json,primaryClass}' is distinct from q->>'question_class_id' then raise exception 'UNREVIEWED_ITEM';end if;
 if length(coalesce(q->>'prompt',''))=0 or jsonb_typeof(q->'options_json') is distinct from 'array' or jsonb_array_length(q->'options_json')<>4
 or (select count(distinct o->>'id') from jsonb_array_elements(q->'options_json')o)<>4
 or (select count(distinct lower(trim(o->>'text'))) from jsonb_array_elements(q->'options_json')o)<>4
 or exists(select 1 from jsonb_array_elements(q->'options_json')o where length(coalesce(o->>'id',''))=0 or length(coalesce(o->>'text',''))=0)
 or (select count(*) from jsonb_array_elements(q->'options_json')o where o->>'id'=q->>'correct_option_id')<>1 then raise exception 'INVALID_ITEM';end if;
 if exists(select 1 from private.questions x where (x.revision_id::text=q->>'revision_id' or (x.logical_question_id=q->>'logical_question_id' and x.revision_number=(q->>'revision_number')::int))
 and (x.revision_id::text<>q->>'revision_id' or x.logical_question_id<>q->>'logical_question_id' or x.revision_number<>(q->>'revision_number')::int or x.difficulty::text<>q->>'difficulty'
 or x.prompt<>q->>'prompt' or x.options_json<>q->'options_json' or x.correct_option_id<>q->>'correct_option_id')) then raise exception 'IMMUTABLE_QUESTION_REVISION';end if;
 end loop;
 update private.questions set status='RETIRED' where status='ACTIVE' and content_version='production-v1'
 and not exists(select 1 from jsonb_array_elements(p_items)x where x->>'revision_id'=revision_id::text);
 for q in select value from jsonb_array_elements(p_items) loop
 insert into private.questions(revision_id,logical_question_id,revision_number,difficulty,tags,prompt,options_json,correct_option_id,explanation_json,status,content_version,estimated_solve_ms,reviewed_at,reviewed_by,school_level,question_class_id)
 values((q->>'revision_id')::uuid,q->>'logical_question_id',(q->>'revision_number')::int,(q->>'difficulty')::private.nz_difficulty,
 array(select value from jsonb_array_elements_text(q->'tags')),q->>'prompt',q->'options_json',q->>'correct_option_id',q->'explanation_json','ACTIVE','production-v1',
 (q->>'estimated_solve_ms')::int,clock_timestamp(),q->>'reviewed_by',q->>'school_level',(q->>'question_class_id')::private.nz_class)
 on conflict(revision_id) do update set tags=excluded.tags,school_level=excluded.school_level,question_class_id=excluded.question_class_id,
 explanation_json=excluded.explanation_json,status=excluded.status,estimated_solve_ms=excluded.estimated_solve_ms,reviewed_at=excluded.reviewed_at,reviewed_by=excluded.reviewed_by;
 end loop;
 return jsonb_build_object('active',(select count(*) from private.questions where status='ACTIVE' and content_version='production-v1'),'schoolClasses',12);
end $$;
revoke all on function public.nz_question_import_v2(jsonb) from public,anon,authenticated;
grant execute on function public.nz_question_import_v2(jsonb) to service_role;

