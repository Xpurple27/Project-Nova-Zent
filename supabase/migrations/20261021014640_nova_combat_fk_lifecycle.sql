-- Dependent audit rows follow encounter deletion, independent of FK trigger order.
alter table private.turn_actions drop constraint turn_actions_actor_id_fkey;
alter table private.turn_actions add constraint turn_actions_actor_id_fkey foreign key(actor_id) references private.combatants(id) on delete cascade;
alter table private.turn_actions drop constraint turn_actions_target_id_fkey;
alter table private.turn_actions add constraint turn_actions_target_id_fkey foreign key(target_id) references private.combatants(id) on delete set null;
alter table private.challenge_assignments drop constraint challenge_assignments_actor_id_fkey;
alter table private.challenge_assignments add constraint challenge_assignments_actor_id_fkey foreign key(actor_id) references private.combatants(id) on delete cascade;
alter table private.challenge_assignments drop constraint challenge_assignments_turn_id_fkey;
alter table private.challenge_assignments add constraint challenge_assignments_turn_id_fkey foreign key(turn_id) references private.combat_turns(id) on delete cascade;
alter table private.combat_events drop constraint combat_events_turn_id_fkey;
alter table private.combat_events add constraint combat_events_turn_id_fkey foreign key(turn_id) references private.combat_turns(id) on delete set null;
alter table private.combat_effects drop constraint combat_effects_source_actor_id_fkey;
alter table private.combat_effects add constraint combat_effects_source_actor_id_fkey foreign key(source_actor_id) references private.combatants(id) on delete set null;
alter table private.combat_effects drop constraint combat_effects_target_id_fkey;
alter table private.combat_effects add constraint combat_effects_target_id_fkey foreign key(target_id) references private.combatants(id) on delete set null;
