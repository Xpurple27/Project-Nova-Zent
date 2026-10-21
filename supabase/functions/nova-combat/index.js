// supabase/functions/nova-combat/entry.ts
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

// src/game/config/index.ts
var GAME = {
  name: "NOVA ZENITH",
  version: "nz.v1",
  ruleset: "nz.v1.0",
  resourceMax: 100,
  ultimateMax: 100,
  resourceStart: 40,
  ultimateCarryCap: 50,
  planningMs: 12e3,
  minimumPlanningMs: 3e3,
  reconnectGraceMs: 6e4,
  heartbeatMs: 1e4,
  pollMs: 3e3,
  basicGain: 20,
  autoBasicGain: 10,
  ultimateGainCap: 30,
  timers: { EASY: 12e3, MEDIUM: 18e3, HARD: 25e3 },
  performance: { PERFECT: 1.25, SUCCESS: 1, FAILED: 0.4 },
  combo: [0, 0, 0.05, 0.1, 0.15],
  blessingTimeMs: 3e3
};
var CHARACTERS = {
  WARRIOR: { name: "Warrior", maxHp: 650, speed: 55, resistance: 0.2, resourceType: "GUARD", basic: "warrior.slash", color: "#edb66b", symbol: "\u25C6" },
  MAGE: { name: "Mage", maxHp: 400, speed: 70, resistance: 0, resourceType: "MANA", basic: "mage.arcane_bolt", color: "#af9aff", symbol: "\u2726" },
  THIEF: { name: "Thief", maxHp: 450, speed: 100, resistance: 0.05, resourceType: "FOCUS", basic: "thief.quick_strike", color: "#65dac0", symbol: "\u2756" },
  HEALER: { name: "Healer", maxHp: 500, speed: 60, resistance: 0.1, resourceType: "FAITH", basic: "healer.holy_bolt", color: "#99d8f3", symbol: "\u2727" }
};
function skill(classId, id, name, type, target, cost, base, difficulty, category, priority, description, ultimate = false) {
  return { classId, id, name, type, target, cost, base, difficulty, category, priority, description, ultimate };
}
var SKILLS = [
  skill("WARRIOR", "warrior.slash", "Slash", "OFFENSE", "ENEMY", 0, 90, "EASY", 50, 40, "Generate 20 Guard."),
  skill("WARRIOR", "warrior.shield_wall", "Shield Wall", "DEFENSE", "PARTY", 30, 0, "MEDIUM", 10, 10, "Party reduction 15\u201350% this round."),
  skill("WARRIOR", "warrior.provoke", "Provoke", "DEFENSE", "MAIN_ENEMY", 20, 0, "MEDIUM", 10, 20, "Draw the next single-target attack."),
  skill("WARRIOR", "warrior.last_bastion", "Last Bastion", "DEFENSE", "SELF", 0, 0, "MEDIUM", 10, 5, "Redirect, protect party and self.", true),
  skill("MAGE", "mage.arcane_bolt", "Arcane Bolt", "OFFENSE", "ENEMY", 0, 110, "EASY", 50, 40, "Generate 20 Mana."),
  skill("MAGE", "mage.overcharge", "Overcharge", "OFFENSE", "ENEMY", 40, 220, "HARD", 50, 30, "High-risk arcane burst."),
  skill("MAGE", "mage.frost_seal", "Frost Seal", "DEBUFF", "MAIN_ENEMY", 30, 70, "MEDIUM", 30, 20, "Weaken the next damaging enemy action."),
  skill("MAGE", "mage.meteor", "Meteor", "OFFENSE", "ENEMY", 0, 450, "HARD", 50, 10, "Massive single-target damage.", true),
  skill("THIEF", "thief.quick_strike", "Quick Strike", "OFFENSE", "ENEMY", 0, 80, "EASY", 50, 40, "Perfect adds \xD71.35; generate 20 Focus."),
  skill("THIEF", "thief.focus_stance", "Focus", "BUFF", "SELF", 20, 0, "MEDIUM", 20, 20, "Empower next hit and extend one reaction."),
  skill("THIEF", "thief.expose_weakness", "Expose Weakness", "DEBUFF", "MAIN_ENEMY", 30, 40, "MEDIUM", 30, 10, "Expose before subsequent party attacks."),
  skill("THIEF", "thief.shadow_execution", "Shadow Execution", "OFFENSE", "ENEMY", 0, 250, "HARD", 50, 20, "Finisher scales up to \xD71.8.", true),
  skill("HEALER", "healer.holy_bolt", "Holy Bolt", "OFFENSE", "ENEMY", 0, 55, "EASY", 50, 40, "Generate 20 Faith."),
  skill("HEALER", "healer.healing_wave", "Healing Wave", "HEAL", "PARTY", 35, 65, "MEDIUM", 40, 10, "Heal each living ally."),
  skill("HEALER", "healer.blessing", "Blessing", "BUFF", "PARTY", 30, 0, "MEDIUM", 20, 10, "Boost output; next round questions +3s."),
  skill("HEALER", "healer.divine_recovery", "Divine Recovery", "HEAL", "PARTY", 0, 180, "MEDIUM", 40, 5, "Heal, cleanse one effect, revive one ally.", true)
];
var SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
var BOSS = {
  baseHp: 2e3,
  hpScale: 0.6,
  damageScale: [0, 0.85, 0.92, 0.96, 1],
  phaseDamage: [0, 1, 1.15, 1.25],
  phaseRage: [0, 20, 25, 30],
  threat: { WARRIOR: 45, HEALER: 25, MAGE: 17, THIEF: 13 },
  claw: 110,
  spear: 180,
  wave: 60,
  cataclysm: 110,
  spearCooldownRounds: 3,
  barrierBase: 500,
  barrierPerPlayer: 150,
  coreBase: 350,
  corePerPlayer: 100,
  normalHeavyLockout: 2
};

// src/game/core/math.ts
function finite(n) {
  if (!Number.isFinite(n)) throw new Error("NON_FINITE_NUMBER");
  return n;
}
function roundHalfUp(n) {
  finite(n);
  if (n < 0 || n > Number.MAX_SAFE_INTEGER) throw new Error("UNSAFE_EFFECT");
  const whole = Math.floor(n);
  const result = whole + (n - whole >= 0.5 ? 1 : 0);
  if (!Number.isSafeInteger(result)) throw new Error("UNSAFE_EFFECT");
  return result;
}
function clamp(n, min, max) {
  finite(n);
  finite(min);
  finite(max);
  if (min > max) throw new Error("INVALID_BOUNDS");
  return Math.min(max, Math.max(min, n));
}
var clampHp = (hp, maxHp) => roundHalfUp(clamp(hp, 0, maxHp));
var clampResource = (n) => roundHalfUp(clamp(n, 0, GAME.resourceMax));
var performanceMultiplier = (p) => GAME.performance[p];
function gradeAnswer(correct, elapsedMs, availableMs) {
  finite(availableMs);
  finite(elapsedMs);
  if (availableMs <= 0 || elapsedMs < 0) throw new Error("INVALID_TIMER");
  return correct && elapsedMs < availableMs ? elapsedMs <= availableMs * 0.5 ? "PERFECT" : "SUCCESS" : "FAILED";
}
function weightedIndex(weights, random2) {
  if (!Number.isFinite(random2) || !weights.length || weights.some((w) => w < 0 || !Number.isFinite(w)) || random2 < 0 || random2 >= 1) throw new Error("INVALID_WEIGHTS");
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new Error("NO_TARGET");
  let cursor = random2 * sum;
  for (let i = 0; i < weights.length; i++) {
    cursor -= weights[i];
    if (cursor < 0) return i;
  }
  return weights.length - 1;
}

// src/game/combat/effects.ts
function activeEffect(s, type, target) {
  return s.effects.find((e) => e.type === type && e.target === target && e.from <= s.turn && e.through >= s.turn);
}
var magnitude = (s, type, target) => activeEffect(s, type, target)?.magnitude ?? 0;
function putEffect(s, type, source, target, amount, through, from = s.turn, negative = false, cleanseable = false) {
  const old = s.effects.find((e) => e.type === type && e.target === target);
  if (old) {
    old.magnitude = type === "PROVOKE" ? old.magnitude === 1 || amount === 1 ? 1 : 4 : Math.max(old.magnitude, amount);
    old.through = Math.max(old.through, through);
    old.from = Math.min(old.from, from);
    return;
  }
  s.effects.push({ id: "effect-" + s.effectSeq++, type, source, target, magnitude: amount, from, through, negative, cleanseable });
}
function consume(s, type, target) {
  const e = activeEffect(s, type, target);
  if (e) s.effects = s.effects.filter((x) => x.id !== e.id);
}
function cleanseOne(s, target) {
  const candidates = s.effects.filter((e) => e.target === target && e.negative && e.cleanseable && e.from <= s.turn && e.through >= s.turn);
  candidates.sort((a, b) => b.magnitude - a.magnitude || b.through - a.through || a.id.localeCompare(b.id));
  if (candidates[0]) s.effects = s.effects.filter((e) => e.id !== candidates[0].id);
}
function expireEffects(s) {
  s.effects = s.effects.filter((e) => e.through > s.turn);
}
var outputModifier = (s, id) => (1 + magnitude(s, "BLESSING", "party")) * (1 - magnitude(s, "ROAR", id));

// src/game/boss/engine.ts
var bossHp = (n) => {
  if (!Number.isInteger(n) || n < 1 || n > 4) throw new Error("INVALID_PARTY_SIZE");
  return roundHalfUp(BOSS.baseHp * (1 + BOSS.hpScale * (n - 1)));
};
var coreHp = (n) => BOSS.coreBase + BOSS.corePerPlayer * (n - 1);
var barrierHp = (n) => BOSS.barrierBase + BOSS.barrierPerPlayer * (n - 1);
var runeRequired = (n) => Math.max(1, Math.ceil(n * 0.75));
function createBoss(n) {
  const maxHp = bossHp(n);
  return { id: "boss", name: "Abyss Guardian", hp: maxHp, maxHp, phase: 1, rage: 0, shield: 0, cycle: 0, lastSpearRound: -100, lastUtility: null, barrierUsed: false, heavy: "NONE", core: null, normalSinceHeavy: 2 };
}
function event(s, type, text, amount, actorId, targetId) {
  s.events.push({ seq: s.nextSeq++, turn: s.turn, type, text, amount, actorId, targetId });
}
function random(s) {
  s.seed = Math.imul(s.seed, 1664525) + 1013904223 >>> 0;
  return s.seed / 4294967296;
}
function updatePhase(s) {
  const ratio = s.boss.hp / s.boss.maxHp;
  const next = ratio < 0.25 ? 3 : ratio < 0.6 ? 2 : 1;
  while (s.boss.phase < next) {
    s.boss.phase = s.boss.phase + 1;
    event(s, "BOSS_PHASE_CHANGED", s.boss.phase === 2 ? "ENRAGED \u2014 Phase 2" : "DESPERATION \u2014 Phase 3");
  }
}
function selectTarget(s, rng = () => random(s)) {
  const living = s.party.filter((p) => p.hp > 0 && p.active !== false);
  if (!living.length) throw new Error("NO_TARGET");
  const warrior = living.find((p) => p.classId === "WARRIOR");
  const provoke = warrior ? magnitude(s, "PROVOKE", warrior.id) : 0;
  const redirect = warrior ? magnitude(s, "REDIRECT", warrior.id) : 0;
  if (warrior && (redirect > 0 || provoke === 1)) {
    consume(s, "PROVOKE", warrior.id);
    return warrior.id;
  }
  const weights = living.map((p) => BOSS.threat[p.classId] * (p.id === warrior?.id && provoke === 4 ? 4 : 1));
  if (warrior && provoke > 0) consume(s, "PROVOKE", warrior.id);
  return living[weightedIndex(weights, rng())].id;
}
function utility(s) {
  const roar = s.party.some((p) => p.hp > 0 && magnitude(s, "ROAR", p.id) > 0);
  const armor = magnitude(s, "ARMOR", "boss") > 0;
  if (!roar && !armor) return s.boss.lastUtility === "ROAR" ? "ARMOR" : "ROAR";
  return !roar ? "ROAR" : !armor ? "ARMOR" : "CLAW";
}
function selectBossAction(s, rng = () => random(s)) {
  const b = s.boss;
  if (b.heavy === "CORE_EXPOSED") return { skill: "CATACLYSM" };
  if (b.rage >= 100 && b.normalSinceHeavy >= BOSS.normalHeavyLockout) return { skill: "CHARGE" };
  const slot = b.cycle % 5;
  let skill2;
  if (slot === 0) skill2 = "CLAW";
  else if (slot === 1) skill2 = utility(s);
  else if (slot === 2) skill2 = "WAVE";
  else if (slot === 3) skill2 = s.turn - b.lastSpearRound >= BOSS.spearCooldownRounds ? "SPEAR" : "CLAW";
  else skill2 = !b.barrierUsed && b.phase >= 2 ? "BARRIER" : utility(s);
  return skill2 === "CLAW" || skill2 === "SPEAR" ? { skill: skill2, targetId: selectTarget(s, rng) } : { skill: skill2 };
}
function incomingDamage(s, p, base, reaction = null, heavy = 1) {
  const drs = { WARRIOR: [0.8, 0.5, 0.2], THIEF: [1, 0.5, 0], MAGE: [0.7, 0.4, 0], HEALER: [0.6, 0.35, 0] };
  const idx = reaction === "PERFECT" ? 0 : reaction === "SUCCESS" ? 1 : 2;
  const reactionDR = reaction ? drs[p.classId][idx] : 0;
  const partyDR = Math.max(magnitude(s, "SHIELD_WALL", "party"), magnitude(s, "BASTION_PARTY", "party"));
  return roundHalfUp(base * BOSS.damageScale[s.partySize] * BOSS.phaseDamage[s.boss.phase] * (1 - magnitude(s, "FROST", "boss")) * heavy * (1 - partyDR) * (1 - p.resistance) * (1 - magnitude(s, "BASTION_PERSONAL", p.id)) * (1 - reactionDR));
}
function hurt(s, p, damage) {
  p.hp = Math.max(0, p.hp - damage);
  event(s, "INCOMING_DAMAGE", p.name + " takes " + damage, damage, "boss", p.id);
  if (p.hp === 0) {
    s.effects = s.effects.filter((e) => e.target !== p.id);
    event(s, "PLAYER_KO", p.name + " is KO", void 0, void 0, p.id);
  }
}
function gainUltimate(s, p, amount) {
  const already = s.gainThisRound[p.id] ?? 0;
  const add = Math.min(amount, GAME.ultimateGainCap - already);
  p.ultimate = clamp(p.ultimate + Math.max(0, add), 0, 100);
  s.gainThisRound[p.id] = already + Math.max(0, add);
}
function settleBoss(s, intent) {
  const normal = intent.skill !== "CHARGE" && intent.skill !== "CATACLYSM";
  if (normal) {
    s.boss.cycle++;
    s.boss.normalSinceHeavy++;
    s.boss.rage = clamp(s.boss.rage + BOSS.phaseRage[s.boss.phase], 0, 100);
  }
  if (s.boss.rage >= 100 && s.boss.heavy === "NONE") s.boss.heavy = "PENDING_CHARGE";
  event(s, "RAGE_CHANGED", "Rage " + s.boss.rage, s.boss.rage);
}
function applyBossIntent(s, intent) {
  const b = s.boss;
  if (intent.skill === "CLAW" || intent.skill === "SPEAR") {
    if (intent.skill === "SPEAR") b.lastSpearRound = s.turn;
    s.pending = { kind: "REACTION", intent, actorId: intent.targetId };
    s.phase = "DEFENSIVE_REACTION";
    return;
  }
  if (intent.skill === "ROAR") {
    for (const p of s.party.filter((p2) => p2.hp > 0 && p2.active !== false)) putEffect(s, "ROAR", "boss", p.id, 0.15, s.turn + 2, s.turn + 1, true, true);
    b.lastUtility = "ROAR";
    event(s, "EFFECT_APPLIED", "Dark Roar \u2014 output \u221215% for two rounds");
  }
  if (intent.skill === "ARMOR") {
    putEffect(s, "ARMOR", "boss", "boss", 0.3, s.turn + 2, s.turn + 1);
    b.lastUtility = "ARMOR";
    event(s, "EFFECT_APPLIED", "Demon Armor \u2014 damage received \u221230%");
  }
  if (intent.skill === "BARRIER") {
    b.shield = barrierHp(s.partySize);
    b.barrierUsed = true;
    const ids = s.party.filter((p) => p.hp > 0 && p.active !== false).map((p) => p.id);
    s.pending = { kind: "RUNE", actorIds: ids, required: runeRequired(ids.length) };
    s.phase = "MATH_CHALLENGE";
    event(s, "BARRIER_CREATED", "Abyss Barrier \u2014 solve the team rune", b.shield);
    return;
  }
  if (intent.skill === "CHARGE") {
    const hp = coreHp(s.partySize);
    b.core = { id: "core", hp, maxHp: hp };
    b.heavy = "CORE_EXPOSED";
    event(s, "HEAVY_TELEGRAPH", "INFERNAL CATACLYSM \u2014 NEXT BOSS TURN");
    event(s, "INFERNAL_CORE_SPAWNED", "Destroy the Infernal Core or prepare protection", hp);
  }
  if (intent.skill === "WAVE" || intent.skill === "CATACLYSM") {
    const heavy = intent.skill === "CATACLYSM" && b.core?.hp === 0 ? 0.4 : 1;
    for (const p of s.party.filter((p2) => p2.hp > 0 && p2.active !== false)) hurt(s, p, incomingDamage(s, p, intent.skill === "WAVE" ? BOSS.wave : BOSS.cataclysm, null, heavy));
    consume(s, "FROST", "boss");
    if (intent.skill === "CATACLYSM") {
      b.rage = 0;
      b.heavy = "NONE";
      b.core = null;
      b.normalSinceHeavy = 0;
      event(s, "CATACLYSM_RESOLVED", "Infernal Cataclysm resolved");
    }
  }
  settleBoss(s, intent);
}

// src/game/combat/availability.ts
function unavailableReason(p, skill2) {
  if (p.hp <= 0) return "Character is KO";
  if (p.active === false) return "Character is inactive";
  if (p.classId !== skill2.classId) return "Wrong class";
  if (skill2.ultimate && p.ultimate < 100) return "Requires 100 Ultimate";
  if (!skill2.ultimate && p.resource < skill2.cost) return "Requires " + skill2.cost + " " + CHARACTERS[p.classId].resourceType;
  return null;
}

// src/game/combat/engine.ts
function createCharacter(classId, seat = 0) {
  const c = CHARACTERS[classId];
  return { id: classId.toLowerCase(), name: c.name, classId, maxHp: c.maxHp, hp: c.maxHp, speed: c.speed, resistance: c.resistance, resource: GAME.resourceStart, ultimate: 0, seat };
}
function createCombat(classes = ["WARRIOR", "MAGE", "THIEF", "HEALER"], seed = 12345, dummy = false) {
  if (classes.length < 1 || classes.length > 4 || new Set(classes).size !== classes.length) throw new Error("INVALID_ROSTER");
  const party = classes.map(createCharacter);
  const boss = createBoss(party.length);
  const basics = party.reduce((n, p) => n + SKILL_BY_ID[CHARACTERS[p.classId].basic].base, 0);
  return { mode: "OFFLINE_QA", turn: 1, phase: "COMBAT_PLANNING", party, boss, partySize: party.length, resonance: boss.maxHp / (10 * basics), seed: seed >>> 0, effects: [], events: [], nextSeq: 1, effectSeq: 1, combo: 0, roundSuccess: false, roundBossHpStart: boss.hp, rageBonus: 0, gainThisRound: {}, pending: null, dummy };
}
var isPartyWiped = (s) => s.party.filter((p) => p.active !== false).every((p) => p.hp <= 0);
function validateAction(s, a) {
  const p = s.party.find((x) => x.id === a.actorId), k = SKILL_BY_ID[a.skillId];
  if (!p || !k) throw new Error("INVALID_ACTION");
  const reason = unavailableReason(p, k);
  if (reason) throw new Error(reason);
  if (!["PERFECT", "SUCCESS", "FAILED"].includes(a.performance)) throw new Error("INVALID_PERFORMANCE");
  if (a.origin === "AUTO" && (a.skillId !== CHARACTERS[p.classId].basic || a.performance !== "FAILED")) throw new Error("INVALID_AUTO_ACTION");
  if (k.target === "ENEMY" && (a.targetId !== "boss" && !(a.targetId === "core" && s.boss.core && s.boss.core.hp > 0))) throw new Error("INVALID_TARGET");
  if (k.target === "MAIN_ENEMY" && a.targetId !== "boss") throw new Error("INVALID_TARGET");
  if (a.reviveTargetId && k.id !== "healer.divine_recovery") throw new Error("INVALID_REVIVE_SKILL");
  if (a.reviveTargetId && !s.party.some((x) => x.id === a.reviveTargetId && x.hp === 0)) throw new Error("INVALID_REVIVE_TARGET");
}
function sortActions(s, actions) {
  return [...actions].sort((a, b) => {
    const x = SKILL_BY_ID[a.skillId], y = SKILL_BY_ID[b.skillId];
    const p = s.party.find((p2) => p2.id === a.actorId), q = s.party.find((p2) => p2.id === b.actorId);
    return x.category - y.category || x.priority - y.priority || q.speed - p.speed || p.seat - q.seat || a.actorId.localeCompare(b.actorId);
  });
}
var tier = (p, perfect, success, failed) => p === "PERFECT" ? perfect : p === "SUCCESS" ? success : failed;
function heal(s, p, n, source) {
  if (p.hp <= 0) return 0;
  const old = p.hp;
  p.hp = clampHp(p.hp + roundHalfUp(n), p.maxHp);
  event(s, "HEAL", p.name + " recovers " + (p.hp - old), p.hp - old, source, p.id);
  return p.hp - old;
}
function hit(s, a, p, k) {
  const target = a.targetId === "core" && s.boss.core && s.boss.core.hp > 0 ? "core" : "boss";
  const hp = target === "core" ? s.boss.core.hp : s.boss.hp, max = target === "core" ? s.boss.core.maxHp : s.boss.maxHp;
  let special = 1;
  if (k.id === "thief.quick_strike" && a.performance === "PERFECT") {
    special = 1.35;
    event(s, "CRITICAL_HIT", "CRITICAL \u2014 Quick Strike \xD71.35", void 0, p.id, target);
  }
  if (k.id === "thief.shadow_execution") special = Math.min(1.8, 2 - hp / max);
  const focused = magnitude(s, "FOCUS_DAMAGE", p.id);
  const damage = roundHalfUp(k.base * performanceMultiplier(a.performance) * s.resonance * outputModifier(s, p.id) * (1 + focused) * (1 + s.combo) * special * (target === "boss" ? 1 + magnitude(s, "EXPOSE", "boss") : 1) * (target === "boss" && s.boss.phase === 3 ? 1.15 : 1) * (target === "boss" ? 1 - magnitude(s, "ARMOR", "boss") : 1));
  if (focused) consume(s, "FOCUS_DAMAGE", p.id);
  if (target === "core") {
    s.boss.core.hp = Math.max(0, hp - damage);
    event(s, "DAMAGE", "Infernal Core takes " + damage, damage, p.id, "core");
    if (s.boss.core.hp === 0) event(s, "CORE_DESTROYED", "Infernal Core destroyed \u2014 Cataclysm reduced to 40%");
  } else {
    let remaining = damage;
    const shieldDamage = Math.min(s.boss.shield, remaining);
    if (shieldDamage) {
      s.boss.shield -= shieldDamage;
      remaining -= shieldDamage;
      event(s, "SHIELD_DAMAGE", "Barrier absorbs " + shieldDamage, shieldDamage, p.id, "boss");
      if (s.boss.shield === 0) {
        s.rageBonus = Math.min(10, s.rageBonus + 4);
        event(s, "BARRIER_BROKEN", "Abyss Barrier shattered");
      }
    }
    s.boss.hp = Math.max(0, s.boss.hp - remaining);
    event(s, "DAMAGE", p.name + " uses " + k.name + " \u2014 " + remaining + " damage", remaining, p.id, "boss");
    updatePhase(s);
  }
  return damage;
}
function execute(s, a) {
  const p = s.party.find((x) => x.id === a.actorId), k = SKILL_BY_ID[a.skillId];
  const r = s.turn;
  if (s.boss.hp <= 0 || p.hp <= 0 || p.active === false) return { ...a, damage: 0, healing: 0, canceled: true };
  if (k.ultimate) p.ultimate = 0;
  else p.resource = clampResource(p.resource - k.cost);
  event(s, "ACTION_RESOLVED", p.name + " \u2014 " + k.name + " \u2014 " + a.performance, void 0, p.id);
  let damage = 0, healing = 0;
  if (k.base > 0 && k.type !== "HEAL") damage = hit(s, a, p, k);
  const add = (type, target, n, through = r, from = r) => putEffect(s, type, p.id, target, n, through, from);
  switch (k.id) {
    case "warrior.shield_wall":
      add("SHIELD_WALL", "party", tier(a.performance, 0.5, 0.35, 0.15));
      break;
    case "warrior.provoke":
      add("PROVOKE", p.id, a.performance === "FAILED" ? 4 : 1, r + 2);
      break;
    case "warrior.last_bastion":
      add("BASTION_PARTY", "party", tier(a.performance, 0.5, 0.4, 0.2));
      add("BASTION_PERSONAL", p.id, tier(a.performance, 0.3, 0.25, 0.1));
      add("REDIRECT", p.id, 1);
      break;
    case "mage.frost_seal":
      add("FROST", "boss", tier(a.performance, 0.3, 0.2, 0.1), r + 1);
      break;
    case "thief.focus_stance":
      add("FOCUS_DAMAGE", p.id, tier(a.performance, 0.4, 0.25, 0.1), r + 2);
      add("FOCUS_TIME", p.id, tier(a.performance, 3e3, 2e3, 1e3), r + 2);
      break;
    case "thief.expose_weakness":
      add("EXPOSE", "boss", tier(a.performance, 0.3, 0.2, 0.08), r + 1);
      event(s, "EFFECT_APPLIED", "Boss is EXPOSED");
      break;
    case "healer.blessing":
      add("BLESSING", "party", tier(a.performance, 0.2, 0.15, 0.075), r + 1);
      add("BLESSING_TIME", "party", 3e3, r + 1, r + 1);
      break;
    case "healer.healing_wave":
    case "healer.divine_recovery":
      for (const ally of s.party.filter((x) => x.hp > 0)) healing += heal(s, ally, k.base * performanceMultiplier(a.performance) * outputModifier(s, p.id), p.id);
      if (k.ultimate) {
        for (const ally of s.party.filter((x) => x.hp > 0)) cleanseOne(s, ally.id);
        const ko = s.party.filter((x) => x.hp === 0).sort((a2, b) => a2.seat - b.seat);
        const revive = ko.find((x) => x.id === a.reviveTargetId) ?? ko[0];
        if (revive) {
          revive.hp = Math.max(1, roundHalfUp(revive.maxHp * 0.3));
          event(s, "PLAYER_REVIVED", revive.name + " revived", revive.hp, p.id, revive.id);
        }
      }
      break;
  }
  if (k.cost === 0 && !k.ultimate) p.resource = clampResource(p.resource + (a.origin === "AUTO" ? GAME.autoBasicGain : GAME.basicGain));
  if (!k.ultimate && a.origin !== "AUTO") gainUltimate(s, p, a.performance === "PERFECT" ? 20 : a.performance === "SUCCESS" ? 15 : 0);
  return { ...a, damage, healing };
}
function finishRound(s) {
  s.pending = null;
  expireEffects(s);
  if (s.boss.hp <= 0) {
    s.phase = "VICTORY";
    s.boss.core = null;
    event(s, "BOSS_DEFEATED", "VICTORY \u2014 the seal holds, for now.");
    event(s, "VICTORY", "The party defeated Abyss Guardian.");
    return;
  }
  if (isPartyWiped(s)) {
    s.phase = "DEFEAT";
    event(s, "PARTY_DEFEATED", "DEFEAT \u2014 regroup and try another formula.");
    event(s, "DEFEAT", "The expedition has fallen.");
    return;
  }
  s.turn++;
  s.phase = "COMBAT_PLANNING";
}
function resolvePlayerActions(input, requested) {
  if (input.phase !== "COMBAT_PLANNING") throw new Error("INVALID_PHASE");
  const s = structuredClone(input);
  s.gainThisRound = {};
  s.roundBossHpStart = s.boss.hp;
  s.rageBonus = 0;
  const living = s.party.filter((p) => p.hp > 0 && p.active !== false);
  if (new Set(requested.map((a) => a.actorId)).size !== requested.length) throw new Error("DUPLICATE_ACTION");
  for (const a of requested) validateAction(s, a);
  const actions = living.map((p) => requested.find((a) => a.actorId === p.id) ?? { actorId: p.id, skillId: CHARACTERS[p.classId].basic, targetId: "boss", performance: "FAILED", origin: "AUTO" });
  s.roundSuccess = actions.every((a) => a.performance !== "FAILED" && a.origin !== "AUTO");
  s.combo = s.roundSuccess ? GAME.combo[actions.length] ?? 0 : 0;
  if (s.combo) event(s, actions.length === 4 ? "TEAM_COMBO" : "COMBO", "COMBO \xD7" + actions.length + " \u2014 +" + Math.round(s.combo * 100) + "% damage");
  for (const a of sortActions(s, actions)) execute(s, a);
  if (s.roundSuccess && actions.length === 4) for (const p of living) gainUltimate(s, p, 5);
  if (s.boss.hp <= 0) {
    finishRound(s);
    return s;
  }
  if (s.dummy) {
    finishRound(s);
    return s;
  }
  if (s.boss.heavy === "NONE" || s.boss.heavy === "PENDING_CHARGE") {
    s.rageBonus = Math.min(10, s.rageBonus + (s.roundSuccess ? 3 : 0) + (s.roundBossHpStart - s.boss.hp >= s.boss.maxHp * 0.1 ? 3 : 0));
    s.boss.rage = Math.min(100, s.boss.rage + s.rageBonus);
  }
  s.phase = "BOSS_ACTION";
  return s;
}
function decideBoss(s, rng) {
  const intent = selectBossAction(s, rng);
  event(s, "BOSS_ACTION_SELECTED", "Abyss Guardian \u2014 " + intent.skill, void 0, "boss", intent.targetId);
  return intent;
}
function resolveReaction(input, performance, finish = true) {
  if (input.pending?.kind !== "REACTION") throw new Error("NO_PENDING_REACTION");
  const s = structuredClone(input), pending = s.pending;
  if (pending.kind !== "REACTION") throw new Error("INVALID_PENDING");
  const p = s.party.find((x) => x.id === pending.actorId);
  const base = pending.intent.skill === "SPEAR" ? BOSS.spear : BOSS.claw;
  const beforeReaction = incomingDamage(s, p, base);
  const damage = incomingDamage(s, p, base, performance);
  if (beforeReaction > damage) event(s, "BLOCKED", damage === 0 ? "DODGED \u2014 no incoming damage" : "BLOCKED " + (beforeReaction - damage), beforeReaction - damage, p.id, p.id);
  hurt(s, p, damage);
  consume(s, "FROST", "boss");
  consume(s, "FOCUS_TIME", p.id);
  if (p.hp > 0 && p.classId === "HEALER") heal(s, p, performance === "PERFECT" ? 40 : performance === "SUCCESS" ? 20 : 0, p.id);
  gainUltimate(s, p, performance === "PERFECT" ? 5 : performance === "SUCCESS" ? 3 : 0);
  event(s, "REACTION_RESOLVED", p.name + " reaction \u2014 " + performance, damage, p.id);
  settleBoss(s, pending.intent);
  s.pending = null;
  if (finish) finishRound(s);
  return s;
}
function resolveRune(input, results, finish = true) {
  if (input.pending?.kind !== "RUNE") throw new Error("NO_PENDING_RUNE");
  const s = structuredClone(input), pending = s.pending;
  if (pending.kind !== "RUNE") throw new Error("INVALID_PENDING");
  let correct = 0;
  for (const id of pending.actorIds) {
    if (results[id] && results[id] !== "FAILED") {
      correct++;
      gainUltimate(s, s.party.find((p) => p.id === id), 5);
    }
  }
  if (correct >= pending.required) {
    s.boss.shield = 0;
    s.boss.rage = Math.min(100, s.boss.rage + 4);
    event(s, "BARRIER_BROKEN", "Team Rune succeeded \u2014 barrier broken");
  } else event(s, "BARRIER_RUNE_FAILED", "Team Rune " + correct + "/" + pending.required + " \u2014 shield remains");
  settleBoss(s, { skill: "BARRIER" });
  s.pending = null;
  if (finish) finishRound(s);
  return s;
}

// src/game/multiplayer/server/authority.ts
var CombatFault = class extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
};
function fail(code) {
  throw new CombatFault(code);
}
var terminal = (d) => ["VICTORY", "DEFEAT", "ABORTED"].includes(d.phase);
var phaseTransitions = {
  COMBAT_PLANNING: ["MATH_CHALLENGE"],
  MATH_CHALLENGE: ["COMBAT_RESOLUTION", "VICTORY"],
  COMBAT_RESOLUTION: ["BOSS_ACTION"],
  BOSS_ACTION: ["DEFENSIVE_REACTION", "TEAM_RUNE", "TURN_END", "DEFEAT"],
  DEFENSIVE_REACTION: ["TURN_END", "DEFEAT"],
  TEAM_RUNE: ["TURN_END", "DEFEAT"],
  TURN_END: ["COMBAT_PLANNING", "VICTORY", "DEFEAT", "SUSPENDED", "ABORTED"],
  SUSPENDED: ["SUSPENDED", "COMBAT_PLANNING", "DEFEAT", "ABORTED"],
  VICTORY: [],
  DEFEAT: [],
  ABORTED: []
};
function enter(d, c, phase, ms) {
  if (d.phaseId && !phaseTransitions[d.phase].includes(phase)) fail("INVALID_TRANSITION");
  d.phase = phase;
  d.phaseId = c.id();
  d.openedAt = c.now;
  d.deadline = ms === null ? null : c.now + ms;
}
function liveMembers(d, c) {
  return c.members.filter((m) => !m.left && !d.departed.includes(m.id) && c.now - m.lastSeen < GAME.reconnectGraceMs);
}
function openTurn(d, c) {
  if (d.identityRound !== d.engine.turn) {
    d.turnId = c.id();
    d.identityRound = d.engine.turn;
    d.actors = [];
    d.actions = {};
    d.assignments = [];
    d.intent = null;
    event(d.engine, "TURN_STARTED", "Round " + d.engine.turn);
  }
  const active = new Set(liveMembers(d, c).map((m) => m.id));
  for (const p of d.engine.party) p.active = active.has(p.id);
  const eligible = d.engine.party.filter((p) => p.active && p.hp > 0);
  if (!eligible.length) {
    if (d.engine.party.some((p) => p.hp > 0 && !d.departed.includes(p.id)) && !d.engine.party.some((p) => p.active)) {
      d.suspendedAt ??= c.now;
      enter(d, c, c.now - d.suspendedAt >= 6e5 ? "ABORTED" : "SUSPENDED", 1e4);
      return;
    }
    d.engine.phase = "DEFEAT";
    event(d.engine, "PARTY_DEFEATED", "DEFEAT \u2014 no eligible adventurer remains.");
    enter(d, c, "DEFEAT", null);
    return;
  }
  d.suspendedAt = null;
  d.actors = eligible.map((p) => p.id);
  d.engine.phase = "COMBAT_PLANNING";
  enter(d, c, "COMBAT_PLANNING", GAME.planningMs);
}
function startAuthority(sessionId, roomId, members, seed, c) {
  if (!members.length || members.length > 4 || members.some((m) => !m.classId)) fail("INVALID_ROSTER");
  const sorted = [...members].sort((a, b) => a.seat - b.seat), engine = createCombat(sorted.map((m) => m.classId), seed);
  engine.mode = "SERVER";
  engine.party.forEach((p, i) => {
    p.id = sorted[i].id;
    p.name = sorted[i].nickname;
    p.seat = sorted[i].seat;
  });
  const d = { schema: 1, sessionId, roomId, engine, turnId: "", phase: "COMBAT_PLANNING", phaseId: "", openedAt: c.now, deadline: null, actors: [], actions: {}, assignments: [], used: {}, intent: null, departed: [], suspendedAt: null };
  event(engine, "SESSION_STARTED", "NOVA ZENITH \u2014 Abyss Guardian encounter");
  openTurn(d, c);
  return d;
}
function assign(d, c, actorId, difficulty, context, bonus = 0) {
  const actor = d.engine.party.find((p) => p.id === actorId);
  const preferred = { WARRIOR: ["ARITHMETIC", "RATIO"], MAGE: ["ALGEBRA"], THIEF: ["PATTERN", "PROBABILITY"], HEALER: ["PERCENTAGE", "RATIO"] };
  const used = d.used[actorId] ?? [], all = c.bank.filter((q2) => q2.difficulty === difficulty);
  if (!all.length) fail("QUESTION_BANK_UNAVAILABLE");
  const fresh = all.filter((q2) => !used.includes(q2.id)), pool = fresh.length ? fresh : all;
  const matches = pool.filter((q2) => preferred[actor.classId].includes(q2.category));
  const candidates = matches.length ? matches : pool, q = candidates[Math.floor(random(d.engine) * candidates.length)];
  const options = q.options.map((o) => ({ id: o.id, token: c.id(), text: o.text }));
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random(d.engine) * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const startsAt = c.now + 1e3;
  d.assignments.push({ id: c.id(), actorId, context, difficulty, prompt: q.prompt, options: options.map(({ token, text }) => ({ token, text })), startsAt, deadline: startsAt + GAME.timers[difficulty] + bonus, performance: null, questionId: q.id, correctToken: options.find((o) => o.id === q.correct).token, answeredAt: null, selectedToken: null });
  d.used[actorId] = [...used, q.id].slice(-100);
}
function completePhase(d, c) {
  if (d.phase === "COMBAT_PLANNING") {
    for (const id of d.actors) {
      const p = d.engine.party.find((p2) => p2.id === id);
      d.actions[id] ??= { actorId: id, skillId: CHARACTERS[p.classId].basic, targetId: "boss", performance: "FAILED", origin: "AUTO" };
      const a = d.actions[id];
      if (a.origin !== "AUTO") assign(d, c, id, SKILL_BY_ID[a.skillId].difficulty, "ACTION", magnitude(d.engine, "BLESSING_TIME", "party"));
    }
    enter(d, c, "MATH_CHALLENGE", 0);
    d.deadline = d.assignments.length ? Math.max(...d.assignments.map((a) => a.deadline)) : c.now;
    return;
  }
  if (d.phase === "MATH_CHALLENGE") {
    expire(d, c);
    const actions = Object.values(d.actions).map((a) => ({ ...a, performance: d.assignments.find((q) => q.actorId === a.actorId && q.context === "ACTION")?.performance ?? "FAILED" }));
    for (const a of actions) d.actions[a.actorId] = a;
    d.engine = resolvePlayerActions(d.engine, actions);
    if (d.engine.phase === "VICTORY") {
      enter(d, c, "VICTORY", null);
      return;
    }
    enter(d, c, "COMBAT_RESOLUTION", 4e3);
    return;
  }
  if (d.phase === "COMBAT_RESOLUTION") {
    d.intent = decideBoss(d.engine);
    enter(d, c, "BOSS_ACTION", 2e3);
    return;
  }
  if (d.phase === "BOSS_ACTION") {
    if (!d.intent) fail("MISSING_BOSS_INTENT");
    applyBossIntent(d.engine, d.intent);
    if (d.engine.pending?.kind === "REACTION") {
      const id = d.engine.pending.actorId;
      assign(d, c, id, "EASY", "REACTION", magnitude(d.engine, "FOCUS_TIME", id));
      enter(d, c, "DEFENSIVE_REACTION", 0);
      d.deadline = d.assignments.at(-1).deadline;
      return;
    }
    if (d.engine.pending?.kind === "RUNE") {
      for (const id of d.engine.pending.actorIds) assign(d, c, id, "MEDIUM", "TEAM_RUNE");
      enter(d, c, "TEAM_RUNE", 0);
      d.deadline = Math.max(...d.assignments.filter((a) => a.context === "TEAM_RUNE").map((a) => a.deadline));
      return;
    }
    endBoss(d, c);
    return;
  }
  if (d.phase === "DEFENSIVE_REACTION") {
    expire(d, c);
    d.engine = resolveReaction(d.engine, d.assignments.find((a) => a.context === "REACTION").performance ?? "FAILED", false);
    endBoss(d, c);
    return;
  }
  if (d.phase === "TEAM_RUNE") {
    const passed = d.engine.pending?.kind === "RUNE" && d.assignments.filter((a) => a.context === "TEAM_RUNE" && a.performance && a.performance !== "FAILED").length >= d.engine.pending.required;
    if (passed) {
      for (const q of d.assignments.filter((a) => a.context === "TEAM_RUNE" && a.performance === null)) q.cancelled = true;
    } else expire(d, c);
    const results = Object.fromEntries(d.assignments.filter((a) => a.context === "TEAM_RUNE").map((a) => [a.actorId, a.performance ?? "FAILED"]));
    d.engine = resolveRune(d.engine, results, false);
    endBoss(d, c);
    return;
  }
  if (d.phase === "TURN_END") {
    finishRound(d.engine);
    if (d.engine.phase === "VICTORY" || d.engine.phase === "DEFEAT") {
      enter(d, c, d.engine.phase, null);
      return;
    }
    openTurn(d, c);
    return;
  }
  if (d.phase === "SUSPENDED") {
    openTurn(d, c);
  }
}
function endBoss(d, c) {
  if (d.engine.party.filter((p) => p.active !== false).every((p) => p.hp <= 0)) {
    finishRound(d.engine);
    enter(d, c, "DEFEAT", null);
    return;
  }
  enter(d, c, "TURN_END", 2e3);
}
function currentContext(d) {
  return d.phase === "MATH_CHALLENGE" ? "ACTION" : d.phase === "DEFENSIVE_REACTION" ? "REACTION" : d.phase === "TEAM_RUNE" ? "TEAM_RUNE" : null;
}
function expire(d, c) {
  for (const q of d.assignments.filter((q2) => q2.context === currentContext(d) && q2.performance === null)) {
    q.performance = "FAILED";
    q.answeredAt = c.now;
    event(d.engine, "MATH_FAILED", "Formula expired", void 0, q.actorId);
  }
}
function dueAt(d) {
  if (terminal(d)) return null;
  if (d.phase === "COMBAT_PLANNING" && d.actors.every((id) => !!d.actions[id])) return Math.min(d.deadline, d.openedAt + GAME.minimumPlanningMs);
  const context = currentContext(d), pending = d.assignments.filter((a) => a.context === context);
  if (context) {
    if (context === "TEAM_RUNE" && d.engine.pending?.kind === "RUNE" && pending.filter((q) => q.performance && q.performance !== "FAILED").length >= d.engine.pending.required) return d.openedAt;
    if (pending.every((a) => a.performance !== null)) return d.openedAt;
    return Math.min(...pending.filter((a) => a.performance === null).map((a) => a.deadline));
  }
  return d.deadline;
}
function advance(input, c) {
  const d = structuredClone(input);
  if (terminal(d)) return d;
  const context = currentContext(d);
  let changed = false;
  if (context) for (const q of d.assignments.filter((q2) => q2.context === context && q2.performance === null && q2.deadline <= c.now)) {
    q.performance = "FAILED";
    q.answeredAt = c.now;
    event(d.engine, "MATH_FAILED", "Formula expired", void 0, q.actorId);
    changed = true;
  }
  const due = dueAt(d);
  if (due !== null && c.now >= due) {
    const current = d.assignments.filter((q) => q.context === context);
    const runeReady = d.phase === "TEAM_RUNE" && d.engine.pending?.kind === "RUNE" && current.filter((q) => q.performance && q.performance !== "FAILED").length >= d.engine.pending.required;
    if (!context || runeReady || current.every((q) => q.performance !== null) || c.now >= d.deadline) completePhase(d, c);
  }
  void changed;
  return d;
}
function applyIntent(input, uid, intent, c) {
  if (["GET", "START", "PUMP"].includes(intent.kind)) return input;
  const d = structuredClone(input), member = c.members.find((m) => m.userId === uid);
  if (!member || !d.engine.party.some((p) => p.id === member.id)) fail("NOT_A_MEMBER");
  if (!("turnId" in intent) || intent.turnId !== d.turnId) fail("STALE_TURN");
  if (intent.phaseId !== d.phaseId) fail("STALE_PHASE");
  if (terminal(d)) fail("ENCOUNTER_FINISHED");
  if (intent.kind === "LEAVE") {
    if (!d.departed.includes(member.id)) d.departed.push(member.id);
    event(d.engine, "PLAYER_LEFT", member.nickname + " left the encounter", void 0, member.id);
    return d;
  }
  if (intent.kind === "ACTION") {
    if (d.phase !== "COMBAT_PLANNING") fail("INVALID_PHASE");
    const old = d.actions[member.id];
    const k = SKILL_BY_ID[intent.skillId], p = d.engine.party.find((p2) => p2.id === member.id);
    if (!k) fail("INVALID_SKILL");
    const action = { actorId: p.id, skillId: k.id, targetId: k.target === "PARTY" ? "party" : k.target === "SELF" ? p.id : k.target === "MAIN_ENEMY" ? "boss" : intent.targetId, reviveTargetId: intent.reviveTargetId, performance: "FAILED", origin: "MANUAL" };
    if (old) {
      if (old.skillId !== action.skillId || old.targetId !== action.targetId || (old.reviveTargetId ?? void 0) !== action.reviveTargetId) fail("ACTION_LOCKED");
      return d;
    }
    if (c.now >= d.deadline) fail("DEADLINE_EXPIRED");
    if (!d.actors.includes(member.id) || d.departed.includes(member.id)) fail("INACTIVE_ACTOR");
    validateAction(d.engine, action);
    d.actions[member.id] = action;
    event(d.engine, "ACTION_LOCKED", p.name + " locked a formula", void 0, p.id);
    return d;
  }
  if (intent.kind === "ANSWER") {
    const q = d.assignments.find((a) => a.id === intent.assignmentId && a.actorId === member.id);
    if (!q) fail("INVALID_ASSIGNMENT");
    if (q.performance !== null) {
      if (q.selectedToken !== intent.optionToken) fail("ANSWER_LOCKED");
      return d;
    }
    if (q.context !== currentContext(d)) fail("STALE_ASSIGNMENT");
    if (c.now < q.startsAt) fail("NOT_AVAILABLE_YET");
    if (c.now >= q.deadline) fail("DEADLINE_EXPIRED");
    if (!q.options.some((o) => o.token === intent.optionToken)) fail("INVALID_OPTION");
    q.performance = gradeAnswer(q.correctToken === intent.optionToken, c.now - q.startsAt, q.deadline - q.startsAt);
    q.answeredAt = c.now;
    q.selectedToken = intent.optionToken;
    event(d.engine, "MATH_" + q.performance, q.performance === "FAILED" ? "FAILED CALCULATION" : q.performance, void 0, q.actorId);
    return d;
  }
  return fail("INVALID_COMMAND");
}
function publicSnapshot(d, version, now, uid, members = []) {
  const myActorId = members.find((m) => m.userId === uid)?.id ?? null;
  const q = d.assignments.find((q2) => q2.actorId === myActorId && q2.context === currentContext(d));
  const assignment = q ? { id: q.id, actorId: q.actorId, context: q.context, difficulty: q.difficulty, prompt: q.prompt, options: q.options, startsAt: q.startsAt, deadline: q.deadline, performance: q.performance } : null;
  return { schema: 1, sessionId: d.sessionId, roomId: d.roomId, version, serverNow: now, turnId: d.turnId, turn: d.engine.turn, phase: d.phase, phaseId: d.phaseId, deadline: d.deadline, partySize: d.engine.partySize, party: d.engine.party, boss: d.engine.boss, effects: d.engine.effects, combo: d.engine.combo, pendingBoss: d.intent, progress: d.engine.party.map((p) => ({ actorId: p.id, locked: !!d.actions[p.id], answered: d.assignments.some((a) => a.actorId === p.id && a.context === currentContext(d) && a.performance !== null), performance: d.assignments.find((a) => a.actorId === p.id && a.context === currentContext(d))?.performance ?? null })), events: d.engine.events.slice(-50), lastEventSeq: d.engine.nextSeq - 1, assignment, myActorId };
}

// src/game/multiplayer/server/service.ts
async function execute2(p, sessionId, uid, intent, requestId, token = null, id = () => crypto.randomUUID()) {
  for (let attempt = 0; attempt < 16; attempt++) {
    const l = await p.load(sessionId, uid, token, requestId, intent);
    if (l.receipt) return l.receipt;
    const c = { now: l.now, members: l.members, bank: [], id };
    let d = l.document;
    let mutation = false;
    if (!d) {
      if (l.state !== "STORY") throw new CombatFault("ROOM_NOT_STARTED");
      d = startAuthority(l.sessionId, l.roomId, l.members, parseInt(l.seed.replaceAll("-", "").slice(0, 8), 16), c);
      mutation = true;
    }
    const read = ["GET", "START", "PUMP"].includes(intent.kind);
    if (read) {
      const due = dueAt(d);
      if (due !== null && due <= l.now) {
        c.bank = await p.bank();
        const next = advance(d, c);
        mutation = JSON.stringify(next) !== JSON.stringify(d) || mutation;
        d = next;
      }
      if (!mutation) return uid ? publicSnapshot(d, l.version, l.now, uid, l.members) : null;
    } else {
      if (!uid) throw new CombatFault("UNAUTHENTICATED");
      if ("version" in intent && (!/^\d+$/.test(intent.version) || BigInt(intent.version) > BigInt(l.version))) throw new CombatFault("STALE_VERSION");
      d = applyIntent(d, uid, intent, c);
      mutation = true;
    }
    d.engine.events = d.engine.events.slice(-100);
    const nextVersion = (BigInt(l.version) + 1n).toString(), result = uid ? publicSnapshot(d, nextVersion, l.now, uid, l.members) : null;
    const projection = publicSnapshot(d, nextVersion, l.now);
    const cutoff = intent.kind === "ACTION" ? l.document?.deadline ?? null : intent.kind === "ANSWER" ? l.document?.assignments.find((q) => q.id === intent.assignmentId && q.performance === null)?.deadline ?? null : null;
    const saved = await p.commit({ sessionId, expected: l.version, document: d, projection, due: dueAt(d), uid: read ? null : uid, requestId: read ? null : requestId, payload: read ? null : intent, result, cutoff });
    if (saved.conflict) continue;
    if (saved.receipt) return saved.receipt;
    if (!read) return { ...result, version: saved.version };
  }
  throw new CombatFault("STATE_CONFLICT_RETRY");
}
function parseIntent(value) {
  if (!value || typeof value !== "object") throw new CombatFault("INVALID_COMMAND");
  const o = value;
  const str = (key2, max = 80) => {
    const v = o[key2];
    if (typeof v !== "string" || !v.length || v.length > max) throw new CombatFault("INVALID_" + key2.toUpperCase());
    return v;
  };
  const kind = str("kind");
  if (kind === "START" || kind === "GET" || kind === "PUMP") return { kind };
  if (!["ACTION", "ANSWER", "LEAVE"].includes(kind)) throw new CombatFault("INVALID_COMMAND");
  const base = { turnId: str("turnId"), phaseId: str("phaseId"), version: str("version", 20) };
  if (kind === "ACTION") return { kind, ...base, skillId: str("skillId"), targetId: str("targetId"), ...o.reviveTargetId ? { reviveTargetId: str("reviveTargetId") } : {} };
  if (kind === "ANSWER") return { kind, ...base, assignmentId: str("assignmentId"), optionToken: str("optionToken") };
  return { kind: "LEAVE", ...base };
}

// supabase/functions/nova-combat/entry.ts
var url = Deno.env.get("SUPABASE_URL");
var key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
var db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
var cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json", "Cache-Control": "no-store" };
async function rpc(name, args = {}) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}
var bankCache;
var persistence = {
  load: (sessionId, uid, token, requestId, intent) => rpc("nz_combat_load_v1", { p_session: sessionId, p_uid: uid, p_token: token, p_request: requestId, p_payload: intent }),
  bank: async () => {
    if (!bankCache) {
      bankCache = rpc("nz_combat_bank_v1");
      bankCache.catch(() => {
        bankCache = null;
      });
    }
    return await bankCache;
  },
  commit: (c) => rpc("nz_combat_commit_v1", { p_session: c.sessionId, p_expected: c.expected, p_document: c.document, p_public: c.projection, p_due: c.due, p_uid: c.uid, p_request: c.requestId, p_payload: c.payload, p_result: c.result, p_cutoff: c.cutoff })
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), { status: 405, headers: cors });
  let sessionId;
  try {
    const raw = await req.text();
    if (raw.length > 8192) throw new Error("PAYLOAD_TOO_LARGE");
    const body = JSON.parse(raw);
    sessionId = body.sessionId;
    if (typeof sessionId !== "string" || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(sessionId)) throw new Error("INVALID_SESSION");
    let uid = null, token = null, intent, requestId = null;
    if (body.worker === true) {
      if (typeof body.token !== "string" || body.token.length !== 36) throw new Error("INVALID_WORKER_CAPABILITY");
      token = body.token;
      intent = { kind: "PUMP" };
    } else {
      const bearer = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
      if (!bearer) throw new Error("UNAUTHENTICATED");
      const { data, error } = await db.auth.getUser(bearer);
      if (error || !data.user) throw new Error("UNAUTHENTICATED");
      uid = data.user.id;
      intent = parseIntent(body.intent);
      if (!["GET", "START", "PUMP"].includes(intent.kind)) {
        if (typeof body.requestId !== "string" || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(body.requestId)) throw new Error("INVALID_REQUEST_ID");
        requestId = body.requestId;
      }
    }
    const result = await execute2(persistence, sessionId, uid, intent, requestId, token);
    console.info(JSON.stringify({ event: "combat_command", sessionId, kind: intent.kind, version: result?.version, phase: result?.phase }));
    return new Response(JSON.stringify(body.worker ? { ok: true } : result), { headers: cors });
  } catch (e) {
    const known = /^(INVALID_|STALE_|DEADLINE_|NOT_|UNAUTHENTICATED|ACTION_LOCKED|ANSWER_LOCKED|INACTIVE_|ROOM_|SESSION_|QUESTION_BANK_|ENCOUNTER_|STATE_CONFLICT|IDEMPOTENCY_|RATE_LIMITED|Requires |Character is |Wrong class)/;
    const message = e instanceof Error ? e.message : "INTERNAL_ERROR";
    const safe = known.test(message) ? message : "INTERNAL_ERROR";
    console.warn(JSON.stringify({ event: "combat_rejected", sessionId, code: safe }));
    return new Response(JSON.stringify({ error: safe }), { status: safe === "UNAUTHENTICATED" ? 401 : safe === "INTERNAL_ERROR" ? 500 : 409, headers: cors });
  }
});
