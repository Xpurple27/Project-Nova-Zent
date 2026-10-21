# NOVA ZENITH — visual identity and presentation pass

Baseline: 290f0c859fcf24d686a0620f82eb2ccc6756c43e. Scope is presentation only. No changes to damage, healing, grading, boss decisions, server deadlines, SQL, canonical snapshots, membership, encounter progression or story completion/skip rules.

## Assets and selection

`game/animation/identity.ts` centralizes four class epithets, roles, full-body artwork and portraits, plus Guardian art. `HeroArt` is reused by lobby cards, occupied slots, landing cards and dialogue. Card actions still send the existing SELECT_CLASS intent. Ready/class locking/start remain unchanged. Missing illustration falls back to the corresponding humanoid class sprite. Nine optimized WebP files total <1MiB; original prompts/provenance are in art/IDENTITY_PROMPTS.json. There are no external game-art downloads.

`ActorSprite` retains the semantic animation controller, event sequence fencing and HP-driven KO/revive. Illustrations cover the proxy sheet when available; the original sheet remains a fallback. The active hero is staged opposite the enemy during its action/reaction. Semantic CSS motion does not apply gameplay mutations. World proxies preserve row names, frame sizes, footpoint, speed and directions, with stronger class-specific gear silhouettes. These motion proxies are not final production hand-drawn sprite sheets.

## Readable combat

`game/presentation/combat.ts` groups each accepted atomic event batch into cast/result beats. ACTION_RESOLVED starts a player action; subsequent exact damage/heal/shield/effect events remain attributed to that cast. Defensive results group BLOCKED/INCOMING_DAMAGE/HEAL and the final REACTION_RESOLVED tier. No amount or grade is recalculated. The current protocol lacks a structured grade on ACTION_RESOLVED, so the adapter reads the existing final `— PERFECT|SUCCESS|FAILED` enum from its server-authored text. This localized presentation dependency is tested; a future protocol change must update it explicitly.

`useCombatPlayback` replaces raw180ms event flashes in both online and offline adapters. Cast focus precedes impact by260ms, with total basic900ms, special1100ms, reaction1200ms. Cosmetic backlog is capped at6 beats; deep queues compress to750ms/beat and other beats cap at1200ms. History retains the latest8 accepted beats, and the server chronicle remains available. Hidden tabs discard playback and rebase to a fresh snapshot; no historical sound storm. Duplicate event sequences cannot enqueue again. A missing-event gap still uses the existing EventCursor/snapshot recovery contract.

Snapshots update HP/resources immediately. Input overlays and server deadlines are never delayed for animation. Thus an animation may show the preceding action while a live input is already open; the input retains priority. Numbers fade after1.1s. A read-only final-action recap remains below the ending scene, so the server can enter the ending immediately without hiding the killing formula. The banner and expandable action history keep actor, target, skill, exact results and performance readable afterward. Failed Calculation explicitly means weakened output, not zero damage. Boss/party target highlights and class-specific reaction animation make attribution visible. Guardian phase overlays, Barrier envelope, Heavy warning and Core remain driven solely by authoritative state.

## World and cinematics

`exploration/scenery.ts` draws original geometric landmarks over the same map/obstacle/zone data. No new collision or transition rule exists. One Phaser scene owns scenery objects; shutdown destroys them with the scene. Effect rings have bounded tweens and destroy callbacks.

`story/presentation.ts` is a clock-seekable visual staging model. It reads existing story ID and elapsed server time. Opening shows an intact obelisk, crimson fracture, the formula keeper being carried east, class introductions and the party's pursuit. Boss entrance uses the standing Guardian illustration rising from a dark silhouette. Ending fades the fallen sentinel and reveals seven remaining seal echoes. Portrait dialogue and concise captions explain the existing mission. Canonical story definitions/IDs/durations remain unchanged:48s/4s/4s/12s/14s. No ACK or animation callback advances the campaign.

Reconnect reconstructs current staging/camera from elapsed time; old SFX are not replayed. Party sprites during a cutscene use this presentation stage rather than remote movement packets. After completion/skip, camera follow, opacity and safe-checkpoint movement presentation restore. The actual player position and durable progression are never rewritten by staging.

## Verification

Results and limitations are recorded below after the final suite. Browser API fixtures test UI integration and do not replace live database/hCaptcha/device UAT. Existing ExtraHigh3 release blockers are not closed by this visual pass.

Final local verification:86/86 Node tests and32/32 Playwright tests passed; typecheck, ESLint (zero warnings), generated Edge drift check, git diff whitespace check and production build passed. Tested widths320/360/375/390/412/1280px. Added browser coverage includes real hero cards, missing artwork, original lobby intents, four isolated boss-mechanic views, successful dodge, duplicate snapshot suppression, refresh HP and final-hit recap during the ending. Browser Auth/API fixtures are confined to tests. Physical-device, human hCaptcha and a fresh live full4P campaign were not tested in this visual pass. See VISUAL_OVERHAUL_REPORT.md for the eleven-part report and remaining asset limitations.
