
# High 1–5 delivery status
The canonical name in application/config/docs is NOVA ZENITH.

## Implemented source
- High1: Next.js/TypeScript/Tailwind app, centralized configuration, domain types, FSM, pure math, Supabase boundaries, schema/RLS, development fixtures and tests.
- High2: deterministic, immutable offline party resolver, all sixteen skills, costs, effects, combo, Ultimate, KO and revive.
- High3: boss cycle, weighted seeded threat, phases, cooldown, barrier/Rune, Rage, full-turn Core telegraph, Cataclysm and class reactions.
- High4: responsive offline combat UI, questions, party plans, targets, effects, event feedback/log, mute/hooks, dev-only debug controls.
- High5: anonymous guest lobby, transactional room/class/ready/start, projections, presence, polling, grace/reconnect and coordinator transfer.

## Explicitly excluded
Online combat synchronization/resolver/deadlines, final bank60, Phaser exploration, story/cinematics, final graphics/audio, progression.
START locks the party and waits at STORY; it does not pretend to start networked battle.

## Verification
See GitHub Actions for the actual commit's typecheck, unit tests, production build and browser tests.
Database verification is performed against the connected project with transaction rollback fixtures.
Do not label a gate passed without a successful result for that gate.

## Environment and assets
Local execution environment was unavailable during authoring; files were prepared through the connected GitHub API.
Attached GAME_ART_BIBLE and sprite pipeline could not be read. Manifest-compatible placeholders are used.
Supabase anonymous sign-ins must be enabled in the project's Auth settings.
The production offline lab is opt-in using server environment NOVA_ENABLE_OFFLINE_DEMO=1.
Normal production builds return404 for /dev/combat; debug mutation controls are never rendered in production.

## Verified gate summary
CI run39485332496 passed TypeScript,31 unit tests, production build and2 browser tests.
SQL integration/regression tests passed against Supabase and rolled back fixtures.
Anonymous Sign-Ins remains OFF; live guest/multi-device lobby acceptance is pending activation and UAT.
