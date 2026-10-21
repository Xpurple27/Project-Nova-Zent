# NOVA ZENITH delivery status

Current release decision: see EXTRA_HIGH_3_FINAL_AUDIT.md and MVP_RELEASE_CHECKLIST.md. Module completion does not certify public-release readiness.

Current delivery: High1–13 and Extra High2 modules are implemented. Final lint/typecheck, 72 Node tests, 18 browser tests, database regression suites and production build pass. A live four-browser campaign reached the same ending state. See HIGH_6_13_EXECUTION.md for current evidence, decisions and limitations; Extra High3 release-readiness audit remains next.

## Previous Extra High2 checkpoint (historical)
High1–5 remains intact. Extra High2 added server-authoritative combat for1–4 players using the existing deterministic TypeScript engine.

Implemented: unique encounter/turn IDs, parallel planning, locked validated actions, private shuffled question assignments, server grading, deadlines/defaults, atomic CAS/row-lock commits, ordered durable events, boss decisions/reactions/Rune/Core/Heavy, terminal outcomes, monotonic client snapshots, replay deduplication, reconnect and independent cron recovery. The old STORY integration placeholder now starts the authoritative encounter.

Offline QA and its debug panel remain available. The CLI simulation supports1–4 players, timeout advancement, disconnect/reconnect and Heavy; its test store exposes development-only state editing. No production debug mutation command exists.

Supabase migrations and nova-combat Edge bundle are deployed. The frontend source is in this repository; no Vercel production deployment is claimed. The pilot question bank has20 questions per difficulty and still requires educational review.

The full four-browser UAT reached one shared Victory in9 rounds. See VERIFICATION.md for evidence, exact gates, security advisories and remaining environment prerequisites. Anonymous Sign-Ins has since been enabled by the owner and confirmed through Auth settings. The lobby now integrates hCaptcha for new guests; existing sessions restore without another challenge. The four-browser combat UAT used temporary confirmed QA identities before this Auth update. Live human CAPTCHA verification on the deployed hostname remains pending.

Supplied art documents have been read and normalized to NOVA ZENITH. At that earlier checkpoint, production sprite exports/audio, exploration and cinematics were not implemented. The High6–13 extension below supersedes the exploration/presentation/content limitations; progression remains excluded.


## High 6–13 extension
Implemented campaign progression, private per-sender movement, Phaser adapter, data-driven story/skip, replaceable animation/VFX pipeline, mobile controls/HUD, Hound/Shaman encounter definitions, shared audio and reviewed private production bank (120). Existing boss-only state remains backward-compatible. See HIGH_6_13_EXECUTION.md, EXPLORATION_STORY_ARCHITECTURE.md, QUESTION_BANK_SPEC.md and AUDIO_MANIFEST.md for implementation/evidence.

This completes the requested module scope, subject to the explicitly reported live UAT results and known limits. It does not certify final release readiness or implement Stage2. Extra High3 remains the next separate integration/release audit.
