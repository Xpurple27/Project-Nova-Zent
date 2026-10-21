# NOVA ZENITH delivery status

High1–5 remains intact. Extra High2 adds server-authoritative combat for1–4 players using the existing deterministic TypeScript engine.

Implemented: unique encounter/turn IDs, parallel planning, locked validated actions, private shuffled question assignments, server grading, deadlines/defaults, atomic CAS/row-lock commits, ordered durable events, boss decisions/reactions/Rune/Core/Heavy, terminal outcomes, monotonic client snapshots, replay deduplication, reconnect and independent cron recovery. The old STORY integration placeholder now starts the authoritative encounter.

Offline QA and its debug panel remain available. The CLI simulation supports1–4 players, timeout advancement, disconnect/reconnect and Heavy; its test store exposes development-only state editing. No production debug mutation command exists.

Supabase migrations and nova-combat Edge bundle are deployed. The frontend source is in this repository; no Vercel production deployment is claimed. The pilot question bank has20 questions per difficulty and still requires educational review.

The full four-browser UAT reached one shared Victory in9 rounds. See VERIFICATION.md for evidence, exact gates, security advisories and remaining environment prerequisites. New guest login still depends on the project's Anonymous Sign-Ins setting; four temporary confirmed QA identities were used without changing Auth configuration.

Supplied art documents have been read and normalized to NOVA ZENITH. Production sprite exports/audio, exploration, cinematics, progression and other excluded features are not implemented.
