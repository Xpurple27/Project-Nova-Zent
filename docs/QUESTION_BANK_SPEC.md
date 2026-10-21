# NOVA ZENITH production bank V1
120 original Indonesian multiple-choice items: 40 Easy, 40 Medium, 40 Hard. Target prerequisites: upper SMP to early SMA arithmetic, fractions, proportional reasoning, basic algebra/geometry/probability. No olympiad/exam copies or hidden pattern-rule assumptions. Gameplay timers/performance thresholds remain 12/18/25 seconds and Perfect≤50%.

Production content is in private.questions only. No production JSON/SQL answer seed is committed. Existing 60 public-repository pilot items are retained as RETIRED for immutable assignment/audit FKs. A fresh backend intentionally cannot serve production questions until the owner imports its private export; it must fail closed rather than silently serve dev fixtures.

Fields: immutable revision UUID, logical id/revision number, difficulty, category/family/affinity tags, prompt, four option ids/texts, private correct id, explanation/expected solution, solve-time estimate, reviewed_at/reviewed_by, lifecycle status, content version. DRAFT + reviewed_at represents reviewed-but-not-active; ACTIVE requires review metadata and valid solve-time range for production. RETIRED remains readable only to privileged audit tooling. Only reviewed ACTIVE production-v1 items are served by the service-only bank RPC.

Categories: ARITHMETIC, NUMBER_SENSE, FRACTIONS, RATIO, PERCENTAGE, ALGEBRA, LINEAR_EQUATIONS, FORMULA, SEQUENCES, PATTERN, LOGIC, PROBABILITY, GEOMETRY, MEASUREMENT. Rune uses the same Medium bank (rune metadata), not a second grader or copied bank. Reaction uses Easy. Skill difficulty stays frozen.

Selection: server seeded RNG, 65% preferred-category/affinity pool when available, otherwise the whole difficulty pool. Global run history is preferred for fresh items; fall back to actor history, then reuse only after exhaustion. Concurrent party assignments avoid an item already assigned in the phase whenever the pool permits. History survives normal encounters. Assigned revision/option permutation/deadline never changes on reconnect.

Safe DTO: prompt, difficulty, four ephemeral option tokens/texts, owner/context/start/deadline, finalized performance. It excludes revision/key/explanation, other players' questions/answers, and internal history. Supabase Auth membership and service-only CAS stay authoritative. Bank cache TTL is 60 seconds; redeploy after a release to eliminate any old runtime cache.

## Private release workflow
1. Export privately from the owner SQL editor using `select jsonb_agg(to_jsonb(q) order by q.logical_question_id) from private.questions q where status='ACTIVE' and content_version='production-v1';`. Save the JSON only in a protected local file. Never put it under src/public/docs or commit it.
2. Run `node --import tsx scripts/validate-question-bank.ts PRIVATE_JSON --write-sql=PRIVATE_SQL`. The script prints counts only; guard the generated SQL as a private artifact.
3. Import through service-only nz_question_import_v1 in a secure SQL/connector environment. Import transaction validates keys/metadata and minimum per-difficulty coverage, inserts immutable revisions, then retires pilot items atomically. Do not replace the options/key of an assigned revision; create a new revision.
4. Confirm counts/review status, run private mathematical QA, test assignment safe projection/RLS and sample play. Re-run the production bundle/privacy check. Human classroom solve-time calibration remains a separate release criterion; content estimates are not measured learner timings.

Extra High3 independently rechecked all120 restricted arithmetic derivations/options with scripts/audit-question-math.py and reviewed the prompts across all categories. This check does not execute content as code. Human timing and learner calibration are still NOT TESTED.
