-- Preserve historical input deadlines and record the content actually used.
alter table private.combat_turns add column planning_deadline timestamptz,add column math_deadline timestamptz;
create or replace function private.nz_combat_audit_v1(d jsonb,v bigint) returns void language plpgsql security definer set search_path='' as $$
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
 update private.combat_turns set planning_deadline=coalesce(planning_deadline,case when d->>'phase'='COMBAT_PLANNING' then to_timestamp((d->>'deadline')::numeric/1000) end),math_deadline=coalesce(math_deadline,case when d->>'phase'='MATH_CHALLENGE' then to_timestamp((d->>'deadline')::numeric/1000) end) where id=tid;
 for a in select value from jsonb_each(d->'actions') loop
 insert into private.turn_actions(turn_id,actor_id,skill_id,target_key,revive_target_key,origin,performance)
 values(tid,(a->>'actorId')::uuid,a->>'skillId',a->>'targetId',a->>'reviveTargetId',a->>'origin',a->>'performance')
 on conflict(turn_id,actor_id) do update set performance=excluded.performance,
 execution_status=case when d->>'phase' in ('COMBAT_RESOLUTION','BOSS_ACTION','DEFENSIVE_REACTION','TEAM_RUNE','TURN_END','VICTORY','DEFEAT') then 'RESOLVED' else 'COMMITTED' end;
 end loop;
 for q in select value from jsonb_array_elements(d->'assignments') loop
 insert into private.challenge_assignments(assignment_id,session_id,turn_id,actor_id,context,question_revision_id,option_permutation,starts_at,deadline_at,answered_at,selected_option_token,grade_json)
 values((q->>'id')::uuid,sid,tid,(q->>'actorId')::uuid,q->>'context',(q->>'questionId')::uuid,q->'options',to_timestamp((q->>'startsAt')::numeric/1000),to_timestamp((q->>'deadline')::numeric/1000),to_timestamp((q->>'answeredAt')::numeric/1000),q->>'selectedToken',case when (q->>'cancelled')::boolean then '{"cancelled":true}'::jsonb when q->>'performance' is null then null else jsonb_build_object('performance',q->>'performance','responseMs',(q->>'answeredAt')::numeric-(q->>'startsAt')::numeric) end)
 on conflict(assignment_id) do update set answered_at=excluded.answered_at,selected_option_token=excluded.selected_option_token,grade_json=excluded.grade_json;
 end loop;
end $$;

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
 update private.game_sessions set content_version='pilot-v1',stage_id='abyss-guardian',resonance=(p_document#>>'{engine,resonance}')::numeric,combat_json=p_document,combat_public=p_public,current_turn_id=nullif(p_document->>'turnId','')::uuid,
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

