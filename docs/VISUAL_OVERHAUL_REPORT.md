# NOVA ZENITH — visual overhaul implementation report

Historical report for the first identity pass. The subsequent motion/navigation implementation is recorded in [MOTION_NAVIGATION_REPORT.md](MOTION_NAVIGATION_REPORT.md); current runtime details are in SPRITE_PIPELINE.md.

Baseline: `290f0c859fcf24d686a0620f82eb2ccc6756c43e`. This report covers the focused visual/presentation request, not a new MVP release certification.

## 1. Ringkasan perubahan

Implemented four original illustrated hero identities, real character selection cards/portraits, matching exploration proxies, stronger geometric world landmarks, a new Guardian identity/phase treatment, grouped combat action presentation and seekable cinematic staging. No balance or gameplay authority change.

## 2. File utama

| Area | Files |
|---|---|
| Character assets | `public/assets/identity/`, hero/Guardian sheets in `public/assets/sprites/`, `game/animation/identity.ts`, `scripts/generate-placeholder-art.mjs` |
| Selection / portraits | `components/lobby/Lobby.tsx`, `components/presentation/HeroArt.tsx`, `app/page.tsx` |
| Combat presentation | `game/presentation/combat.ts`, `components/presentation/useCombatPlayback.ts`, `ActionReadout.tsx`, `ActorSprite.tsx`, `components/combat/Battlefield.tsx`, `OnlineCombat.tsx`, `CombatLab.tsx` |
| Scenery / story | `game/exploration/scenery.ts`, `phaser.ts`, `game/story/presentation.ts`, `components/story/StoryOverlay.tsx` |
| Styling / regression | `app/globals.css`, `tests/combat-presentation.test.ts`, `tests/browser/visual-identity.spec.ts` |
| Contracts / provenance | `ART_BIBLE.md`, `SPRITE_PIPELINE.md`, `VISUAL_PRESENTATION_PASS.md`, `art/IDENTITY_PROMPTS.json` |

Paths in the table are relative to `src/` except explicitly prefixed public/scripts/tests/docs files.

## 3. Class selection

Each class card shows actual full-body artwork, class name, identity epithet, role, stats/resource and brief play-style. Occupied room slots show the matching portrait. Landing cards use the same identity. Abstract symbols are no longer the main class representation. SELECT_CLASS, Ready/Cancel Ready and Start still use the same intents and authoritative locking. Missing art falls back to the matching humanoid sprite.

## 4. Character identity

| Class | Identity | Recognizable detail |
|---|---|---|
| Warrior | Pelindung Segel Retak | Scarred protector, blue-steel seal plating, huge cyan-fractured tower shield |
| Mage | Perangkai Formula | Silver hair/violet braid, split astrolabe staff, floating formula geometry |
| Thief | Pengintai Bayangan | Exposed face, split scarf, sharp teal silhouette, two hooked blades |
| Healer | Penjaga Harmoni | Crown braid, ivory fan mantle, amber gyroscope staff, restorative rings |

The same illustrated character is used for selection, portrait crops and combat standing/cast/hurt/KO presentation. Exploration proxies reflect the same gear/palette; animation names/frame contracts remain compatible.

## 5. Environment identity

Village: Eight-Seal Obelisk, seal architecture and warm geometric windows. Forest: root meridian and fractured rune markers. Ruins Path: corrupted formula aqueduct and crimson traces. Ancient Ruins: concentric octagonal gate and patterned pillars. Chamber: broken seal engine, converging cracks and a dark Guardian focal point. Map bounds, obstacles, exit zones, movement speed and progression data are unchanged. Scenery is original code-native geometry with no third-party asset dependency.

## 6. Boss identity

The Guardian is an ancient corrupted seal construct with a hollow head, broken octagonal halo, huge asymmetric slab arms and a suspended crimson chest core. Phase2 adds crimson rim lighting and armor cracks; Phase3 intensifies the core/fractures. Barrier uses a separate shield envelope; Heavy has a charging aura, persistent warning and separate Core target. Phase/shield/Core/Rage data comes directly from the existing snapshot.

## 7. Combat readability

Raw180ms flashes became grouped actor→skill→server tier→impact/result beats, with a260ms cast lead and900–1200ms normal display. The queue is bounded/compressed during catch-up. Actor portraits, target labels, arena actor focus, target outlines, exact damage/heal/block/shield results and an expandable ordered action history improve attribution. Failed Calculation is explicitly weakened output. A successful dodge is attributed to the actual reacting hero. Damage numbers fade; the last banner remains readable. The final killing formula can remain visible below the ending scene without delaying server progression.

Both offline and online UI use the same presentation adapter. Existing EventCursor/version/snapshot recovery remain. Audio/VFX use original sequences; repeated snapshots cannot enqueue again. Snapshot HP/resources update immediately, and question/reaction deadlines retain priority. No gameplay amount, grade or target is recalculated in the visual layer.

## 8. Story scene upgrade

The opening visibly stages an intact obelisk, its crimson fracture, the formula keeper being carried east, hero introductions and the pursuit toward Ancient Ruins. Short captions and actual hero portraits reinforce existing dialogue. Guardian entrance uses a rising illustration/silhouette and seal cracks; ending reveals seven remaining seal echoes. Shared story IDs,48/4/4/12/14-second durations, skip voting and final mutations are unchanged. Reconnect seeks current staging/camera by server time. Controls/camera restore after skip/completion; staging never writes world coordinates or progression.

## 9. Verification

Final evidence is recorded in the verification matrix below. All existing domain/combat regressions are retained. New browser tests use explicit test-process API fixtures for lobby/online UI; they are not a claim of live Supabase or physical-device UAT.

| Check | Result |
|---|---|
| TypeScript | PASS |
| ESLint, zero warnings | PASS |
| Node domain/integration suite | 86/86 PASS |
| Production build | PASS |
| Edge bundle drift check | PASS; authoritative sources/bundle unchanged |
| Browser suite | 32/32 PASS (38.4s) |
| Viewports | 320/360/375/390/412/1280px; no page overflow in tested routes |
| New UI coverage | Character cards, create/select/Ready/Start intent wiring, missing-art fallback, exact combat results, duplicate snapshots, refresh HP, cinematic incident/skip, scene cleanup, successful dodge, four isolated phase/Barrier/Core views, final-hit recap |
| Existing UI coverage | Guest test doubles, lobby entry, offline questions/reaction, mobile touch/rotation, motion peers, audio, reduced motion, VFX dedupe, ending/permanent leave recovery |
| Live SQL/backend UAT in this pass | NOT RUN; no database/authoritative engine change |
| Human hCaptcha, physical Android/iOS, fresh live full4P campaign | NOT TESTED in this visual pass |

The four isolated browser views verify presentation of the same authoritative fixture, not a new live four-player campaign. Previously documented release gates remain open.

## 10. Remaining placeholders / limitations

- Full-body illustrations and portraits are implemented. Frame-by-frame hand-painted combat attacks and exploration walk sheets are not final; current motion uses semantic CSS and four-frame SVG identity proxies.
- Guardian uses one standing illustration plus phase overlays, rather than three separately painted phase sheets.
- Environments use improved original vector scenery rather than a final painted tile set. Normal enemy art/audio were retained within the requested scope.
- Perfect/Success/Failed display reads the existing server event's terminal enum text because that event lacks a structured tier field. The localized adapter is regression-tested; no grading logic moved to the client.
- Animation may lag a current snapshot briefly; live input and authoritative deadlines always win. This is deliberate and bounded.
- Human pacing/art acceptance and physical-device checks remain necessary. This pass does not change the existing NOT RELEASE READY audit into a release approval.

## 11. Ready for the next stage

The visual manifest, matching class identities, real selection cards, replaceable sprite contract, grouped action timeline, phase treatment and server-time cinematic staging are ready for focused art/pacing acceptance. Additional painted frames or environment assets can replace the proxies through the existing manifest without an engine rewrite. No Stage2, equipment, inventory or gameplay architecture expansion was added.

Screenshot evidence (test-process API fixtures): [selection320px](images/selection-320.webp), [combat390px](images/combat-390.webp), [opening](images/opening.webp). These are actual rendered UI captures, not concept mockups.
