
# Verification evidence — High 1–5
Date: 21 October 2026 (Asia/Jakarta).

## Completed checks
Latest verified GitHub Actions run39485332496, commit e97eefabd56e31afcf2c4eecc153cab09727fe01:
- npm install: success, audit reported0 vulnerabilities.
- TypeScript: passed.
- Node unit tests:31 passed,0 failed.
- Next.js production build: passed.
- Playwright: both browser tests passed, including320px overflow checks and a full action/question→boss reaction→round2 path.
- Dependency lockfile generated and retained by the successful CI job.

The verified run includes final floating/critical/block feedback, development performance controls, isolated tab identities, safe numeric boundaries and reconnect regression tests. Documentation-only updates do not change the verified application inputs.

Connected Supabase:
- Migration nova_foundation_lobby applied as version20261020192046.
- Migration nova_foreign_key_indexes applied as version20261020193646.
- Migration nova_reconnect_projection applied as version20261020193917; reconnect regression SQL test passed.
- supabase/tests/lobby.sql passed transactionally, with authenticated role/claims.
- Tests cover create idempotency, key reuse rejection,4-member capacity, outsider projection/presence denial, private HP read denial, direct row-write denial, unique classes, reconnect class preservation, inactivity/grace, coordinator transfer, removing an inactive member, readiness, start and late-join rejection.
- Fixtures were rolled back; no anonymous test users remain.
- Security advisor reported no WARN/ERROR. Ten INFO items are expected private tables with RLS enabled and no policies: deliberate default deny.
- Foreign-key indexes were added after the performance advisor identified missing coverage.

## Known pending gates
- Anonymous Sign-Ins is OFF in the connected project's Auth settings, verified in the dashboard. No authentication setting was changed.
- Until the owner authorizes/enables anonymous sign-ins, real guest login and end-to-end multi-browser lobby tests remain blocked.
- Sequential database tests establish function/security behavior but are not a substitute for an actual concurrent multi-device UAT.
- Local execution environment and attached art references were unavailable.
- No deployment, final art/audio, exploration or synchronized combat is claimed.
- Full15-composition balance simulation and15–25-minute run timing belong to later integration, not these foundation gates.
