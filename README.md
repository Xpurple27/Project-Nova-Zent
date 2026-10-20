
# NOVA ZENITH
A mobile-first cooperative mathematical RPG for 1–4 players.

This delivery covers **High 1–5**: application foundation, deterministic offline combat, Abyss Guardian, combat UI, and a server-authoritative Supabase lobby. Online combat synchronization belongs to Extra High #2 and is not implemented here.

## Run
Node22 or later. Copy .env.example to .env.local and add your Supabase publishable key.
Enable Anonymous Sign-Ins in Supabase Auth. Do not put a service-role or secret key in frontend configuration.

    npm install
    npm run dev

- / — NOVA ZENITH landing page.
- /lobby — real Supabase guest room/class/ready foundation.
- /dev/combat — offline QA battle lab in development.

The production lab is disabled by default. Set server-side NOVA_ENABLE_OFFLINE_DEMO=1 to opt into the offline demo; production debug mutation controls remain disabled.
This lab uses non-secret development questions, not the future secure online bank.

## Verification

    npm run typecheck
    npm test
    npm run build
    npx playwright install chromium
    NOVA_ENABLE_OFFLINE_DEMO=1 npm run test:e2e

Build with NOVA_ENABLE_OFFLINE_DEMO=1 when testing the opt-in lab in a production server.
GitHub Actions runs the checks and commits a generated lockfile only after all checks pass.

## Supabase
Apply the migration in supabase/migrations to a fresh project; it includes schema, constraints, RLS, lobby RPC and projection publication.
The connected Project Nova Zent received this migration through the project connector.
supabase/seed.sql is optional development-only seed data, not a production question bank.
supabase/tests/lobby.sql is a rollback-based integration test, not a data migration.

Guest credentials and the current room use sessionStorage. Independently opened tabs can represent separate guests; duplicated tabs may copy the same identity. Refreshing the same tab preserves membership. Clearing credentials or switching device does not restore an anonymous identity.
Capacity counts four reserved memberships, including disconnected members. Coordinator can release an inactive slot after the60s grace period.
START locks a ready roster and stops at STORY/AWAITING_COMBAT_INTEGRATION.

## Contracts
- docs/NOVA_ZENITH_MVP_BLUEPRINT.md
- docs/IMPLEMENTATION_STATUS.md
- src/game/config — centralized stats and skills
- src/game/core — types, FSM, math and audio port
- src/game/combat and boss — OFFLINE_QA only
- src/game/multiplayer — lobby adapter
- src/game/assets — replaceable asset interface

Current art is an original placeholder. Attached art references have not yet been inspected because the authoring runtime was unavailable.

## Credentials
Use only publishable configuration in the browser. Never commit .env.local, service-role keys, secret keys, access tokens or database passwords.
