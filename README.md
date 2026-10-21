# NOVA ZENITH
Mobile-first cooperative mathematical RPG for1–4 players.

High1–5 and Extra High2 are implemented: deterministic shared combat engine, Abyss Guardian, offline lab, transactional lobby and server-authoritative online combat.

## Local frontend
Node22+. Copy .env.example to .env.local, configure the Supabase URL, publishable key and public hCaptcha site key, then:

    npm ci
    npm run dev -- --hostname 127.0.0.1

Routes: / landing, /lobby online rooms/battle, /dev/combat offline QA. The production offline demo requires NOVA_ENABLE_OFFLINE_DEMO=1 at build/runtime; production debug mutation controls remain disabled.
Anonymous Sign-Ins and hCaptcha protection must be enabled in Supabase for new guest identities. The lobby restores an existing session first; otherwise the player completes hCaptcha and selects “Lanjutkan sebagai guest”. The single-use token is passed to Supabase Auth for validation; no CAPTCHA secret belongs in the frontend. Existing Auth sessions work independently of that provider setting. Credentials and room membership are tab-scoped sessionStorage: refresh preserves them; clearing storage or changing device does not restore a lost anonymous identity.

## Backend
The connected Supabase project has the migrations and nova-combat Edge Function deployed. Never replay applied migrations or reset the live database to set up a local frontend.
For a fresh backend, apply supabase/migrations in order, configure that environment's worker URL in the watchdog migration, and deploy the generated nova-combat bundle. supabase/config.toml records its entrypoint and verify_jwt=false: the handler explicitly validates player JWTs with Auth and worker capabilities in SQL. This does not make private database operations public.
The Edge runtime supplies its privileged credentials. No frontend service-role environment variable is needed.

    npm run bundle:edge
    npm run check:edge

The bundle is generated from the exact same domain engine used by offline QA; do not hand-edit index.js. Backend API: intents START/GET/PUMP/ACTION/ANSWER/LEAVE. Clients can never submit grades, damage, HP, resource or outcome.

## Verification

    npm run lint
    npm run typecheck
    npm test
    npm run check:edge
    NOVA_ENABLE_OFFLINE_DEMO=1 npm run build
    npx playwright install chromium
    npm run test:e2e
    npm run simulate -- --players=4 --disconnect --heavy

supabase/tests/lobby.sql and combat.sql use rolled-back fixtures. Live browser UAT scripts are opt-in, require temporary synthetic Auth sessions in ignored .uat.json, and are never production endpoints. Do not put live user credentials in this file. See docs/VERIFICATION.md for actual evidence and limitations.

## Contracts
- docs/NOVA_ZENITH_MVP_BLUEPRINT.md — frozen product/rules
- docs/MULTIPLAYER_COMBAT_ARCHITECTURE.md — authority, clocks, concurrency and recovery
- docs/IMPLEMENTATION_STATUS.md — delivery scope
- src/game/config — centralized balance
- src/game/combat and boss — shared pure deterministic engine
- src/game/multiplayer/server — secure orchestration
- src/game/multiplayer/combat-client — transport/subscriptions
- src/components/combat — snapshot-driven UI and offline lab
- docs/ART_BIBLE.md / SPRITE_PIPELINE.md — supplied art direction

Final art/audio, exploration, story polish and progression remain excluded. Never commit credentials, .env.local, .uat.json, access tokens or database passwords.

## hCaptcha setup
`NEXT_PUBLIC_HCAPTCHA_SITE_KEY` is public; `.env.example` contains the NOVA ZENITH site key. Set it together with the two public Supabase variables in your deployment environment **before building**, then redeploy. The hCaptcha secret remains configured only in Supabase Authentication → Bot and Abuse Protection.

Configure the frontend hostname in the hCaptcha site's domain allowlist. For local human verification use a supported development hostname (hCaptcha does not support localhost/127.0.0.1 as supplied hostnames; see https://docs.hcaptcha.com/). Do not substitute a test key in production. Existing sessions do not need to solve hCaptcha again on refresh. Tokens are held only in memory, cleared after each attempt/expiry/error, and never logged or persisted. A failed request requires a fresh verification; signup is not automatically retried with a spent token.

Browser regression tests replace the hCaptcha API and Auth HTTP responses inside isolated Playwright contexts. They exercise the real app/SDK request shape without solving a real CAPTCHA or creating users. Human verification against the deployed frontend remains a separate UAT step.
