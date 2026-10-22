# NOVA ZENITH — motion and sprite contract

Art direction: ART_BIBLE.md. Runtime metadata: src/game/animation/manifest.ts. Pose definitions: motion.ts; shared body/weapon geometry: rig.ts. All vector rigs, sprite exports and environment textures are original project code/art, dedicated CC0. Painted portraits retain their documented project-generated provenance.

| Mode | Renderer / frame | Columns | Origin / direction |
|---|---|---|---|
| Hero combat | Native articulated SVG, 128×160 design coordinates | Continuous joint interpolation, at most 30 DOM updates/sec | Feet (64,150), face enemy right |
| Guardian combat | Native articulated SVG, 256×256 design coordinates | Continuous joint interpolation | Feet (128,246), 1.6× body scale |
| Hero exploration | 96×128 SVG sheet, displayed at 0.5× | **8** | (0.5,1); idleS/walkS/idleW/walkW/idleE/walkE/idleN/walkN |
| Guardian cinematic | Dedicated 192×192 sheet | **8**, four rows | idle/entrance/phase/death; sampled by existing server story time |
| Hero / Guardian combat export | 128×160 / 256×256 SVG sheet | 4 | Replaceable fallback/card export; native combat does not load this sheet |
| Normal enemies | Existing 128×160 combat / 96×128 world sheets | 4 | Existing Hound/Shaman clips retained |

The previous blanket four-frame contract is intentionally replaced by per-asset `columns`/`clip.frames`. Phaser computes row offsets from metadata; never hardcode row×4. This change serves the requested smoother gait without changing gameplay contracts. Exploration loops in720ms (8 distinct opposed arm/leg poses, knee flexion); idle loops1800ms. Foot point, scale and direction convention stay consistent. North removes frontal eyes; west mirrors east. Collision always uses map/player-radius data, never artwork bounds.

Native runtime: RigFigure updates joint transforms with requestAnimationFrame, throttled to30Hz; React does not rerender each frame. A semantic AnimationController consumes original monotonic event sequences. All sixteen class skills have individually authored windup/impact/recovery poses. Basic actions are760–900ms, specials mostly900–1200ms, ultimates1400ms; boss Cataclysm1500ms. Existing bounded combat playback may compress/cut cosmetic recovery during catch-up; server deadlines never wait for animation.

KO1150ms: fall, hold final body/leg pose until authoritative revive. Recovery1200ms starts at exactly that pose, kneels, stands. Guardian death1800ms: surge, buckle, collapse, dark chest core, broken halo; holds final pose. Loading an already KO/dead snapshot seeks the terminal pose instead of replaying death. Failed Thief/Mage/Healer reactions show impact, not a successful dodge/ward; Warrior still shows partial block. The presentation reads the existing reaction result, never grades it.

Reduced motion: a fixed semantic pose, no joint loop/shake. Cleanup cancels RAF, media/visibility listeners and timers; Phaser destroys the canvas/textures/subscriptions at scene unmount. No physics, damage, HP, resources, AI or progression is computed by animation. Missing normal-enemy sheets retain readable fallback labels; missing exploration textures retain procedural figures/scenery. Native hero/Guardian bodies have no network-image dependency.

Regeneration:

- `node scripts/generate-placeholder-art.mjs` → authored hero/Guardian sheets (wrapper for generate-motion-sheets.ts).
- `node --import tsx scripts/generate-environments.ts` → five ground textures.

Use the manifest to replace sheets with PNG/WebP exports later. Maintain transparent untrimmed frames, clip row names, origins and equipment/palette identity. Painted production frames remain an optional asset replacement; these vector rigs are the implemented motion artwork.

Budget: four eight-column world sheets decode to12MiB total; one scene ground texture≈3.38MiB. Boss chamber adds a dedicated4.5MiB cinematic sheet instead of the13MiB full combat sheet. Approximately20MiB of decoded textures in the heaviest four-player exploration scene, disposed on scene change. SVG source sizes are not decoded GPU memory. Physical Android/iOS FPS has not been measured; do not call browser emulation a device benchmark.

QA: /dev/presentation provides a motion studio (only with NOVA_ENABLE_OFFLINE_DEMO=1), pose scrubbing and local KO/revive controls. It cannot alter any multiplayer state. Tests cover joint motion, continuous loops, every skill mapping, terminal lifecycle, direction, XML renderability and browser cleanup/reduced motion.
