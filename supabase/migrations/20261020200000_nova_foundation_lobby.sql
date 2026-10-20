
-- NOVA ZENITH: foundations and lobby only. No online combat resolver.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type private.nz_class as enum ('WARRIOR','MAGE','THIEF','HEALER');
create type private.nz_member_status as enum ('ACTIVE','INACTIVE','LEFT');
create type private.nz_difficulty as enum ('EASY','MEDIUM','HARD');
create type private.nz_game_state as enum ('LOBBY','CHARACTER_SELECT','READY','STORY','EXPLORATION','ENCOUNTER_START','TURN_START','COMBAT_PLANNING','MATH_CHALLENGE','LOCK_ACTION','COMBAT_RESOLUTION','BOSS_ACTION','DEFENSIVE_REACTION','TURN_END','VICTORY','DEFEAT','ENDING','SUSPENDED','COMPLETED','ABORTED');

create table public.rooms(
 id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[A-HJ-NP-Z2-9]{7}$'),
 coordinator_player_id uuid, created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '2 hours'
);
create table public.room_players(
 id uuid primary key default gen_random_uuid(),room_id uuid not null references public.rooms(id) on delete cascade,
 auth_user_id uuid not null references auth.users(id) on delete cascade,nickname text not null check(length(nickname) between 2 and 20),
 seat_index smallint not null check(seat_index between 0 and 3),class_id private.nz_class,
 ready boolean not null default false,member_status private.nz_member_status not null default 'ACTIVE',
 joined_at timestamptz not null default now(),left_at timestamptz,last_seen_at timestamptz not null default now(),
 unique(room_id,auth_user_id),check(not ready or class_id is not null)
);
alter table public.rooms add constraint rooms_coordinator_fk foreign key(coordinator_player_id) references public.room_players(id) on delete set null;
create unique index room_unique_seat on public.room_players(room_id,seat_index) where member_status<>'LEFT';
create unique index room_unique_class on public.room_players(room_id,class_id) where member_status<>'LEFT' and class_id is not null;
create index room_player_auth_idx on public.room_players(auth_user_id,room_id);
create index room_player_status_idx on public.room_players(room_id,member_status);

create table private.rulesets(version text primary key,config_json jsonb not null,created_at timestamptz not null default now());
insert into private.rulesets(version,config_json) values('nz.v1.0','{"name":"NOVA ZENITH","resourceMax":100,"ultimateMax":100,"planningMs":12000,"reconnectGraceMs":60000,"performance":{"PERFECT":1.25,"SUCCESS":1,"FAILED":0.4},"characters":{"WARRIOR":{"maxHp":650,"speed":55,"resistance":0.20},"MAGE":{"maxHp":400,"speed":70,"resistance":0},"THIEF":{"maxHp":450,"speed":100,"resistance":0.05},"HEALER":{"maxHp":500,"speed":60,"resistance":0.10}}}');
create table private.game_sessions(
 id uuid primary key default gen_random_uuid(),room_id uuid not null unique references public.rooms(id) on delete cascade,
 state private.nz_game_state not null default 'LOBBY',state_context text,state_version bigint not null default 0,
 phase_version bigint not null default 0,ruleset_version text not null references private.rulesets(version),
 content_version text not null default 'development-v1',locked_roster_json jsonb not null default '[]',
 party_size smallint check(party_size between 1 and 4),resonance numeric,stage_id text,
 current_turn_id uuid,next_transition_at timestamptz,started_at timestamptz,finished_at timestamptz,outcome text,
 seed uuid not null default gen_random_uuid(),rng_counter bigint not null default 0,next_event_seq bigint not null default 1
);
create index sessions_due_idx on private.game_sessions(next_transition_at) where finished_at is null;
create table public.session_views(
 session_id uuid primary key references private.game_sessions(id) on delete cascade,
 room_id uuid not null unique references public.rooms(id) on delete cascade,
 state_version bigint not null,snapshot_json jsonb not null,updated_at timestamptz not null default now()
);
create table private.combatants(
 id uuid primary key default gen_random_uuid(),session_id uuid not null references private.game_sessions(id) on delete cascade,
 encounter_id text not null,room_player_id uuid references public.room_players(id),kind text not null check(kind in ('PLAYER','ENEMY','CORE')),
 definition_id text not null,hp integer not null,max_hp integer not null check(max_hp>0),
 resource integer not null default 40 check(resource between 0 and 100),ultimate_gauge integer not null default 0 check(ultimate_gauge between 0 and 100),
 shield_hp integer not null default 0 check(shield_hp>=0),speed integer not null default 0,resistance numeric not null default 0 check(resistance between 0 and 1),
 ai_state_json jsonb not null default '{}',check(hp between 0 and max_hp)
);
create index combatants_session_idx on private.combatants(session_id,encounter_id);
create table private.combat_turns(
 id uuid primary key default gen_random_uuid(),session_id uuid not null references private.game_sessions(id) on delete cascade,
 encounter_id text not null,turn_number integer not null check(turn_number>0),member_ids uuid[] not null default '{}',actor_ids uuid[] not null default '{}',
 opened_at timestamptz not null default now(),party_resolved_at timestamptz,boss_intent_json jsonb,boss_intent_committed_at timestamptz,
 boss_resolved_at timestamptz,closed_at timestamptz,summary_json jsonb not null default '{}',unique(session_id,encounter_id,turn_number)
);
create table private.questions(
 revision_id uuid primary key default gen_random_uuid(),logical_question_id text not null,revision_number integer not null,
 difficulty private.nz_difficulty not null,tags text[] not null default '{}',prompt text not null,
 options_json jsonb not null check(jsonb_array_length(options_json)=4),correct_option_id text not null,explanation_json jsonb not null,
 status text not null check(status in ('DRAFT','ACTIVE','RETIRED')),content_version text not null,unique(logical_question_id,revision_number)
);
create index questions_assignment_idx on private.questions(difficulty,status,content_version);
create table private.turn_actions(
 id uuid primary key default gen_random_uuid(),turn_id uuid not null references private.combat_turns(id) on delete cascade,
 actor_id uuid not null references private.combatants(id),skill_id text not null,target_id uuid references private.combatants(id),
 origin text not null check(origin in ('MANUAL','AUTO')),reserved_resource integer not null default 0,
 reserved_ultimate integer not null default 0,performance text check(performance in ('PERFECT','SUCCESS','FAILED')),
 execution_status text not null default 'COMMITTED',committed_at timestamptz not null default now(),resolved_at timestamptz,
 unique(turn_id,actor_id)
);
create table private.challenge_assignments(
 assignment_id uuid primary key default gen_random_uuid(),session_id uuid not null references private.game_sessions(id) on delete cascade,
 turn_id uuid not null references private.combat_turns(id),actor_id uuid not null references private.combatants(id),
 context text not null check(context in ('ACTION','REACTION','TEAM_RUNE')),slot integer not null default 0,
 question_revision_id uuid not null references private.questions(revision_id),option_permutation jsonb not null,
 starts_at timestamptz not null,deadline_at timestamptz not null,answered_at timestamptz,selected_option_token text,grade_json jsonb,
 unique(turn_id,actor_id,context,slot),check(deadline_at>starts_at)
);
create index assignments_deadline_idx on private.challenge_assignments(deadline_at) where grade_json is null;
create index assignments_actor_idx on private.challenge_assignments(actor_id,turn_id,context);
create table private.combat_effects(
 id uuid primary key default gen_random_uuid(),session_id uuid not null references private.game_sessions(id) on delete cascade,
 encounter_id text not null,effect_type text not null,source_actor_id uuid references private.combatants(id),
 target_scope text not null check(target_scope in ('SELF','COMBATANT','PARTY','ENEMY')),
 target_id uuid references private.combatants(id),magnitude numeric not null,active_from_round integer not null,
 expires_after_round integer not null,consume_on text,charges integer not null default 1,created_event_seq bigint
);
create index effects_session_idx on private.combat_effects(session_id,encounter_id,expires_after_round);
create table private.combat_events(
 id uuid primary key default gen_random_uuid(),session_id uuid not null references private.game_sessions(id) on delete cascade,
 turn_id uuid references private.combat_turns(id),event_seq bigint not null,event_type text not null,dedupe_key text not null,
 public_payload_json jsonb not null default '{}',private_payload_json jsonb not null default '{}',created_at timestamptz not null default now(),
 unique(session_id,event_seq),unique(session_id,dedupe_key)
);
create table private.command_receipts(
 auth_user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,
 session_id uuid references private.game_sessions(id) on delete cascade,command_type text not null,payload_json jsonb not null,
 result_json jsonb not null,created_at timestamptz not null default now(),primary key(auth_user_id,request_id)
);
create index receipts_rate_idx on private.command_receipts(auth_user_id,created_at);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.session_views enable row level security;
do $$ declare t text; begin
 foreach t in array array['rulesets','game_sessions','combatants','combat_turns','questions','turn_actions','challenge_assignments','combat_effects','combat_events','command_receipts'] loop
 execute format('alter table private.%I enable row level security',t);
 end loop;
end $$;
revoke all on all tables in schema private from public,anon,authenticated;
revoke all on public.rooms,public.room_players,public.session_views from anon,authenticated;
grant select on public.rooms,public.room_players,public.session_views to authenticated;
create policy own_membership on public.room_players for select to authenticated using(auth_user_id=(select auth.uid()));
create policy member_room on public.rooms for select to authenticated using(exists(select 1 from public.room_players p where p.room_id=rooms.id and p.auth_user_id=(select auth.uid()) and p.member_status<>'LEFT'));
create policy member_projection on public.session_views for select to authenticated using(exists(select 1 from public.room_players p where p.room_id=session_views.room_id and p.auth_user_id=(select auth.uid()) and p.member_status<>'LEFT'));

create function private.nz_publish_v1(p_room uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.rooms%rowtype; s private.game_sessions%rowtype; j jsonb;
begin
 select * into r from public.rooms where id=p_room;
 update private.game_sessions set state_version=state_version+1 where room_id=p_room returning * into s;
 j:=jsonb_build_object('id',r.id,'sessionId',s.id,'code',r.code,'coordinatorId',r.coordinator_player_id,'state',s.state,
 'version',s.state_version::text,'expiresAt',r.expires_at,'serverNow',clock_timestamp(),
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'userId',p.auth_user_id,'nickname',p.nickname,'classId',p.class_id,
 'ready',p.ready,'status',p.member_status,'seat',p.seat_index,'lastSeenAt',p.last_seen_at) order by p.seat_index)
 from public.room_players p where p.room_id=p_room and p.member_status<>'LEFT'),'[]'::jsonb));
 insert into public.session_views(session_id,room_id,state_version,snapshot_json) values(s.id,r.id,s.state_version,j)
 on conflict(session_id) do update set state_version=excluded.state_version,snapshot_json=excluded.snapshot_json,updated_at=clock_timestamp();
 return j;
end $$;

create function private.nz_reconcile_v1(p_room uuid) returns void language plpgsql security definer set search_path='' as $$
declare n integer; changed boolean:=false; current_host uuid; next_host uuid; s private.game_sessions%rowtype;
begin
 select * into s from private.game_sessions where room_id=p_room for update;
 if s.state not in ('LOBBY','CHARACTER_SELECT','READY') then return; end if;
 update public.room_players set member_status='INACTIVE',ready=false
 where room_id=p_room and member_status='ACTIVE' and last_seen_at<=clock_timestamp()-interval '60 seconds';
 get diagnostics n=row_count;changed:=n>0;
 select coordinator_player_id into current_host from public.rooms where id=p_room;
 if current_host is null or not exists(select 1 from public.room_players where id=current_host and member_status='ACTIVE') then
 select id into next_host from public.room_players where room_id=p_room and member_status='ACTIVE' order by joined_at,id limit 1;
 if current_host is distinct from next_host then update public.rooms set coordinator_player_id=next_host where id=p_room;changed:=true;end if;
 end if;
 if changed then
 update private.game_sessions set state='CHARACTER_SELECT',phase_version=phase_version+1 where id=s.id;
 perform private.nz_publish_v1(p_room);
 end if;
end $$;

create function private.nz_lobby_guarded_v1(p_command text,p_payload jsonb,p_request_id uuid) returns jsonb
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
 on conflict(room_id,auth_user_id) do update set nickname=excluded.nickname,seat_index=excluded.seat_index,class_id=null,ready=false,member_status='ACTIVE',left_at=null,last_seen_at=clock_timestamp();
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
 if p_command='SELECT_CLASS' then
 chosen:=nullif(p_payload->>'classId','')::private.nz_class;
 if exists(select 1 from public.room_players where room_id=rid and member_status<>'LEFT' and class_id=chosen and id<>me.id) then raise exception 'CLASS_TAKEN';end if;
 update public.room_players set class_id=chosen,last_seen_at=clock_timestamp(),member_status='ACTIVE' where id=me.id;
 update public.room_players set ready=false where room_id=rid;
 update private.game_sessions set state='CHARACTER_SELECT',phase_version=phase_version+1 where id=sid;
 elsif p_command='SET_READY' then
 if me.class_id is null then raise exception 'CLASS_REQUIRED';end if;
 update public.room_players set ready=coalesce((p_payload->>'ready')::boolean,false),last_seen_at=clock_timestamp(),member_status='ACTIVE' where id=me.id;
 update private.game_sessions set state=case when not exists(select 1 from public.room_players where room_id=rid and member_status<>'LEFT' and (not ready or class_id is null or member_status<>'ACTIVE')) then 'READY'::private.nz_game_state else 'CHARACTER_SELECT'::private.nz_game_state end,phase_version=phase_version+1 where id=sid;
 elsif p_command='START' then
 if host is distinct from me.id then raise exception 'NOT_COORDINATOR';end if;
 if s.state<>'READY' or exists(select 1 from public.room_players where room_id=rid and member_status<>'LEFT' and (not ready or class_id is null or member_status<>'ACTIVE')) then raise exception 'NOT_READY';end if;
 select count(*) into members from public.room_players where room_id=rid and member_status='ACTIVE';
 if members not between 1 and 4 then raise exception 'INVALID_ROSTER';end if;
 update private.game_sessions set state='STORY',state_context='AWAITING_COMBAT_INTEGRATION',party_size=members,
 locked_roster_json=(select jsonb_agg(jsonb_build_object('playerId',id,'classId',class_id,'seat',seat_index) order by seat_index) from public.room_players where room_id=rid and member_status='ACTIVE'),
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

revoke all on function private.nz_publish_v1(uuid),private.nz_reconcile_v1(uuid),private.nz_lobby_guarded_v1(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function private.nz_lobby_guarded_v1(text,jsonb,uuid) to authenticated;
create function public.nz_lobby_v1(p_command text,p_payload jsonb default '{}',p_request_id uuid default gen_random_uuid())
returns jsonb language sql security invoker set search_path='' as $$select private.nz_lobby_guarded_v1(p_command,p_payload,p_request_id)$$;
revoke all on function public.nz_lobby_v1(text,jsonb,uuid) from public,anon;
grant execute on function public.nz_lobby_v1(text,jsonb,uuid) to authenticated;

create function private.nz_presence_allowed_v1(topic text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.room_players p where p.auth_user_id=(select auth.uid()) and p.member_status<>'LEFT' and topic='nz:room:'||p.room_id::text||':presence')
$$;
revoke all on function private.nz_presence_allowed_v1(text) from public,anon;
grant execute on function private.nz_presence_allowed_v1(text) to authenticated;
create policy nz_presence_receive on realtime.messages for select to authenticated using(extension='presence' and private.nz_presence_allowed_v1((select realtime.topic())));
create policy nz_presence_send on realtime.messages for insert to authenticated with check(extension='presence' and private.nz_presence_allowed_v1((select realtime.topic())));
alter publication supabase_realtime add table public.session_views;
