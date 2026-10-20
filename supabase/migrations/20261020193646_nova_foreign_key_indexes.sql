
-- Cover FK lookups observed by the Supabase performance advisor.
create index rooms_coordinator_idx on public.rooms(coordinator_player_id);
create index sessions_ruleset_idx on private.game_sessions(ruleset_version);
create index combatants_member_idx on private.combatants(room_player_id);
create index actions_actor_idx on private.turn_actions(actor_id);
create index actions_target_idx on private.turn_actions(target_id);
create index assignments_question_idx on private.challenge_assignments(question_revision_id);
create index assignments_session_idx on private.challenge_assignments(session_id);
create index effects_source_idx on private.combat_effects(source_actor_id);
create index effects_target_idx on private.combat_effects(target_id);
create index events_turn_idx on private.combat_events(turn_id);
create index receipts_session_idx on private.command_receipts(session_id);
