-- An early successful Rune closes remaining assignments without recording a false failure.
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

