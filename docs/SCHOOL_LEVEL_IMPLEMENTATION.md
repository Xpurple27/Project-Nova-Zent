# Per-player school choice and 720-item publication

Historical implementation report, 22 October 2026. The dropdown/authority contract below remains current; the active question content was replaced by the 27 October quality review. Current content evidence: [QUESTION_QUALITY_REVIEW.md](QUESTION_QUALITY_REVIEW.md) and [QUESTION_BANK_QA_REPORT.md](QUESTION_BANK_QA_REPORT.md).

Baseline: `ee04e4743dd48da71194ffe905a9d6fe5286915f`. This pass preserves the recent per-player dropdown work and completes its authoritative contract, database source migration, bank tooling, testing and documentation.

## Result

- Character selection has a required SD/SMP/SMA selector for each player, including members who are not coordinator. Party cards show each member's chosen level.
- Ready is disabled until class and school level are selected. Database validation enforces the same rule. Level changes clear readiness; the roster freezes levels when Start commits.
- The active private bank contains 720 items: 60 per class per school, consisting of 20 Easy/20 Medium/20 Hard. Original 120 reviewed items were reused/classified, 600 added, and 120 repetitive/public `school-*` fixtures retired. No historical records were deleted.
- Selection is strict by frozen school and class for normal skills, reactions and team Rune. Reconnect retains the original assigned item, options, timestamps and grade. Browser input never supplies correctness, performance or results.
- A mobile formula regression was found during the complete browser run: the new MathText wrapper was receiving the option-letter span's `flex-shrink:0` and chip styles. Letter styles now target the first child only; formula text can shrink/wrap, and KaTeX retains its own bounded horizontal scrolling. No clipping workaround hides the answer text.

## Main files

| Area | Files |
|---|---|
| Lobby/DTO | `src/components/lobby/Lobby.tsx`, `src/game/multiplayer/client.ts` |
| Authority/assignment | `src/game/multiplayer/server/authority.ts`, `src/game/multiplayer/protocol.ts` |
| Question UI/mobile | `src/components/combat/OnlineQuestion.tsx`, `src/app/globals.css`, `src/app/math.css` |
| Bank validation/import tool | `src/game/questions/validation.ts`, `scripts/validate-question-bank.ts` |
| Backend | `supabase/functions/nova-combat/entry.ts`, generated `index.js` |
| Database | `supabase/migrations/20261022130646_nova_player_school_bank.sql` |
| Regression | `tests/school-level.test.ts`, `tests/browser/school-level.spec.ts`, mixed-level `tests/campaign.test.ts`, SQL suites |

The live migration was applied as `nova_player_school_bank`, version `20261022130646`; the checked-in file matches that recorded migration. `nova-combat` was deployed as version 11 with the same source bundle. Existing verify-JWT setting is retained because the handler validates user JWTs with Auth and validates worker capabilities through the database; no auth bypass was added.

## Database boundaries

`room_players.school_level`: nullable choice with a three-value check and a Ready constraint. All client mutations use `nz_lobby_v1(SELECT_SCHOOL)` with its existing receipt/throttle/session-lock protections. The compatibility `nz_school_level_v1` is an invoker wrapper, not a second authority.

`private.questions.school_level` and `question_class_id`: explicit indexed classification. Service-only `nz_combat_bank_v3` filters against locked roster; the TypeScript resolver filters again. Service-only `nz_question_import_v2` validates an entire 720-item publication and atomically retires superseded rows, preserving immutable keys/options/prompts and assignment history. No public answer dataset is committed.

No changes to damage/healing, skill costs, performance thresholds, turn deadlines, boss formulas, combat resolver order, combat HP/resources, cutscenes or multiplayer progression were needed.

## Verification

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, zero warnings |
| `npm run check:edge` | PASS |
| `npm test` | 105/105 PASS, including full mixed-grade 1P/2P/4P expedition simulations and existing authority/concurrency regressions |
| `VERCEL_ENV=production NOVA_ENABLE_OFFLINE_DEMO=1 NEXT_TELEMETRY_DISABLED=1 npm run build` | PASS |
| `NOVA_QA_CHROMIUM=... npm run test:e2e -- --workers=4` | 42/42 PASS, 54.5s, after fixing the 320/360px formula regression |
| Live `supabase/tests/lobby.sql` | PASS, fixtures rolled back |
| Live `supabase/tests/combat.sql` | PASS, fixtures rolled back |
| Live `supabase/tests/exploration.sql` | PASS, fixtures rolled back |
| Live `supabase/tests/school.sql` | PASS, fixtures rolled back |
| Live `supabase/tests/question-publication.sql` | PASS, fixtures rolled back |
| Private `validate-question-bank ... --school` | 720 items, exact coverage, zero normalized duplicates |
| Private `audit-question-math.py` | 720 checked, zero rational/key/equivalent-option failures |
| Live bank count and grants | 720 active; zero unclassified/unreviewed; authenticated role cannot execute bank/import RPCs |

Browser coverage includes 320/360/375/390/412px and desktop1280px, class selection/Start, mocked online snapshots, question controls, chibi animation and death, result sequencing, Phaser lifecycle, audio and reconnect recovery. School dropdown cases specifically exercise non-coordinator choice, mandatory selection, Ready invalidation, three available choices and refresh persistence at320/390px. SQL tests exercise actual authenticated permissions, locked roster and private bank routing, plus malformed publication rejection, immutable revisions and atomicity.

The previous failing browser result was 40/42 before the contained MathText layout fix; no assertions were weakened or deleted to make the final suite pass. The new dropdown test also awaits the server-confirmed school value before clicking Ready.

## Limits

- SD primarily targets upper-primary prerequisites (classes4–6); one dropdown is not a per-year curriculum diagnostic.
- The bank has controlled numerical/template variants. Items have agent mathematical/editorial review; independent teacher review and measured learner solve times remain NOT TESTED.
- Browser tests use desktop Chromium and mobile viewports, not physical Android/iOS. A fresh four-device live hCaptcha-to-ending expedition was NOT TESTED in this focused pass. Existing full authority simulations and live SQL suites remain separate evidence.
- Fresh database setup intentionally requires the protected owner content export/import. Active answer keys are not public seed data.

See [QUESTION_BANK_SPEC.md](QUESTION_BANK_SPEC.md) and [QUESTION_BANK_QA_REPORT.md](QUESTION_BANK_QA_REPORT.md) for serving rules and distributions.
