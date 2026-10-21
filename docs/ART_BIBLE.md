PROJECT NOVA ZENITH

ART STYLE:
2D stylized dark fantasy RPG
clean silhouette
mobile-readable
slightly anime-inspired
not photorealistic
not chibi

CAMERA:
3/4 top-down exploration

COMBAT:
side / 3-quarter view

CHARACTER PROPORTION:
approximately 5.5 heads tall

OUTLINE:
medium, readable at small size

LIGHTING:
dramatic fantasy

WARRIOR:
male
heavy armor
large shield
sword
blue-steel visual language

MAGE:
female
arcane robe
staff
violet arcane visual language

THIEF:
male
light armor
dual blade
shadow motif

HEALER:
female
cleric-inspired
staff
gold/white divine motif

ABYSS:
dark stone
crimson energy
ancient rune motif

## Implemented identity pass — 21 October 2026

The original class IDs and lore are unchanged. These are presentation epithets, not new classes or player names.

| Class | Identity | Silhouette / equipment | Light language |
|---|---|---|---|
| Warrior | Pelindung Segel Retak | Scarred face, segmented blue-steel seal armor, huge fractured tower shield, broad sword, navy half-cape | Repaired cyan fracture; protection planes |
| Mage | Perangkai Formula | Silver bob and violet braid, asymmetric scholar coat, split-prong astrolabe staff | Violet crystals, brass orbital geometry |
| Thief | Pengintai Bayangan | Exposed face, swept dark hair/teal streak, split scarf, light angled plating, two hooked blades | Restrained teal edges and shadow trails |
| Healer | Penjaga Harmoni | Brown skin, crown braid, ivory fan mantle, ochre/plum travel vestments, gyroscope staff | Gold concentric stabilizing rings |
| Guardian | Corrupted seal sentinel | Hollow faceted head, broken octagonal halo, huge asymmetric slab arms, rib plates around a suspended crimson core | Cold stone → crimson fractures → exposed-core glare |

Selection and dialogue use actual character artwork, never an abstract emblem as the main class representation. The same full-body art appears in combat and the active-actor focus. Exploration uses deliberately simplified four-frame identity proxies with matching hair, shield/staves/blades and palettes. They are replaceable animation proxies, not finished hand-drawn production animation. Illustration proportions are mature/slightly anime-inspired; world proxies retain the existing frame/footpoint contract.

Environment landmarks are implemented in game/exploration/scenery.ts: Village's Eight-Seal Obelisk; the forest's fractured root meridian; corrupted formula aqueduct; octagonal Zenith Gate; and the chamber's broken seal engine. They decorate existing collision data. Amber/ivory geometry means ancient order, violet means formula, crimson fissures mean Abyss corruption. Keep the eastbound route clear and visually distinct.

Guardian phase presentation reads snapshot.phase: Phase1 cold stone, Phase2 crimson rim/armor crack overlay, Phase3 stronger core light and widened crack strokes. Barrier adds a separate shield envelope; Heavy adds a persistent warning/Core target and charging aura. The artwork is one standing illustration with semantic CSS reactions and phase overlays; separate fully painted phase sheets remain an art follow-up.

Nine optimized WebP assets total under 1MiB. Source prompts and provenance: docs/art/IDENTITY_PROMPTS.json. Character/Guardian illustrations were created for this project using built-in imagegen; no third-party game artwork was downloaded. Existing code-generated SVG proxy art remains project-original CC0. The keeper portrait and scenery are original code-native vectors. Do not label generated illustrations as external licensed game assets or imply the full animation sheets are final.
