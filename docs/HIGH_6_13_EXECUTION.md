# High 6–13 execution evidence
Each checkpoint runs lint, typecheck, all authoritative/domain regressions, production build, and relevant Playwright coverage. Local browser evidence is distinguished from live networking and physical-device UAT.

## High 6
- Added Phaser 3.90 (lazy browser import), five data-defined exploration scenes, collision/movement, camera, touch controls, interaction adapter, 10Hz per-sender private Realtime channels, remote interpolation and scene checkpoints.
- Persistent campaign state uses the existing server reducer/CAS; no coordinate database writes. Disconnected members remain in the 60s grace roster. Scene tokens fence stale requests and movement.
- Applied migration 20261021044506. Motion RLS binds sender to auth.uid and receivers to room membership; internal combat load/commit remain service-only.
- Lint/typecheck, 49 tests and production build passed. Playwright 7 passed. Two local QA tabs communicate with BroadcastChannel using the same motion DTO; this is not a claim of two real remote devices.
- Normal encounter markers are server-owned integration gates at this checkpoint; High 11 supplies their combat. Original procedural map/actor placeholders are replaceable.

## High 7
- Typed timeline commands, short Indonesian opening (48s), encounter hooks, boss entrance (12s), ending teaser (14s), accessible RPG dialogue and Phaser camera/actor/cue executor.
- Backend owns story instance/start/end/skip votes/completion; full active-grace roster must vote, and watchdog expiry cannot depend on a browser ACK. Reconnect seeks logical time and suppresses historical one-shot cues. Safe final state is applied once.
- Lint/typecheck, 51 domain tests, production build and 8 Playwright tests passed. Browser tests include control lock/skip in the local QA preview; server tests cover unanimity and grace expiry. Actual encounter dispatch is filled in High 11.

## High 8
- Central world/combat sheet manifests, semantic animation controller, original generated transparent SVG sheets for 4 classes/Guardian/normal-enemy placeholders, Phaser walk/idle direction clips, React combat one-shots, KO/revive and reduced-motion fallback.
- ACTION_RESOLVED/BOSS_ACTION_SELECTED now include skillId presentation metadata. Gameplay formulas/order are unchanged. Frame/anchor/row/timing/export requirements are frozen in SPRITE_PIPELINE.md.
- Lint/typecheck, 53 tests, production build and 8 browser tests passed. Art is intentionally replaceable placeholder work, not final painted artwork.

## High 9
- Event-derived bounded SVG/CSS effects distinguish steel, arcane, frost, shadow, divine and abyss cues; damage/heal/block/shield feedback and persistent mechanic telegraphs remain snapshot-driven.
- Monotonic VFX cursor ignores duplicates/out-of-order events. Single active effect with ≤1100ms lifetime, three fixed particles and cleanup timers; no unbounded emitter or gameplay clock pause. Reduced motion removes transforms/particles.
- Lint/typecheck, 54 tests, production build and 10 browser tests passed, including duplicate-event non-replay and Core/Barrier/Heavy visibility.
- The runner's Playwright CDN download failed (empty archive/503). A pinned Chromium 141 distribution via @sparticuz/chromium was extracted to ignored .qa cache; optional NOVA_QA_CHROMIUM selects it for QA only. No runtime dependency or browser binary is shipped.

## High 10
- Portrait-first compact boss/party cards, 44–48px touch controls, safe-area padding, responsive long formula/options, scrollable dialogue, visible timer/status and reduced-motion paths. No orientation lock or browser zoom suppression.
- Lint/typecheck, 54 tests, production build and 15 browser tests passed. Width matrix: 320/375/390/412/1280px; long question/options and all major QA screens have no horizontal overflow. 390px exploration/combat screenshots visually inspected.
- Mainstream Chromium responsive emulation is covered; physical Android/iOS/Safari and adverse mobile network tests remain UAT work.

## High 11
- EnemyDefinition/EnemyActionDefinition introduce Hound Bite/Pounce and Shaman Corrupt Wave/Dark Chant/Shadow Bolt through the existing shared resolver/reaction paths. Boss formulas/cycle are untouched for existing boss-only sessions.
- Campaign transitions are sequential and CAS-fenced: opening → Village/Forest → Hound → Ruins Path → Shaman → Ancient Ruins → chamber entrance → Guardian → ending. Encounter completion is durable; duplicate rally/start cannot spawn a second encounter. Frozen full HP/resource40/Ultimate≤50 recovery is applied server-side.
- Global run turn/event sequence remains monotonic; question history survives encounters. Current combatants retain stable actor IDs, while encounter history is scoped on turns/events. Final turn grades are preserved across exploration and empty checkpoint turn IDs are handled safely.
- Migration 20261021071353 applied. Lint/typecheck, 66 tests, production build and 15 browser tests passed. Includes full 1/2/4P simulated campaigns, all normal enemies at 1–4P, duplicate rally/CAS, boss regressions. Full live browser campaign UAT is reported separately.

## High 12
- One Web Audio context/bus manager with original procedural motifs/SFX, user-gesture activation, persistent master/music/SFX/mute, nonfatal autoplay rejection, bounded voices, scene-aware music and per-session event deduplication.
- Background tabs stop scheduling/active voices and consume events silently, preventing an SFX backlog on return. Cleanup closes the context and listeners/timers; StrictMode restore can reinitialize the disposed context owner.
- Lint/typecheck, 69 tests, production build and 17 browser tests passed. Browser checks cover real user-gesture activation, volume/mute persistence and forced resume rejection. Audio source/license contract is AUDIO_MANIFEST.md. Musical quality remains original synth placeholder quality.

## High 13
- Imported 120 original private production-v1 items (40 each Easy/Medium/Hard), with category/affinity, immutable revisions, review and solve-time metadata. Retired all 60 pilot items without deleting assignment history. Only reviewed ACTIVE production items can be served.
- Assignment remains server-only: seeded 65% preferred pool, run-wide history, per-actor fallback after exhaustion and avoidance of concurrent party duplicates. Rune shares Medium and reactions use Easy. Safe question projection excludes the answer key/explanation/history.
- Applied migrations 20261021072344 and 20261021072403. A private export and import validator are documented; the production answer bank is intentionally absent from Git/frontend assets. Exact-rational option checks and agent mathematical/editorial review passed. This is not independent human assessment validation.
- Final lint/typecheck, 72 Node tests (including all original authoritative regressions), Edge bundle drift check, production build and 18 Playwright tests passed. Final static-bundle scan found no production item IDs, correct_option_id or private QA calculation markers. Live network payload checks are below.

## Final verification and deployment
Executed on 21 October 2026:

| Check | Result |
|---|---|
| npm run lint | Pass, zero warnings |
| npm run typecheck | Pass |
| npm test | 72/72 pass |
| npm run bundle:edge / npm run check:edge | Pass |
| NEXT_TELEMETRY_DISABLED=1 NOVA_ENABLE_OFFLINE_DEMO=1 npm run build | Pass, Next.js 16.4.2 production build |
| NOVA_QA_CHROMIUM=… npm run test:e2e | 18/18 pass |
| Supabase lobby.sql / combat.sql / exploration.sql | Pass on connected database; fixtures rolled back |
| git diff --check / public bundle privacy scan | Pass |

One final incremental build failed reading an empty generated diagnostics JSON. Preserving the generated .next directory in ignored QA storage and rebuilding from a fresh cache succeeded; no framework source patch or application workaround was needed. The earlier Turbopack cache failure was likewise confined to generated output. Final browser tests ran against the successful production build.

Supabase has four applied migrations listed above and nova-combat Edge Function version 6 ACTIVE, deployed from the checked generated bundle. Existing in-function player authentication/worker capability validation remains in place; the existing gateway verify_jwt=false setting is preserved. No Vercel frontend production deployment or remote CI success is claimed by this report.

## Live four-browser campaign UAT
Four isolated Chromium browser contexts used the production frontend build and the actual Supabase backend. The successful retained session is `f8d8da78-eb4d-43a7-93cb-361baecd8b94`.

- Completed opening → Village → Forest → Shadow Hound → Ruins Path → Corrupted Shaman → Ancient Ruins → boss chamber/entrance → Abyss Guardian → ending/COMPLETED. All four final canonical snapshots matched and all four UIs showed the ending teaser.
- Database audit: 415 durable events; zero duplicate ACTION_RESOLVED groups per actor/turn; two ENEMY_DEFEATED, one BOSS_DEFEATED, three ENCOUNTER_COMPLETED and five CUTSCENE_COMPLETED. Two legitimate Core spawn/destruction/Cataclysm cycles and one Barrier creation/break occurred.
- Each browser saw three remote players over private Realtime channels. Exploration offline/refresh restored the scene checkpoint; combat refresh/reconnect restored the authoritative turn/HP. Old-turn input was rejected. AFK/deadline handling allowed the same session to continue during QA interruptions.
- Inspected 204 safe question response payloads: no correct token/key/explanation leaked. Authenticated direct question-bank SELECT/import/bank RPC access was denied. Production private bank counts and pilot retirement were verified in SQL.
- This campaign was resumed after harness timing/selector fixes and interruptions. It is not an uninterrupted four-human/device playtest. The harness initially sampled stale scene responses and sent actions sequentially close to deadlines; it now selects the newest version, waits for the scene token/remote packets, submits in parallel and handles deadline fencing. A real stale interaction-prompt issue on scene change was fixed and regression-tested.
- Database elapsed time was 554.215811 seconds, with instant automated answers, skips and QA pauses; final global turn was 17. These values do not validate the 15–25 minute human run or the 6–10-round boss balance target.

Temporary confirmed synthetic Auth identities were used without disabling anonymous hCaptcha. All four were deleted (SQL count zero), QA rooms expired, interrupted sessions ABORTED, and no due active QA session remained. The provisioning helper was retired to HTTP 410 with gateway JWT verification enabled; its capability expired. No usable QA credentials/private content export is committed. A successful human hCaptcha flow on the deployed hostname remains a separate gate.

## Architecture decisions

| Boundary | Final implementation |
|---|---|
| Shared truth | Existing server reducer and atomic PostgreSQL CAS/row lock own campaign, combat, story deadlines and progression |
| Exploration motion | Client-owned cosmetic movement; private per-sender Broadcast, 10Hz moving / 1Hz idle, scene token and sequence fencing, remote interpolation |
| Phaser / React | Phaser renders maps/collision/camera/actors; React owns screens, dialogue, controls, questions and authoritative snapshot transport |
| Party transitions | Server unanimous active roster rally/skip; disconnected members count during the existing 60s grace, then cannot block forever |
| Enemy encounters | One combat/resolution/reaction engine for Hound, Shaman and Guardian; no second normal-enemy or Phaser combat engine |
| Between encounters | Full HP, resource40, Ultimate retained up to50; global event/turn IDs and question history continue |
| Presentation | Central manifests and semantic event mapping; bounded deduplicated VFX/audio, reduced motion, no client gameplay calculations |
| Question content | Private reviewed immutable DB revisions; no production answer seed in the public repository |

## Known limitations and readiness
- **Critical/High:** no unresolved defect in these classes was observed in the completed automated/live scenarios. Coverage is bounded; this is not a final release certification.
- **Medium:** physical Android/iOS/Safari, diverse networks, load/soak tests, human CAPTCHA on deployed hostname, human question timing and human run/boss balance remain release audit work. No claim of human curriculum/psychometric calibration is made.
- **Medium:** sprites/music/SFX are consistent original placeholders, ready for replacement using frozen contracts. They are not final illustrated/studio assets.
- **Medium:** cosmetic movement has no server spatial anti-cheat. Server validates ordered shared progression/party agreement, not pixel proximity. Reconnect uses safe spawns rather than exact coordinates.
- **Medium:** a fresh backend requires a privileged private question export/import; private production answers are deliberately not reconstructible from public Git alone.
- **Low/operations:** existing pg_net namespace advisor remains; membership-bound anonymous-role notices and default-deny private-table notices are expected. General retention/operations and production deployment checks remain part of Extra High3.

High 6–13 module scope is ready for **Extra High3 — final MVP integration, audit and release readiness**. Do not start Stage2, progression, equipment or release certification from this evidence alone.

## Major files changed

| Area | Files / directories |
|---|---|
| Exploration and campaign | src/game/exploration/{model,bridge,network,phaser,campaign,contract}.ts; src/components/exploration/; src/app/dev/exploration/ |
| Story | src/game/story/; src/game/cutscene/contract.ts; src/components/story/ |
| Animation / VFX | src/game/animation/; src/components/presentation/; public/assets/sprites/; scripts/generate-placeholder-art.mjs; src/game/assets/manifest.ts |
| Combat integration | src/game/{boss,combat}/; src/game/enemies/; src/game/core/types.ts; src/game/config/index.ts; src/components/combat/ |
| Authoritative transport | src/game/multiplayer/{protocol.ts,server/authority.ts,server/service.ts}; supabase/functions/nova-combat/{entry.ts,index.js} |
| Audio | src/game/audio/; src/components/audio/; src/app/layout.tsx |
| Questions | src/game/questions/validation.ts; scripts/validate-question-bank.ts; private content migrations |
| UI / tooling | src/app/globals.css; package.json; package-lock.json; playwright.config.ts; scripts/uat-campaign.mjs; .gitignore |
| Database | Four 20261021 migrations listed above; supabase/tests/exploration.sql |
| QA | tests/{animation,audio,campaign,encounters,exploration,questions,story,vfx}.test.ts; tests/browser/{audio,exploration,responsive}.spec.ts |
| Documentation | README; implementation status/verification/blueprint; SPRITE_PIPELINE; exploration/story, audio and question specifications/QA report |
