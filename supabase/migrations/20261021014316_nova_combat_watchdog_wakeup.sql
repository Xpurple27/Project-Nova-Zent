-- Wake subsequent short phases at their own deadline instead of the previous HTTP retry budget.
create or replace function public.nz_combat_commit_v1(p_session uuid,p_expected text,p_document jsonb,p_public jsonb,p_due numeric,p_uid uuid default null,p_request uuid default null,p_payload jsonb default null,p_result jsonb default null,p_cutoff numeric default null)
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
 update private.combat_jobs set retry_at=least(retry_at,to_timestamp(p_due/1000)) where session_id=s.id;
 j:=private.nz_publish_v1(s.room_id);
 if p_uid is not null and p_request is not null then
 if (select count(*) from private.command_receipts where auth_user_id=p_uid and created_at>clock_timestamp()-interval '10 seconds')>60 then raise exception 'RATE_LIMITED';end if;
 p_result:=p_result||jsonb_build_object('version',j->>'version');
 insert into private.command_receipts(auth_user_id,request_id,session_id,command_type,payload_json,result_json) values(p_uid,p_request,s.id,'COMBAT_'||(p_payload->>'kind'),p_payload,p_result);
 end if;
 return jsonb_build_object('version',j->>'version','result',p_result);
end $$;

create function private.nz_combat_cleanup_v1() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from private.command_receipts where created_at<clock_timestamp()-interval '7 days';
 delete from private.combat_jobs where expires_at<clock_timestamp()-interval '1 hour';
 delete from cron.job_run_details where jobid in (select jobid from cron.job where jobname in ('nova-combat-watchdog','nova-combat-cleanup')) and start_time<clock_timestamp()-interval '7 days';
end $$;
revoke all on function private.nz_combat_cleanup_v1() from public,anon,authenticated;
select cron.schedule('nova-combat-cleanup','17 3 * * *','select private.nz_combat_cleanup_v1()');

alter table private.combatants drop constraint combatants_room_player_id_fkey;
alter table private.combatants add constraint combatants_room_player_id_fkey foreign key(room_player_id) references public.room_players(id) on delete set null;
