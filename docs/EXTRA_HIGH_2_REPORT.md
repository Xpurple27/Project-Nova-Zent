# NOVA ZENITH — Extra High2 implementation report

Historical checkpoint. Current Auth/content/campaign/deployment findings are in EXTRA_HIGH_3_FINAL_AUDIT.md; the old remaining-issues list below is retained as history, not a current release verdict.

## Architecture implemented
The browser sends intent. Supabase Edge authenticates the player, loads the private canonical document using database time, executes the exact shared TypeScript combat/boss engine and commits through a service-only PostgreSQL RPC. A session-row lock plus expected version makes the commit atomic. Cron/pg_net progresses due phases without a host or connected browser. Realtime only invalidates safe projections; GET recovers a complete snapshot.

## Database changes
Applied migrations: nova_authoritative_combat, nova_pilot_questions, nova_combat_audit_hardening, nova_combat_watchdog_wakeup, nova_combat_fk_lifecycle and nova_combat_metadata. The original three foundation migrations remain intact.
They add canonical/public combat documents, phase/planning/math deadline audit, target keys, capability jobs, private pilot questions, lifecycle FKs and safe scheduled recovery/receipt cleanup.
Backend RPCs: nz_combat_load_v1, nz_combat_bank_v1 and nz_combat_commit_v1, executable only by service_role. Private publish/audit/watchdog functions have empty search_path and no client execute grant. Private data retains default-deny RLS.

## Files changed
- src/game/combat and boss: split player/boss/end stages while preserving offline orchestration.
- src/game/multiplayer/server: pure authority reducer, validated command service and persistence port.
- protocol/combat-client/synchronization: safe DTOs, retries, subscription lifecycle, versions/events and canonical comparison.
- OnlineCombat/OnlineQuestion/Battlefield and lobby: shared rendering, parallel online inputs and server-only results.
- supabase/functions/nova-combat: generated engine bundle and authenticated transport.
- migrations/tests/scripts: transactional audit, concurrency tests, CLI simulation and opt-in live browser probes.
- docs/ART_BIBLE and SPRITE_PIPELINE: supplied references normalized to NOVA ZENITH.

## Multiplayer lifecycle
Ready room→one locked session→Planning12s (all locks may close after3s)→parallel server-assigned Math→one player resolution→4s playback budget→recorded boss decision→2s windup→target reaction/Rune or direct AoE→2s turn end→effect expiration/next turn.
Boss death wins immediately; no post-death attack. All eligible actors KO loses. Core has a full next player phase; Rune eligibility uses the living subset of the turn's frozen active roster. Scaling never changes after encounter start.

## Reconnect behavior
The same Auth identity restores the same membership and state. GET returns HP/resource/gauge/effects, turn/phase UUID, absolute deadline, boss/Barrier/Core, pending own assignment and the last50 ordered events. No timer reroll or battle replay occurs. Missed input times out. After60s without heartbeat the next round skips the member; an empty living party suspends and can resume, with a stable turn UUID. All-disconnected suspension aborts after10min.

## Concurrency protections
- Unique room/session, turn number, action per actor/turn, assignment slot and event sequence/dedupe key.
- One root row lock and expected state-version CAS per commit.
- Request UUID bound to user/session/kind/payload; same answer/lock finalizes once.
- Turn and phase UUIDs fence stale intent; independent same-phase submissions may use an older observed version.
- Actions, costs, effects, boss intent, events, safe projection and receipt commit together. Failure rolls back.
- Recorded RNG/intent and frozen targeting prevent reconnect rerolls. Client sequence cursor prevents duplicate playback.

## Tests
Typecheck, lint,46 Node tests, Edge drift check, production build and2 baseline browser tests pass. Both live SQL suites pass with rollback. Simulations1/2/4 players reach Victory. Live duplicate Start/answer/Ultimate and resolver races pass; direct HP mutation/private loader access and outsider snapshots are denied.
See [VERIFICATION.md](VERIFICATION.md) for evidence and exact coverage.

## Manual UAT
Automated UAT drove four isolated browser sessions against the real backend, including class race, parallel actions, AFK, reaction reconnect, coordinator disconnect/refresh, Heavy/Core/Barrier, and one shared Victory on round9.214 durable events, state_version139, zero duplicated action groups, all canonical end states equal. This was four browser contexts, not four physical devices.

## Remaining issues
Critical: none observed in completed combat checks.
High: new public guest entry remains blocked by disabled Anonymous Sign-Ins; frontend is not deployed to Vercel in this task.
Medium: public pilot seed replacement/private production import, question curriculum approval, broad-public rate hardening, pg_net namespace advisory, retention operations and physical-network UAT.
Low: Auth password-protection advisory outside guest flow; placeholder art/audio; inactive QA history retained after teardown.
The combat integration is implemented and verified for existing Auth sessions. Public guest launch remains gated by the environment setting; exploration/story polish has not begun.
