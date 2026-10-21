# NOVA ZENITH MVP release checklist

Decision and evidence: [EXTRA_HIGH_3_FINAL_AUDIT.md](EXTRA_HIGH_3_FINAL_AUDIT.md). A checked automated/emulated item does not substitute for a human/device item.

## Deployment and backend
- [x] Confirm GitHub repository and intended Vercel project `novazen-rpg` / Supabase project `bbeymvooubwsbrkeukuu`.
- [x] Configure production `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` using the exact frontend names. Existing unprefixed names are insufficient for a browser bundle.
- [ ] Confirm the final audit commit is READY on `https://novazen-rpg.vercel.app` and the guest form is visible after a fresh load.
- [x] Production build rejects missing public configuration or a non-publishable browser key.
- [x] Compare 13 repository migrations with connected database history; keep private grading/backend RPCs service-only.
- [x] Confirm watchdog/cleanup jobs are active; resolver progresses independently of the coordinator.
- [x] Verify 120 reviewed ACTIVE production questions and retired pilot items; direct client bank access denied.
- [ ] For any new backend, apply migrations on that safe environment, configure its watchdog URL, privately export/import the production bank, deploy Edge and rerun SQL suites. Never reset production.
- [ ] Before public invitation, verify hCaptcha hostname configuration and complete one real human anonymous sign-in. No automated CAPTCHA acceptance is claimed.

## Automated quality
- [x] Install pinned dependencies/lockfile; production dependency audit has no reported vulnerability.
- [x] Typecheck, zero-warning lint, all domain/authoritative regressions and generated Edge drift check.
- [x] Connected SQL lobby/combat/motion authorization suites with rollback.
- [x] Browser layouts 320/360/375/390/412px and desktop; long question options remain touch-sized.
- [x] Chromium touch injection, portrait/landscape recovery and missing-sprite fallback.
- [x] Verify ending/leave allow another expedition without deleting the Auth identity.
- [x] Recheck safe API projections and public build for private keys/production answers.
- [ ] Record and review the full fresh-guest deployed 1P and 4P acceptance runs below.

## Human smoke test — Android Chrome and desktop Chrome
Use a fresh Android Chrome tab plus desktop normal/incognito or additional devices. Record device/browser versions, deployment commit, room code, start/end time, and any console/network errors. Run once solo and once with four unique classes.

1. Open the production URL in a fresh tab. Complete hCaptcha; Create or Join must become available. Refresh once: identity should remain in the same tab without a second challenge. Do not clear storage mid-run.
2. Create a room; join from the other sessions, choose Warrior/Mage/Thief/Healer, Ready and Start. All screens must leave the lobby for the same opening. Test unanimous skip once; no single vote may skip a four-person opening.
3. Walk using phone direction controls / desktop WASD. Check teammates, collisions, objective, camera and reachable interaction control. Rotate the phone and return to portrait. Gather at each exit; one member alone must not change the scene.
4. Defeat Hound and Shaman, then return to exploration. Verify full HP/resource40/Ultimate carry≤50 recovery, and that refresh cannot respawn an already completed encounter.
5. Enter Ancient Ruins/chamber and the Guardian battle. Verify shared round/HP/resources/status. Have one player deliberately miss a main-answer deadline, try a late answer, and briefly disconnect another player for 5–10 seconds. Reconnect must restore the same turn/question deadline/HP; repeat one refresh during a reaction.
6. Exercise Phase2/3, Barrier Rune, Rage100, Core and Cataclysm where the fight permits. Heavy must warn before damage. Only the targeted player receives a defensive reaction; AoE must not request four reactions.
7. Reach one shared outcome and ending. Confirm all authoritative values match. Return home and create a new expedition; previous encounter state must not trap the player. Also perform a separate defeat/back smoke test.
8. Enable audio through a tap; adjust volume/mute, background the tab briefly, return and check no historical SFX burst. Test silent play and reduced motion.
9. Record completion duration and boss rounds. Check Easy/Medium/Hard reading/solving burden with actual students; do not use automated instant-answer times as educational calibration.

## Operations before broad release
- [ ] Review balance outliers for support-heavy/solo parties and decide a measured tuning pass; formulas were preserved in this audit.
- [ ] Review persistent rejected-request/IP protection for broad traffic; Edge per-isolate budget is only a basic guard.
- [ ] Agree retention for stale lobby/session history; existing receipt/worker cleanup does not archive all game history.
- [ ] Verify an operator can observe resolver failures and recover via snapshot/resolver retry; no manual HP/state edit should be normal operation.
- [ ] Optional but recommended: physical iOS/Safari and an additional mobile network smoke test; document unavailable coverage explicitly.

No Stage2, progression, equipment or economy work is part of this checklist.
