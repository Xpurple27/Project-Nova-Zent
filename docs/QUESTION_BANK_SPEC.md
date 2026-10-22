# NOVA ZENITH — school/class question bank V2

The private production bank contains **720 active questions**: SD/SMP/SMA × Warrior/Mage/Thief/Healer × 60 questions. Each of the 12 pools contains exactly 20 Easy, 20 Medium and 20 Hard items. This publication reuses and classifies the original 120 reviewed items and adds 600 original instances. The 120 public `school-*` parameterized migration fixtures are retired, along with the older 60 pilot items. Historical revisions and assignment foreign keys remain intact.

## Player choice and authority

Each member must choose SD, SMP or SMA in character selection before Ready. There is one disabled prompt and exactly three selectable options. Non-coordinators choose their own level. Changing class or level clears party readiness. Start freezes class and school level in `locked_roster_json`; the authority document snapshots levels by actor ID. Mid-run grade changes are rejected. A reconnect restores the same assignment, options and deadline.

`room_players.school_level` is nullable for a new membership, restricted to the three values, and required by a database constraint whenever Ready is true. `SELECT_SCHOOL` runs through the existing authenticated lobby transaction, idempotency receipt, per-user throttle and session row lock. Client payloads cannot nominate another member to edit. `nz_school_level_v1` is a compatibility wrapper around that command; it no longer edits the entire room. A retry of an identical level does not clear readiness.

Existing memberships were backfilled from their room's previous level. Old locked rosters without the field retain the original room-level choice. New and rejoined memberships must choose explicitly. The old optional top-level room field is a compatibility DTO field and is not the source of a player's grade.

## Educational scope

SD content primarily targets upper primary prerequisites (approximately classes 4–6), SMP classes 7–9, SMA classes 10–12. These are broad content bands, not a claim that every item covers every school year or curriculum standard. Easy/Medium/Hard are cognitive-load tiers **inside** the selected school band; selecting SD does not merely change the timer.

| Character | Main mathematical identity |
|---|---|
| Warrior | Arithmetic, numerical precision, ratios, equations, quantitative reasoning |
| Mage | Formula use, geometry, algebra, functions and symbolic calculation |
| Thief | Patterns, sequences, logic, probability and counting |
| Healer | Percentages, proportions, measurements, contextual restoration calculations |

School/class are strict serving boundaries. Related category affinity metadata remains descriptive; it never allows a question from a different school band or class pool. Timers remain 12/18/25 seconds, Perfect remains correct within the first half of the available server time, and class skill difficulty, damage/healing, resources and boss rules are unchanged. Action, defensive reaction and team Rune assignments all obey the same grade/class boundary.

## Assignment and privacy

`nz_combat_bank_v3(session)` is executable only by the service role. It returns reviewed active revisions compatible with that session's locked roster. The shared authority filters again by actor's frozen school, class and requested difficulty, then applies the existing seeded category preference, history and option-token permutation. When the same-grade/class pool is exhausted it may reuse that pool; it never changes grades. A missing compatible pool fails closed with `QUESTION_BANK_UNAVAILABLE`.

The browser receives only its own prompt, four ephemeral option tokens/texts, grade/difficulty, timestamps and final performance. It receives no correct token, revision ID, explanation or private question history. Private answers are absent from this repository, frontend bundle and public migrations. The 720-item bank lives in `private.questions`; no new public content table/view or client write grants are introduced.

## Private publication workflow

1. Export privately with `select jsonb_agg(to_jsonb(q) order by logical_question_id) from private.questions q where status='ACTIVE' and content_version='production-v1';`. Keep the export outside tracked/public files.
2. Run `node --import tsx scripts/validate-question-bank.ts PRIVATE_JSON --school --write-sql=PRIVATE_SQL`.
3. Run `python scripts/audit-question-math.py PRIVATE_JSON`. This checks restricted arithmetic derivations and option equivalence using exact rational arithmetic; it does not execute content as code or substitute for editorial review of the prompt.
4. Import through service-only `nz_question_import_v2`. Publication is one transaction, requires 720 unique items and exact 20-per-tier coverage in every school/class pool, verifies review/options/immutable question identity, and retires superseded active rows. It never deletes historical assignments or rewrites a previously assigned prompt/key/options.
5. Verify counts, grants, live SQL tests and serving. The Edge worker uses V3, not the former room-level V2 bank.

Apply migrations including `20261022130646_nova_player_school_bank.sql` on a fresh backend, then import the owner's protected export. Production keys are intentionally not embedded in a seed. Before import, a new backend cannot serve the unclassified historical public fixtures through V3.

The agent reviewed mathematical derivations and content prerequisites. Independent teacher review and measured student solve-time calibration remain recommended and were **not performed** in this implementation pass.
