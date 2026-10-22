# NOVA ZENITH — painted chibi and encounter closure

Baseline: db54772a803258d79d4adbf2bb448be3f7a6d166. The user's22October2026 chibi request supersedes the old non-chibi/5.5-head vector requirements.

## Actual changes

| Request | Implementation |
|---|---|
| Selection / played character continuity | Four illustrated chibi hero atlases generated using the existing painted hero artwork as identity references. Hair, face, skin tone, armor/clothes, palette and signature weapons stay recognizable. Selection and portrait exports come from the same chibi atlas used during combat and walking. |
| Real backgrounds | Five original generated painted backgrounds: Village, Forest Path, Ruins Path, Ancient Ruins, Seal Chamber. They fill the existing1152×768 map and retain a clear eastbound route. Combat uses the matching painted location as its backdrop. Old decorative vector architecture is suppressed when the painted map loads. |
| Recognizable enemies | New Shadow Hound (wolf/beast), Corrupted Shaman (robed goblin caster), and matching Abyss Guardian artwork. All have idle, attack, hit/fall and defeated frames, with a dark-core rubble pose for the Guardian. |
| Final hit before exit | A dedicated bounded visual conclusion: strike0–450ms, hit/damage450–1100ms, fall1100–2800ms, named DEFEATED result2800–4200ms, then current world/story. The server already committed Victory/progression; no client ACK or extra server turn is involved. |
| Chibi walking | Four painted gait frames per direction, front/back views, mirrored west, consistent cell/footpoint. Same hero identity as the selection and combat art; actual image frames replace abstract vector bodies. |

## Assets and provenance

All new artwork was created with the built-in `image_gen.imagegen` tool. No external game art was downloaded. Prompts and identity/scene constraints are preserved in `docs/art/CHIBI_PAINTED_PROMPTS.json`. Optimized exports are in `public/assets/chibi/` and `public/assets/environment/painted/`. Original adult reference art stays in `public/assets/identity/` for provenance and future art direction.

`scripts/pack-painted-art.mjs` mechanically slices equal grid cells, resizes, packs WebP atlases/world sheets and derives idle/portrait exports. It preserves generated alpha. It does not paint or invent poses. Raw generated PNGs are retained in the generation output; the repo contains the optimized runtime artwork. Supply the source-asset/prompt JSON to the packer to reproduce exports. The legacy vector generator is guarded against overwriting painted WebP assets.

## Runtime contract

`game/animation/painted.ts` owns all raster paths, row/column metadata and semantic frame sequences. Hero atlases:4columns×6rows,192px cells; enemies:4columns×3rows,256px cells; Guardian:4×4,256px cells. World exports:4columns×8rows,96×128 cells. Dedicated Guardian story sheet:4×4,192px cells. Paths/frames never enter gameplay calculations.

`PaintedFigure` samples actual illustrated key poses at most30times/sec, cleans RAF/media/visibility listeners, supports reduced motion and readable asset-failure labels. Repeated frames intentionally hold a skill key pose; small travel/opacity and existing skill VFX distinguish timing. This is a compact painted sprite set, not24unique motion frames for every individual skill. Basic attacks have windup/contact/recovery, each class's other skills have separate key poses, and KO has actual kneeling/prone/rising art. World gait is four distinct frames per direction, rather than the former eight vector poses.

`ActorSprite` still uses the existing monotonic semantic event controller and authoritative HP snapshots. `Battlefield` accepts an optional presentation-only pose for the final-hit bridge. `EncounterConclusion` uses copied accepted snapshots and the exact original killing action/result events; it does not subtract HP or recompute damage/grade. Final HP is shown at hit time; no boss action can run from this component. A fresh loaded dead snapshot does not replay the conclusion. Hidden tabs discard it. New live questions/turns interrupt it so input deadlines retain priority. Duplicate snapshots cannot restart it. Missing artwork cannot stall its fixed timer. Both online and offline combat use the same bridge.

The online client keeps receiving canonical snapshots while a conclusion is visible. Latest story/progression is rendered on exit, using existing server timestamps, so reconnect/skip/progression remain authoritative. A skipped or already-completed scene is never re-created. The live backend, CAS/version/idempotency, boss/normal-enemy engines, grading, SQL/RLS and damage/heal formulas are unchanged.

## Verification

- Typecheck, zero-warning lint and authoritative Edge drift check: PASS.
- Domain/integration suite:98/98 PASS, including existing1P/2P/4P authority/concurrency/expedition simulations.
- Final browser suite:40/40 PASS (1.1min,4workers), including retained37cases plus both normal-enemy final-hit sequences and refresh during the conclusion. Intentional assertions now check painted frames/asset sources instead of obsolete vector bones.
- Production build: PASS, Next.js16.4.2.
- One verification attempt overlapped generated Next type files with a clean build and produced missing .next/types diagnostics; rerunning standalone typecheck after the build passed. No source workaround was added.
- Existing320/360/375/390/412/1280px checks, touch/rotation, missing world sprite, duplicate VFX, reconnect and class selection remain covered.
- Physical Android/iOS FPS, human hCaptcha and fresh live four-device full expedition: NOT TESTED in this art pass.

## Remaining limits / next visual QA

- The art is generated and mechanically normalized. Small equipment/pose variations across cells remain; this is not a hand-cleaned animation production pack. Four-frame gait is intentionally compact. Further in-betweens/cleanup can refine it.
- The background is painted scenery. Existing map collision/interaction data is retained; newly painted decorative props are not automatically interactive/solid. A detailed collision pass for off-route decoration is a separate review item. Main-route navigation and existing obstacles are regression-tested.
- Existing audio/VFX hooks are retained. Physical-device smoothness and human art/pacing acceptance still need hands-on review.
- This pass does not close earlier MVP release gates or certify a new release.
