
# NOVA ZENITH MVP Technical Blueprint V1
Canonical name: NOVA ZENITH. Contract: nz.v1. Ruleset: nz.v1.0.

This repository records the implementation contract from the project conversation.
The detailed High 1–5 prompts were received as text on 21 October 2026.

## Amendment: delivery boundary for High 1–5
The owner explicitly requests a deterministic TypeScript OFFLINE engine and playable local boss UI before networked combat.
Accordingly, src/game/combat and boss are an OFFLINE_QA implementation only. They cannot accept an online room snapshot or write gameplay state to Supabase.
The production online combat authority remains reserved for Extra High #2: transactional server resolution, server assignments/deadlines, secure grading, and reconnect.
Do not publish local math grades/damage as online results. The SQL schema is a foundation, not a finished combat RPC.
A future server implementation must use the same versioned configuration and golden vectors; drift is a blocking contract error.

## A. Architecture
Next.js/React serve UI, Supabase Auth identifies guests, PostgreSQL owns lobby mutations, Realtime distributes sanitized snapshots and cosmetic presence.
Phaser is a future renderer. Vercel is frontend hosting. No host browser is a game server.

## B. State
Persistent: room membership, class, readiness, session state, locked roster; future combat state and assignments.
Ephemeral: movement, direction, animation, presence.
Visual only: camera, interpolation, effects, floating text.
One gameplay FSM lives on private.game_sessions; public.session_views is a projection.

## C. Game state machine
LOBBY → CHARACTER_SELECT → READY → STORY → EXPLORATION → ENCOUNTER_START.
Combat: TURN_START → COMBAT_PLANNING → MATH_CHALLENGE → LOCK_ACTION → COMBAT_RESOLUTION → BOSS_ACTION → optional DEFENSIVE_REACTION or TEAM_RUNE → TURN_END.
Terminal/branch states: VICTORY, DEFEAT, ENDING, COMPLETED, SUSPENDED, ABORTED.
See src/game/core/fsm.ts for the transition graph, including context-sensitive MATH_CHALLENGE exits.
High 5 START intentionally stops at STORY/AWAITING_COMBAT_INTEGRATION.

## D. Combat timing
Planning 12s (minimum early close 3s). Questions Easy 12s, Medium 18s, Hard 25s.
Blessing +3s for next round's main action assignments; not retroactive.
Reaction Easy 12s plus Focus time. Rune Medium 18s, no Blessing.
Online party playback 4s, boss windup 2s, turn-end 2s. These online clocks are NOT implemented in High 1–5.
Offline UI serializes party questions for QA; this is not the future multiplayer UX.

## E. Action resolution
Sort category ascending, skill priority ascending, speed descending, seat ascending.
Categories: defense/threat 10; self/party buff 20; enemy debuff 30; healing 40; offense 50; boss after party.
Expose damages first, then installs vulnerability, before subsequent attacks.
One action per living actor. Duplicate/invalid/unaffordable input rejects the round before mutation.
Manual basic gives 20 resource even on failure; auto basic gives 10, has FAILED output, no combo or gauge.
Resource start 40, cap 100. Ultimate 0 initially, cap 100. Costs are paid once on execution.
Success +15 Ultimate, Perfect +20; reaction +3/+5; Rune correct +5; full four-player combo +5; total gain cap 30/round.
Ultimate consumes 100 and does not charge from its own cast.
Between future normal encounters: full HP, resource 40, gauge carry capped 50.

## F. Math
Server assignment has immutable question revision, option permutation, owner, context, starts_at and deadline_at.
Online payload never contains answers. One submitted answer; no reroll or timer reset on reconnect.
Correct at elapsed ≤50% available time: PERFECT (1.25); other correct before deadline SUCCESS (1.00); wrong/timeout FAILED (.40).
At the deadline is late. Client timestamps are untrusted.
Current development fixtures are deliberately non-secret and only power the opt-in offline simulator. They are not the initial production bank of 60.

## G. Formulas
Use nonnegative half-up rounding once at the end: floor(x+.5).
H(n)=1+.60(n−1). BossHP=2000H(n): 2000/3200/4400/5600.
D0=sum of selected classes' base basic damage, R=BossHP/(10D0), fixed from initial roster.
Player damage = Round(Base × Performance × R × Blessing × Focus × Combo × OutgoingDebuff × SkillSpecial × Expose × PhaseVulnerability × EnemyArmor).
Healing = Round(Base × Performance × Blessing × OutgoingDebuff); no R, Focus, or combo; no normal healing of KO.
Incoming = Round(Base × party-size factor × phase damage × Frost × heavy factor × (1−partyDR) × (1−passive) × (1−Bastion personal) × (1−reactionDR)).
PartyDR=max(ShieldWall, LastBastion). Other categories multiply.
Damage to boss is reduced by armor, then shield absorbs, then overflow damages HP.
Core does not receive boss armor, Expose, or phase vulnerability. Later actions retarget boss when Core is destroyed, but a single hit does not spill from Core.
Quick Strike Perfect multiplies by 1.35 in addition to P. No random crit.
Execution factor=min(1.8,2−targetHP/targetMaxHP).
Phase 3 incoming boss vulnerability means ×1.15, not a new defense-stat system.

## H. Effects
All effects are centralized; same type/target does not stack. Keep stronger magnitude and longer expiry.
Round r cast:
- Shield Wall DR .50/.35/.15 through r.
- Last Bastion party DR .50/.40/.20, personal .30/.25/.10, redirect eligible single on r.
- Provoke guaranteed Perfect/Success, failed threat ×4; next single through r+2. Guaranteed outranks failed refresh.
- Frost .30/.20/.10: one damaging boss action through r+1. Utility/Charge does not consume.
- Focus .40/.25/.10: next offensive component through r+2. Separate reaction bonus 3/2/1s through r+2.
- Expose .30/.20/.08: rest of r and r+1; not own initial hit.
- Blessing .20/.15/.075: rest of r and r+1; time bonus for r+1 only.
- Boss Roar .15 and Armor .30: rounds r+1 and r+2.
Tier percentages are not multiplied by performance again.
Divine Recovery heals living allies, cleanses one negative effect each, then revives one KO (lowest seat if no target) at exactly 30% MaxHP.
Revived ally does not get the 180 heal or an action in the same round. KO clears personal effects.

## I. Boss
Damage factor n=1..4: .85/.92/.96/1. Phase 1 HP≥60%, phase 2 25%≤HP<60%, phase 3 HP<25%.
Phase damage 1/1.15/1.25; normal-action Rage gain 20/25/30.
Phase changes after each HP hit, monotonic; crossing hit uses old phase.
Cycle: Single → Utility → AoE → SpecialSingle → Barrier/Utility/Attack.
Claw 110, Spear 180 (used r, next ≥r+3), Wave 60 AoE.
Utility skips already-active Roar/Armor. Heavy pauses cycle.
Threat weights Warrior45/Healer25/Mage17/Thief13; living eligible only. Redirect then guaranteed Provoke then weighted draw.
Barrier once, phase≥2, shield 500+150(n−1). Rune requires max(1,ceil(.75a)) for frozen living active participants.
Rage extra max10/round: all main actions succeed +3, ≥10% max HP burst +3, shield break +4.
At100: pending charge. Next eligible boss action Charge; Core HP350+100(n−1). One FULL next player phase before Cataclysm110 AoE.
Destroyed Core reduces Cataclysm to .40. Then Rage0, Core removed; at least two normal actions before another Charge.
Reaction DR P/S/F: Warrior .8/.5/.2; Thief1/.5/0; Mage.7/.4/0; Healer.6/.35/0.
Healer heals40/20/0 AFTER surviving damage. No individual reaction for AoE.
Future normal encounters: Hound400H, single60; Shaman600H, single70/AoE30/armor15%/outgoing-debuff10%.

## J. Multiplayer
Anonymous Auth identity, tab-scoped credential storage for local multi-tab testing.
Room code seven safe uppercase characters; 1–4 reserved slots. Duplicate class and seats protected by partial unique indexes plus session row lock.
Membership and class survive disconnect. Grace60s, heartbeat10s; public Presence is cosmetic.
Lobby reads reconcile inactivity. Coordinator transfers to earliest active membership. Coordinator may release a slot only after authoritative inactivity.
All players must be active, class selected, Ready. Class changes/join/leave cancel readiness.
No new members after START, same-identity reconnect remains allowed.
Request receipt unique(user,request UUID); same payload replays result, changed payload rejects.
Capacity uses reserved non-LEFT seats so disconnect is not a way to exceed four.
No online combat, math submissions, turn resolution or combat deadlines in this stage.

## K. Schema
public: rooms, room_players (own row read), session_views (member projection).
private: rulesets, game_sessions, combatants, combat_turns, turn_actions, questions, challenge_assignments, combat_effects, combat_events, command_receipts.
See migrations for exact fields, checks, indexes and keys. Combat-related tables deliberately have no player-write RPC yet.
Future cross-session combat FK and resolver validation are required before enabling combat mutations.

## L. Security
Default deny direct client mutation. Question keys and game state remain private.
Public RPC wrapper is invoker; private guarded definer has empty search_path, explicit auth.uid/membership checks, no dynamic user SQL.
Only guarded lobby entrypoint is executable by authenticated. Internal publish/reconcile are revoked.
Never put service-role/secret keys in browser, repository, logs or NEXT_PUBLIC variables.
Room code is an invitation, not proof of membership. Nickname/user_metadata never authorize.
Baseline command quotas exist; rejected-request/IP anti-bruteforce still requires gateway protection before broad public release.

## M. Realtime
Canonical updates: only session_views through Postgres Changes with member RLS.
Private Presence topic nz:room:{roomId}:presence. Its payload cannot affect authorization.
Fallback polling3s; heartbeat10s. Subscriptions clean up on room change/unmount.
Future motion uses per-sender authorized Broadcast, max10Hz while moving; no per-frame PostgreSQL writes.
Snapshot wins over presentation events.

## N. Modules
src/game/{config,core,combat,boss,questions,multiplayer,exploration,cutscene,assets}.
src/components/{combat,lobby}; src/lib/supabase separates browser/server/admin.
No combat math in React. Server-only imports protect privileged boundary.

## O. Phaser/React
Only intent/visual bridge contracts in High1–5. Future React sends snapshot/checkpoint/scene commands.
Phaser sends motion/interaction/rally intent, never HP/defeat/victory.
Reconnection spawns at durable checkpoint. Spatial anti-cheat is not promised for ephemeral movement.

## P. Art
Replaceable manifest with semantic animation names. Current original SVG/emblem placeholders are not final art.
Character animations: idle/walk/attack or cast; class shield/heal/dodge; hurt/ko.
Boss: idle/attack/special/aoe/charge/shield/hurt/rage/death.
Impact markers never apply damage.
The two attached art references remain unread because local runtime is unavailable; no claim of compliance with their pixel/atlas requirements.

## Q. Cutscene
Data-driven timeline contract only. id/version/scene/duration/events(atMs,duration,type,payload).
Future controls/camera/dialogue/VFX/SFX/transition use server start/end times; no browser ACK dependency.
No prerecorded cinematic required or implemented.

## R. Analytics
Structured offline events record actor, turn, target, damage/heal, effects, phases, Rage and outcome.
Online canonical telemetry must originate at future server resolver. Cosmetic/client telemetry is untrusted.
Do not record unnecessary identity data. Raw sessions/events30d; receipts7d; cleanup not yet scheduled.

## S. Recovery
Retry transport with same request UUID. Stale phase refreshes snapshot. Expired question never resets timer.
Reconnect reuses identity/membership/class; readiness may reset after grace.
Room expired/not found is not auto-created. Missing art uses fallback.
Backend outage and lost anonymous credentials are not silently recoverable.

## T. Tests
Node test runner via tsx covers pure math/FSM, classes, ordering, effects, revive, combo, seeded threat, phases, barrier, heavy sequence and reactions.
Playwright covers 320px layouts and actual offline question→reaction→next-round path.
Supabase SQL integration tests run transactionally with rolled-back fixtures and simulated authenticated claims.
Real concurrent-device lobby UAT and full balance simulation remain separate release gates; do not claim them from sequential SQL tests.

## U. Delivery
High1 foundations → High2 offline player engine → High3 boss → High4 combat UI → High5 lobby.
ExtraHigh2: online authoritative combat, secure questions, deadline watchdog, event synchronization.
No crafting/PvP/equipment/guild/gacha/marketplace/pets/open world/account progression.

## V. Risks
Critical: duplicate resolution and leaked question keys when future online combat is introduced.
High: balancing of solo classes/Ultimate, identity loss, latency, RLS/concurrency, final art mismatch.
Mitigate with golden vectors, immutable versions, RPC locks/constraints, opt-in offline boundary and measured UAT.

## W. Frozen decisions
No coding agent may independently change server authority, class stats, resource/performance config, formula order, phase boundaries, heavy telegraph, roster scaling, unique classes, reconnect grace, RLS secrecy or MVP scope.
UI internals and placeholder presentation may change within the asset and accessibility contracts.
The owner's High1–5 offline delivery amendment above is explicit; it does not authorize client-authoritative online combat.

## X. Open decisions
Final art export/atlas details require attached art references.
Production question bank requires target curriculum/age.
Final licensed audio/art sources are not selected.
Infrastructure capacity, concurrent lobby UAT and balance targets require measured evidence.
