# Verification — NOVA ZENITH Extra High2
Date:21 October2026, UTC. Evidence distinguishes live Supabase traffic from local simulations.

## Executed checks
- TypeScript, ESLint with zero warnings, all46 Node unit/integration tests, generated Edge-bundle drift check and production build: passed.
- Playwright baseline:2 passed (320px home/offline UI, complete question→reaction→round2, lobby setup).
- SQL lobby and combat suites passed on the connected database with rolled-back fixtures. These verify membership/RLS, capacity/classes, backend-function grants, private keys, transaction rollback after invalid HP, CAS conflict rejection, receipt replay and one turn/event.
- Simulations1P/2P/4P reached Victory in13/10/8 rounds respectively with the shared engine. A4P CLI run with disconnect and forced Heavy reached Victory in10 rounds. These are simulations, not physical-device tests.

## Full live four-browser battle
Four isolated Chromium contexts authenticated to the real Supabase project through the production frontend build. Auth used four temporary confirmed QA identities because Anonymous Sign-Ins is disabled. No Auth configuration was changed.
Room GU6URK4, session ded58afa-2adf-4cc5-89d7-b5923b21d18d:
- Victory on round9, boss0/5600HP, final state_version139 before teardown.
- Database recorded214 events and182.546443s from start to finish.
- Four final canonical snapshots matched; all four UIs displayed Victory.
- Zero duplicate ACTION_RESOLVED groups per actor/turn; one BOSS_DEFEATED and one VICTORY.
- One Core spawn, one Core destruction, one Cataclysm, one Barrier creation/break; two monotonic phase transitions.
- Concurrent Mage selection admitted one claimant, then unique classes/Ready/Start succeeded.
- Planning AFK default and math timeout occurred. Target disconnect/reconnect restored the exact reaction assignment/deadline.
- Coordinator went offline and refreshed; battle state persisted. Stale turn input rejected.
-320px online page had no horizontal overflow; no browser page errors. Final screenshot visually inspected.
This establishes four browser sessions on one runner; four physical devices/diverse mobile networks were not tested.

## Live reliability/security probe
A separate real solo session submitted concurrent Start, identical action/answer requests, an Ultimate twice, and competing PUMP/GET resolvers.
- Concurrent Start returned one session/turn.
- Identical answer requests returned one finalized receipt/grade.
- Last Bastion executed once; gauge consumed once to0.
- Replaying terminal Victory preserved event sequence and outcome.
- Authenticated client calls to the privileged loader and direct projection PATCH returned403.
- Another authenticated user could not read the solo session.
The probe also recovered after authoritative inactivity via the normal membership heartbeat/reconnect path. Its first API-only harness omitted heartbeats; the harness now includes them. The server correctly suspended rather than waiting on input indefinitely.

## Defects fixed during verification
Private JSON property order is no longer used to compare action intent. A suspended round now owns one stable UUID across repeated watchdog polls and reconnect. Older same-version timestamps cannot rewind the visual clock. Rune early success cancels remaining inputs without false failure telemetry. FK lifecycle handles dependent audit rows; historical input deadlines are retained.
Earlier live-test interruptions were local-proxy routing and selector/assertion issues in the UAT script; the complete rerun above passed.

## Teardown and limits
Four synthetic Auth identities were deleted; database verification confirmed0 remain. QA rooms were expired and unfinished sessions deactivated; historical QA rows remain. The capability-protected provisioning/cleanup helper was retired to410 with gateway JWT verification enabled. Temporary credentials are not retained in the repository.
Destructive cleanup/extension operations returned expired connector request state; no extension-reinstall migration is included or claimed applied. Receipt/worker-log cleanup is scheduled; general room/session retention remains an operations follow-up.
A CLI invocation was rejected by automatic review for unidentified PostHog telemetry. Subsequent SQL work used the Supabase connector; the rejected CLI action was not retried.

## Remaining release gates/advisories
- High: Anonymous Sign-Ins remains disabled, so new public guests cannot enter until the owner enables the provider. Existing authenticated sessions were fully tested. No Vercel production frontend deployment is claimed.
- Medium: pilot questions need curriculum/content review; broad public-release IP/rejected-request throttling and physical-device/network diversity remain follow-ups.
- Medium: advisor reports pg_net extension metadata in public; its functions live in net and combat backend RPCs remain service-only. Relocation requires a separate approved maintenance step.
- Low: Auth leaked-password protection is disabled; MVP guest play has no password flow. Final art/audio remain placeholders.
- Expected INFO:11 private tables have RLS and no user policies, implementing deliberate default deny.
No unresolved Critical combat synchronization defect was observed in the completed runs. This is measured MVP evidence, not a claim of exhaustive concurrency or load coverage.
