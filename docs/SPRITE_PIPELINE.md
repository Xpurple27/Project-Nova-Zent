# NOVA ZENITH — current painted sprite contract

The user's22October2026 request replaces the earlier vector/non-chibi renderer. Runtime metadata is `game/animation/painted.ts`; walking/story clip metadata remains in `manifest.ts`.

| Export | Grid / cell | Source |
|---|---|---|
| Four hero atlases | 4×6,192×192 | assets/chibi/{class}-atlas.webp |
| Hound / Shaman | 4×3,256×256 | assets/chibi/{enemy}-atlas.webp |
| Guardian | 4×4,256×256 | assets/chibi/guardian-atlas.webp |
| Hero world | 4×8,96×128 | assets/chibi/{class}-world.webp |
| Guardian story | 4×4,192×192 | assets/chibi/guardian-story.webp |
| Locations | 1152×768 | assets/environment/painted/{scene}.webp |

Hero rows:0basic attack windup/contact/recovery;1east gait;2south gait;3north gait;4skills2/3/Ultimate/reaction;5hurt/kneel/prone/rise. West mirrors east. World rows retain idleS/walkS/idleW/walkW/idleE/walkE/idleN/walkN. Idle and portrait selection exports derive from the same atlas, so the chosen hero is the hero played.

No trimming/rotation in runtime grids. Transparent alpha, consistent equal cells/footpoints and readable chibi scale. Phaser uses96×128 frames at0.65display scale, metadata row×columns, and retains movement/interpolation/collision. Actual gait has four distinct painted frames per direction. Reduced motion uses a static semantic frame. Missing walking sheet uses the matching illustrated idle asset; missing both leaves a readable name/shadow, not an abstract humanoid.

PaintedFigure selects semantic frames with a disposable30Hz cosmetic sampler; it never computes gameplay. Basic attacks use multi-frame poses; specials/Ultimate/reactions hold their distinct painted key pose with the existing VFX and travel accents. KO stays prone, revive rises, enemy death stays defeated. See PAINTED_CHIBI_PASS.md for the bounded attack→hit→fall→result→world bridge.

Approximate decoded budgets: four combat hero atlases13.5MiB, current enemy up to4MiB, background3.38MiB (~21MiB before browser overhead). Four world sheets6MiB + background3.38MiB + chamber story2.25MiB (~12MiB). Later scenes are loaded on demand/disposed. WebP transfer totals are separate from decoded texture memory. No physical-phone FPS guarantee is implied.

Art generation: built-in imagegen with original project references; prompts in docs/art/CHIBI_PAINTED_PROMPTS.json. Mechanical export: scripts/pack-painted-art.mjs. Do not run the legacy vector generator over painted assets. Existing vector pose/rig helpers are retained for regression/history and small travel accents, not as the active character artwork. All server authority, deadlines and grading remain unchanged.
