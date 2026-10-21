-- NOVA ZENITH: service-only CAS persistence. No combat formulas in SQL.
alter table private.game_sessions add column combat_json jsonb, add column combat_public jsonb;
alter table private.combat_turns add column phase text, add column phase_deadline timestamptz, add column state_version bigint;
alter table private.turn_actions add column target_key text, add column revive_target_key text;
create unique index combatants_definition_once on private.combatants(session_id,encounter_id,definition_id);
create table private.combat_jobs(session_id uuid primary key references private.game_sessions(id) on delete cascade,token uuid not null,expires_at timestamptz not null,retry_at timestamptz not null);
alter table private.combat_jobs enable row level security;
revoke all on private.combat_jobs from public,anon,authenticated;

create or replace function private.nz_publish_v1(p_room uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.rooms%rowtype; s private.game_sessions%rowtype; j jsonb;
begin
 select * into r from public.rooms where id=p_room;
 update private.game_sessions set state_version=state_version+1 where room_id=p_room returning * into s;
 j:=jsonb_build_object('id',r.id,'sessionId',s.id,'code',r.code,'coordinatorId',r.coordinator_player_id,'state',s.state,
 'version',s.state_version::text,'expiresAt',r.expires_at,'serverNow',clock_timestamp(),
 'combat',case when s.combat_public is null then null else s.combat_public||jsonb_build_object('version',s.state_version::text) end,
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'userId',p.auth_user_id,'nickname',p.nickname,'classId',p.class_id,
 'ready',p.ready,'status',case when p.member_status='ACTIVE' and p.last_seen_at<=clock_timestamp()-interval '60 seconds' then 'INACTIVE' else p.member_status::text end,'seat',p.seat_index,'lastSeenAt',p.last_seen_at) order by p.seat_index)
 from public.room_players p where p.room_id=p_room and p.member_status<>'LEFT'),'[]'::jsonb));
 insert into public.session_views(session_id,room_id,state_version,snapshot_json) values(s.id,r.id,s.state_version,j)
 on conflict(session_id) do update set state_version=excluded.state_version,snapshot_json=excluded.snapshot_json,updated_at=clock_timestamp();
 return j;
end $$;

create function public.nz_combat_load_v1(p_session uuid,p_uid uuid default null,p_token uuid default null,p_request uuid default null,p_payload jsonb default null)
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
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'userId',p.auth_user_id,'classId',p.class_id,'nickname',p.nickname,'seat',p.seat_index,'lastSeen',extract(epoch from p.last_seen_at)*1000,'left',p.member_status='LEFT') order by p.seat_index),'[]') into members
 from public.room_players p where p.room_id=s.room_id and exists(select 1 from jsonb_array_elements(s.locked_roster_json) x where x->>'playerId'=p.id::text);
 return jsonb_build_object('sessionId',s.id,'roomId',s.room_id,'state',s.state,'version',s.state_version::text,'now',extract(epoch from clock_timestamp())*1000,'document',s.combat_json,'members',members,'seed',s.seed,'outcome',s.outcome);
end $$;

create function public.nz_combat_bank_v1() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',revision_id,'difficulty',difficulty,'category',tags[1],'prompt',prompt,'options',options_json,'correct',correct_option_id) order by logical_question_id),'[]') from private.questions where status='ACTIVE' and content_version='pilot-v1'
$$;

create function private.nz_combat_audit_v1(d jsonb,v bigint) returns void language plpgsql security definer set search_path='' as $$
declare p jsonb; a jsonb; q jsonb; sid uuid:=(d->>'sessionId')::uuid; tid uuid:=nullif(d->>'turnId','')::uuid;
begin
 for p in select value from jsonb_array_elements(d#>'{engine,party}') loop
 insert into private.combatants(id,session_id,encounter_id,room_player_id,kind,definition_id,hp,max_hp,resource,ultimate_gauge,speed,resistance)
 values((p->>'id')::uuid,sid,'abyss-guardian',(p->>'id')::uuid,'PLAYER',p->>'classId',(p->>'hp')::int,(p->>'maxHp')::int,(p->>'resource')::int,(p->>'ultimate')::int,(p->>'speed')::int,(p->>'resistance')::numeric)
 on conflict(id) do update set hp=excluded.hp,resource=excluded.resource,ultimate_gauge=excluded.ultimate_gauge;
 end loop;
 if tid is null then return;end if;
 insert into private.combat_turns(id,session_id,encounter_id,turn_number,member_ids,actor_ids,opened_at,phase,phase_deadline,state_version,boss_intent_json)
 values(tid,sid,'abyss-guardian',(d#>>'{engine,turn}')::int,array(select (value->>'id')::uuid from jsonb_array_elements(d#>'{engine,party}')),array(select value::uuid from jsonb_array_elements_text(d->'actors')),to_timestamp((d->>'openedAt')::numeric/1000),d->>'phase',to_timestamp((d->>'deadline')::numeric/1000),v,d->'intent')
 on conflict(id) do update set phase=excluded.phase,phase_deadline=excluded.phase_deadline,state_version=excluded.state_version,boss_intent_json=excluded.boss_intent_json,
 party_resolved_at=case when excluded.phase in ('COMBAT_RESOLUTION','BOSS_ACTION','DEFENSIVE_REACTION','TEAM_RUNE','TURN_END','VICTORY','DEFEAT') then coalesce(private.combat_turns.party_resolved_at,clock_timestamp()) else private.combat_turns.party_resolved_at end,
 boss_intent_committed_at=case when excluded.boss_intent_json<>'null'::jsonb then coalesce(private.combat_turns.boss_intent_committed_at,clock_timestamp()) else private.combat_turns.boss_intent_committed_at end,
 boss_resolved_at=case when excluded.phase in ('TURN_END','DEFEAT') then coalesce(private.combat_turns.boss_resolved_at,clock_timestamp()) else private.combat_turns.boss_resolved_at end;
 for a in select value from jsonb_each(d->'actions') loop
 insert into private.turn_actions(turn_id,actor_id,skill_id,target_key,revive_target_key,origin,performance)
 values(tid,(a->>'actorId')::uuid,a->>'skillId',a->>'targetId',a->>'reviveTargetId',a->>'origin',a->>'performance')
 on conflict(turn_id,actor_id) do update set performance=excluded.performance,
 execution_status=case when d->>'phase' in ('COMBAT_RESOLUTION','BOSS_ACTION','DEFENSIVE_REACTION','TEAM_RUNE','TURN_END','VICTORY','DEFEAT') then 'RESOLVED' else 'COMMITTED' end;
 end loop;
 for q in select value from jsonb_array_elements(d->'assignments') loop
 insert into private.challenge_assignments(assignment_id,session_id,turn_id,actor_id,context,question_revision_id,option_permutation,starts_at,deadline_at,answered_at,selected_option_token,grade_json)
 values((q->>'id')::uuid,sid,tid,(q->>'actorId')::uuid,q->>'context',(q->>'questionId')::uuid,q->'options',to_timestamp((q->>'startsAt')::numeric/1000),to_timestamp((q->>'deadline')::numeric/1000),to_timestamp((q->>'answeredAt')::numeric/1000),q->>'selectedToken',case when q->>'performance' is null then null else jsonb_build_object('performance',q->>'performance','responseMs',(q->>'answeredAt')::numeric-(q->>'startsAt')::numeric) end)
 on conflict(assignment_id) do update set answered_at=excluded.answered_at,selected_option_token=excluded.selected_option_token,grade_json=excluded.grade_json;
 end loop;
end $$;

create function public.nz_combat_commit_v1(p_session uuid,p_expected text,p_document jsonb,p_public jsonb,p_due numeric,p_uid uuid default null,p_request uuid default null,p_payload jsonb default null,p_result jsonb default null,p_cutoff numeric default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.game_sessions%rowtype; r private.command_receipts%rowtype; j jsonb; e jsonb; tid uuid; v bigint;
begin
 select * into s from private.game_sessions where id=p_session for update;
 if not found then raise exception 'SESSION_NOT_FOUND';end if;
 if p_uid is not null then
 if not exists(select 1 from public.room_players where room_id=s.room_id and auth_user_id=p_uid and member_status<>'LEFT') then raise exception 'NOT_A_MEMBER';end if;
 if p_request is not null then
 select * into r from private.command_receipts where auth_user_id=p_uid and request_id=p_request;
 if found then
 if r.session_id<>p_session or r.command_type<>'COMBAT_'||(p_payload->>'kind') or r.payload_json<>p_payload then raise exception 'IDEMPOTENCY_KEY_REUSED';end if;
 return jsonb_build_object('receipt',r.result_json);
 end if;
 end if;
 end if;
 if s.state_version::text<>p_expected then return jsonb_build_object('conflict',true);end if;
 if p_cutoff is not null and extract(epoch from clock_timestamp())*1000>=p_cutoff then return jsonb_build_object('conflict',true);end if;
 if p_document->>'sessionId'<>s.id::text or p_document->>'roomId'<>s.room_id::text or p_document->>'schema'<>'1' or p_document#>>'{engine,mode}'<>'SERVER' then raise exception 'INVALID_SERVER_DOCUMENT';end if;
 if s.combat_json is null and (s.state<>'STORY' or jsonb_array_length(s.locked_roster_json)=0) then raise exception 'ROOM_NOT_STARTED';end if;
 if s.outcome is not null then raise exception 'ENCOUNTER_FINISHED';end if;
 v:=s.state_version+1;
 if s.combat_json is not null and s.combat_json->>'turnId'<>p_document->>'turnId' then
 perform private.nz_combat_audit_v1(s.combat_json,v);
 update private.combat_turns set closed_at=clock_timestamp() where id=(s.combat_json->>'turnId')::uuid;
 end if;
 perform private.nz_combat_audit_v1(p_document,v);
 for e in select value from jsonb_array_elements(p_document#>'{engine,events}') where (value->>'seq')::bigint>=s.next_event_seq loop
 select id into tid from private.combat_turns where session_id=s.id and encounter_id='abyss-guardian' and turn_number=(e->>'turn')::int;
 insert into private.combat_events(session_id,turn_id,event_seq,event_type,dedupe_key,public_payload_json)
 values(s.id,tid,(e->>'seq')::bigint,e->>'type','seq:'||(e->>'seq'),e||jsonb_build_object('stateVersion',v::text));
 end loop;
 update private.game_sessions set combat_json=p_document,combat_public=p_public,current_turn_id=nullif(p_document->>'turnId','')::uuid,
 state=(case when p_document->>'phase'='TEAM_RUNE' then 'MATH_CHALLENGE' else p_document->>'phase' end)::private.nz_game_state,
 state_context=case when p_document->>'phase'='TEAM_RUNE' then 'TEAM_RUNE' else 'ONLINE_COMBAT' end,
 phase_version=phase_version+case when combat_json->>'phaseId' is distinct from p_document->>'phaseId' then 1 else 0 end,
 next_transition_at=to_timestamp(p_due/1000),next_event_seq=(p_document#>>'{engine,nextSeq}')::bigint,
 outcome=case when p_document->>'phase' in ('VICTORY','DEFEAT','ABORTED') then p_document->>'phase' else null end,
 finished_at=case when p_document->>'phase' in ('VICTORY','DEFEAT','ABORTED') then clock_timestamp() else null end
 where id=s.id;
 j:=private.nz_publish_v1(s.room_id);
 if p_uid is not null and p_request is not null then
 if (select count(*) from private.command_receipts where auth_user_id=p_uid and created_at>clock_timestamp()-interval '10 seconds')>60 then raise exception 'RATE_LIMITED';end if;
 p_result:=p_result||jsonb_build_object('version',j->>'version');
 insert into private.command_receipts(auth_user_id,request_id,session_id,command_type,payload_json,result_json) values(p_uid,p_request,s.id,'COMBAT_'||(p_payload->>'kind'),p_payload,p_result);
 end if;
 return jsonb_build_object('version',j->>'version','result',p_result);
end $$;

-- New START requests schedule initialization even if every browser closes immediately.
create function private.nz_schedule_encounter_v1() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.started_at is not null and new.combat_json is null and new.state='STORY' then new.next_transition_at:=coalesce(new.next_transition_at,clock_timestamp());end if;
 return new;
end $$;
create trigger nz_schedule_encounter before update on private.game_sessions for each row execute function private.nz_schedule_encounter_v1();

create extension if not exists pg_cron;
create extension if not exists pg_net;
create function private.nz_combat_tick_v1() returns void language plpgsql security definer set search_path='' as $$
declare s record; capability uuid;
begin
 for s in select g.id from private.game_sessions g left join private.combat_jobs j on j.session_id=g.id
 where g.next_transition_at<=clock_timestamp() and g.outcome is null and (j.retry_at is null or j.retry_at<=clock_timestamp()) order by g.next_transition_at limit 20 for update of g skip locked loop
 capability:=gen_random_uuid();
 insert into private.combat_jobs values(s.id,capability,clock_timestamp()+interval '30 seconds',clock_timestamp()+interval '5 seconds')
 on conflict(session_id) do update set token=excluded.token,expires_at=excluded.expires_at,retry_at=excluded.retry_at;
 perform net.http_post(url:='https://bbeymvooubwsbrkeukuu.supabase.co/functions/v1/nova-combat',headers:='{"Content-Type":"application/json"}'::jsonb,body:=jsonb_build_object('worker',true,'sessionId',s.id,'token',capability),timeout_milliseconds:=4000);
 end loop;
end $$;
select cron.schedule('nova-combat-watchdog','1 second','select private.nz_combat_tick_v1()');

revoke all on function private.nz_combat_audit_v1(jsonb,bigint),private.nz_schedule_encounter_v1(),private.nz_combat_tick_v1() from public,anon,authenticated;
revoke all on function public.nz_combat_load_v1(uuid,uuid,uuid,uuid,jsonb),public.nz_combat_bank_v1(),public.nz_combat_commit_v1(uuid,text,jsonb,jsonb,numeric,uuid,uuid,jsonb,jsonb,numeric) from public,anon,authenticated;
grant execute on function public.nz_combat_load_v1(uuid,uuid,uuid,uuid,jsonb),public.nz_combat_bank_v1(),public.nz_combat_commit_v1(uuid,text,jsonb,jsonb,numeric,uuid,uuid,jsonb,jsonb,numeric) to service_role;
