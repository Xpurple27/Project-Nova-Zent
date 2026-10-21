# NOVA ZENITH original audio manifest
All MVP sounds are original procedural Web Audio synthesis in src/game/audio/model.ts and engine.ts, dedicated CC0. No external music/game recordings or downloadable sound packs are included. They are restrained placeholder motifs, not finished orchestral music.

One AudioProvider owns one GameAudio context. The user explicitly enables playback in Audio settings; a rejected resume never affects gameplay. Master/music/SFX/mute are clamped and stored under nz.audio.v1. Muted is the default. No secret, identity or cloud setting is stored here.

Motifs: lobby, village, exploration, ruins, normal combat, boss combat, victory, defeat. Notes fade at the oscillator gain envelope; unchanged music states do not restart. State changes retain already-playing ≤0.9s tails and smoothly ramp bus gains. Simple motifs also provide scene ambience (no separate nature recording layer in MVP).

SFX: every class skill ID, boss action ID, correct/failed/answer lock, heal/block/revive, Barrier/break, Rage, Core, unique low-frequency Heavy/Cataclysm cue, victory/defeat. All are mapped from server event sequence; duplicated/lower sequences are consumed once. No sound is authoritative and audio does not delay the backend.

Maximum 12 simultaneous oscillator voices. A hidden tab stops music scheduling and active voices; incoming event sequence is consumed silently, never queued for playback on return. One context is closed and listeners/timers are removed on provider teardown. Future file-backed assets can replace synthesis behind this centralized boundary; failed audio must remain nonfatal.
