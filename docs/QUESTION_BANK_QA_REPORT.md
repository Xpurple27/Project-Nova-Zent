# School/class question bank QA — 27 October 2026

**Published:** 720 reviewed/active private items with `qualityVersion=3`. The former 720 active identities were retired atomically; their prompts/options/keys and assignment history remain intact. A transaction-level before/after checksum confirmed immutable historical content. No schema or combat-engine migration was needed.

| Character | SD | SMP | SMA | Total |
|---|---:|---:|---:|---:|
| Warrior | 60 | 60 | 60 | 180 |
| Mage | 60 | 60 | 60 | 180 |
| Thief | 60 | 60 | 60 | 180 |
| Healer | 60 | 60 | 60 | 180 |
| Total | 240 | 240 | 240 | 720 |

Each cell has **20 Easy + 20 Medium + 20 Hard**. Global difficulty counts are 240/240/240. Live database queries confirm zero active unclassified or unreviewed rows.

| Category | Items |
|---|---:|
| Arithmetic | 42 |
| Number sense | 87 |
| Fractions | 24 |
| Ratio | 63 |
| Percentage | 69 |
| Algebra | 36 |
| Linear equations | 45 |
| Formula | 69 |
| Sequences | 42 |
| Pattern | 18 |
| Logic | 45 |
| Probability | 81 |
| Geometry | 69 |
| Measurement | 30 |

Every item has four numerically distinct options and exactly one keyed option. The private exact-rational audit checked 720 solution expressions and **2,160 misconception-derived wrong-option expressions**: zero failures and zero equivalent second correct answers. An independent limited parser also derived 132 answers from displayed prompts; the remaining 588 prompt derivations received agent editorial review rather than a claimed universal word-problem proof. All 3,581 math spans render with strict KaTeX. No normalized duplicate prompts were found.

The baseline had 591 items with four consecutive unit-spaced options. The reviewed publication has one, justified by counting an interval's inclusive/exclusive endpoints. Error models replace arbitrary answer-offset fillers. Positions are 180/180/180/180 before the server's existing per-assignment permutation.

Primary school/class memberships and current affinity are disjoint: 180 items per role, 240 per school and 240 per difficulty. There are 84 role/school concept groups, 252 tier-adapted forms and two or three controlled numerical variants per form. These are not 720 unrelated mathematical archetypes. Prompts are at most 177 characters/30 whitespace-separated words, excluding any reading-time claim for TeX.

Expected authoring solve times 8.5/14/21.5 seconds fit the unchanged 12/18/25-second server windows. **Independent teacher/psychometric review, measured student solve times and physical-device student UAT remain NOT TESTED.** Tier calibration is editorial and relative to SD/SMP/SMA prerequisites, not a validated per-year curriculum diagnostic.

## Verification evidence

| Check | Result |
|---|---|
| Structural/classification/quality/strict KaTeX publication validator | PASS, 720 items, 36 tier pools, 2,160 reviewed distractors, 3,581 math spans |
| Restricted exact-rational and displayed-prompt audit | PASS, 720 items, zero failures; 132 independent prompt derivations |
| TypeScript / ESLint / Edge bundle consistency | PASS |
| Unit/integration/authority regression suite | 111/111 PASS |
| Production build with local QA routes enabled | PASS |
| Chromium browser suite | 49/49 PASS, including 320/360/375/390/412/1280px, CDN-blocked TeX, refresh and safe answer intents |
| Live SQL `lobby`, `combat`, `exploration`, `school`, `question-publication`, `question-quality` | 6/6 PASS, test fixtures rolled back |
| Publication integrity | 720 active quality-V3 items; exact 20-per-tier coverage; historical content checksum unchanged |

Security checks confirm ordinary `anon`/`authenticated` roles cannot read `private.questions` or execute the V3 bank/import RPCs. Only safe per-actor assignment data reaches the browser; answer keys, error-model derivations and the private authoring/export/import files are not committed. A regression test confirms replacing the current bank cannot regrade or reset an already assigned question.

The mobile/browser suite uses isolated/mocked sessions and local engine simulations. A new four-device live hCaptcha-to-ending run was **NOT TESTED** in this content pass. The frozen combat resolver, skill difficulty mapping, timer and grading contracts were not changed.

Full findings, role/tier comparison, implementation and limits: [QUESTION_QUALITY_REVIEW.md](QUESTION_QUALITY_REVIEW.md). Historical dropdown/720-bank foundation: [SCHOOL_LEVEL_IMPLEMENTATION.md](SCHOOL_LEVEL_IMPLEMENTATION.md).
