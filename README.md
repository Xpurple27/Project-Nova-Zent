# NOVA ZENITH

Web-based cooperative turn-based mathematical RPG for 1–4 players, designed for mobile and desktop.

## Project status

This repository has been initialized with the canonical project name **NOVA ZENITH**. Application implementation, database migrations, builds, and runtime tests have not started.

The MVP architecture blueprint is available in the originating project conversation. The detailed implementation prompts for stages 1–5 and the two art references have been attached to that conversation, but have not yet been read successfully because its workspace execution environment is unavailable. They must be inspected and reconciled with the blueprint before implementing those stages. Do not infer their contents from their filenames or claim that they have been imported into this repository.

## MVP

- 1–4 players in a private room.
- Four unique classes: Warrior, Mage, Thief, and Healer.
- Simultaneous action selection with mathematical challenges integrated into combat.
- One vertical slice: village, exploration, Shadow Hound, Corrupted Shaman, Ancient Ruins, Abyss Guardian, and ending.
- Target run duration: 15–25 minutes, subject to balancing and playtesting.

## Planned stack

- Next.js, TypeScript, and Tailwind CSS.
- Phaser for exploration and in-engine presentation.
- Supabase Auth, PostgreSQL, and Realtime.
- Vercel hosting.

## Authoritative gameplay boundary

The architecture blueprint specifies server-authoritative multiplayer, transactional and idempotent resolution, server deadlines, reconnect support, and ephemeral exploration movement. Browsers send intent; they do not determine authoritative damage, correctness, boss decisions, or outcomes.

The detailed offline combat-engine prompt must be reconciled with this boundary before implementation. It must not silently introduce a competing source of gameplay truth.

## Implementation stages awaiting prompt review

1. Project skeleton.
2. Offline combat engine.
3. Boss engine.
4. Combat UI.
5. Lobby.

The headings above are the stage names provided by the project owner, not a substitute for their attached requirements. No stage is marked complete.

## Credentials

Never commit service-role keys, secret keys, access tokens, database passwords, or local environment files. Frontend configuration may use a Supabase publishable key. Privileged credentials must remain outside the browser and repository.

No credentials are included in this repository initialization.
