# NOVA ZENITH — four motion/navigation priorities

Baseline: f2c20b21d2dd0e41d8935d87ccb393f9ebe5a020. Scope: focused presentation changes, not a new release certification.

## Implemented

| Priority | Actual implementation |
|---|---|
| Walk | Eight-frame directional gait exported from shared articulated body: opposing legs/arms, knee flexion, cloak sway, back-facing north and mirrored west. Phaser motion/collision/interpolation/network rate are retained. |
| Skill motion | Native combat SVG rigs with separate torso/head/shoulder/elbow/hip/knee/weapon transforms. All16 class skills have distinct windup, strike/cast and recovery poses. Defensive block/dodge/barrier/ward and Guardian skills use the same semantic event controller. A failed non-Warrior reaction shows hurt rather than a successful defense. |
| KO / revive / death | Heroes fall into a persistent lying pose; revive begins at that exact pose and rises to idle. Guardian surges, buckles, collapses, loses its chest-core light and scatters halo fragments. Repeated snapshots do not restart the sequence. Already-dead loaded snapshots seek the final pose. The shared ending cutscene samples a dedicated eight-frame Guardian sheet by existing server time. |
| Locations / navigation | Original ground textures for all five scenes, more detailed roof shingles/timber, tree canopies/roots, pillars/masonry. Existing signature landmarks stay. Minimap + accessible full-map dialog show actual local/remote rendered markers, zones, landmark, destination, and a collision-aware suggested path. Keyboard M/ESC, touch buttons, focus return, scene cleanup and local input pause while reading the map. |

## Main files

- `src/game/animation/{motion,rig,controller,manifest}.ts`: pure poses, body/weapon artwork, semantic event mapping, per-asset frame metadata.
- `src/components/presentation/{RigFigure,ActorSprite,MotionLab}.tsx`: disposable vector runtime, snapshot-driven KO lifecycle, opt-in offline motion studio.
- `src/game/exploration/{navigation,phaser,scenery,bridge}.ts`: bounded local route guidance, directional frames, story death, actual marker callbacks and richer original scenery.
- `src/components/exploration/{Exploration,WorldMap}.tsx`, `src/components/combat/Battlefield.tsx`, `src/app/globals.css`: UI integration, accessible navigation and phase/death treatment.
- `scripts/generate-motion-sheets.ts`, `generate-placeholder-art.mjs`, `generate-environments.ts`; generated assets under `public/assets/sprites/` and `public/assets/environment/`.
- `tests/motion-navigation.test.ts`, `tests/browser/motion-navigation.spec.ts`; existing animation/visual/reduced-motion assertions updated to the intentionally changed renderer/frame contract.
- `docs/ART_BIBLE.md`, `docs/SPRITE_PIPELINE.md`: current artwork/runtime contract and decoded texture budget.

## Authority and boundaries

No changes to authoritative engine, resolver, AI, damage/heal formulas, question grading, action/deadline DTOs, database schema, migrations, RLS, lobby RPCs or progression rules. Pose time uses a client presentation clock; shared cinematic sampling uses the existing authoritative story clock. Neither can acknowledge/finish gameplay. Existing event sequences fence repeated playback. Native combat has at most30 joint updates/sec with no React render per frame; all RAF/media/visibility listeners are cleaned up. Exploration broadcasts remain ephemeral10Hz, with no coordinate writes to PostgreSQL. Navigation is read-only and uses the existing map obstacles/player radius; opening a map pauses only the reader's input, never the shared encounter clock.

The former blanket four-frame art export contract changes only for world gait and the dedicated cinematic sheet: row indexing now reads `columns`/`clip.frames`. Normal enemy artwork remains unchanged. Portrait/selection artwork is preserved. Combat motion uses simplified vector embodiments of those same identities, rather than deforming the painted standing image.

## Verification

Evidence is from the local production build and explicit test fixtures/local QA transport. Browser tests do not replace live Supabase or physical-device UAT.

| Check | Result |
|---|---|
| TypeScript | PASS |
| ESLint with zero warnings | PASS |
| Node/domain/integration regression | 93/93 PASS, including existing1P/2P/4P authoritative expedition/combat simulations |
| Production build | PASS, Next.js16.4.2 |
| Edge bundle drift | PASS; authoritative bundle unchanged |
| New browser cases | 5/5 PASS: all16 skills/joints, gait/facing, KO/revive/death, map/input/focus/scene cleanup,320px remote markers, ending collapse |
| Full browser regression | 37/37 PASS (42.1s), four workers;320/360/375/390/412/1280px coverage retained |
| Rapid map close/reopen regression | 5/5 repeated runs PASS (19.7s) |
| Physical Android/iOS motion/FPS | NOT TESTED |
| Fresh live4P backend expedition | NOT RUN in this presentation pass |

During verification an invalid boolean SVG attribute was caught and corrected before delivery; generated sheets are now actually decoded/rendered in automated QA. Two new unit assertions were corrected for exact endpoint/coordinate comparison; the pose sampler now returns exact authored endpoints. Initial new browser failures were selector/test-harness errors (wrapped labels and both hidden/visible map SVGs), corrected without weakening behavioral assertions. A rapid map close→reopen race was also found: an asynchronous native close event could cancel a new open. React now exclusively owns the dialog state, with idempotent native open/close and ignored keyboard auto-repeat; the M/ESC/reopen browser case exercises the fix. Existing tests were retained.

## Known limits

- Implemented motion artwork is articulated vector art, not final hand-painted frame-by-frame animation. Painted selection/portrait identity remains. Hound/Shaman retain their previous sheets.
- Cinematic Guardian uses eight sampled frames; native combat uses interpolated joints. Existing catch-up playback can shorten cosmetic recovery to protect question/reaction input deadlines.
- Scenery remains original vector environment art rather than a final painted tile set. Layout, collision and progression intentionally stay stable.
- Texture budget in the heaviest four-player exploration scene is approximately20MiB decoded; actual consumer-phone FPS/memory remains to be measured.
- Human art/pacing acceptance and physical-device checks remain outstanding. Earlier MVP release blockers/gates are not changed into a release approval by this pass.

## Ready for review

The four requested improvements are integrated into the existing game, with a shared pose/export contract and opt-in offline motion studio for subsequent visual QA. Further artwork replacement can use the current manifest/semantic states. No Stage2, inventory or progression expansion is included.
