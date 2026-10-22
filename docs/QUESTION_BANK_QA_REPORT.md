# School/class question bank QA — 22 October 2026

**Published:** 720 reviewed/active private items. Original 120 items were classified and retained; 600 new instances were added. The 120 exposed `school-*` fixtures and 60 pilot items are retired; no historical QA/assignment rows were deleted.

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
| Arithmetic | 47 |
| Number sense | 72 |
| Fractions | 29 |
| Ratio | 45 |
| Percentage | 91 |
| Algebra | 54 |
| Linear equations | 32 |
| Formula | 71 |
| Sequences | 61 |
| Pattern | 23 |
| Logic | 42 |
| Probability | 65 |
| Geometry | 57 |
| Measurement | 31 |

Every item has four distinct option texts and exactly one keyed option. A private exact-rational audit checked all 720 stored solution expressions against every numeric option: **720 checked, zero failures, zero equivalent second correct options**. Prompt derivations/prerequisites were reviewed separately. Normalized prompt duplicate check: zero. Stored family labels distinguish grade/difficulty contexts; they should not be interpreted as 464 independent pedagogical archetypes. The new items include controlled parameter variants, not 600 unrelated solution methods.

Primary school/class memberships are disjoint for exact coverage. Historical affinity tags can overlap (Warrior216/Mage180/Thief180/Healer180) and do not change serving boundaries. Expected solving times are estimates within the existing 12/18/25-second limits. No independent human/psychometric review, classroom timing study or physical-device student UAT was performed.

Security checks: ordinary authenticated users cannot execute V3 bank/import RPCs, directly read the answer table or edit grade/HP/state. Only the actor's safe assignment is serialized. Retired public fixtures remain present historically but are not served. Original active questions and the 600 new answer keys were not added to public Git history.

Implementation/verification details: [SCHOOL_LEVEL_IMPLEMENTATION.md](SCHOOL_LEVEL_IMPLEMENTATION.md).
