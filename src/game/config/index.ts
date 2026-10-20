
import type { CharacterClass, CharacterStats, MathPerformance, ResourceType, SkillDefinition } from "../core/types";
export const GAME = {
  name: "NOVA ZENITH", version: "nz.v1", ruleset: "nz.v1.0",
  resourceMax: 100, ultimateMax: 100, resourceStart: 40, ultimateCarryCap: 50,
  planningMs: 12000, minimumPlanningMs: 3000, reconnectGraceMs: 60000,
  heartbeatMs: 10000, pollMs: 3000, basicGain: 20, autoBasicGain: 10, ultimateGainCap: 30,
  timers: { EASY: 12000, MEDIUM: 18000, HARD: 25000 },
  performance: { PERFECT: 1.25, SUCCESS: 1, FAILED: .4 } satisfies Record<MathPerformance,number>,
  combo: [0,0,.05,.10,.15], blessingTimeMs: 3000
} as const;
export const CHARACTERS: Record<CharacterClass, CharacterStats & { name: string; resourceType: ResourceType; basic: string; color: string; symbol: string }> = {
  WARRIOR: { name: "Warrior", maxHp:650,speed:55,resistance:.20,resourceType:"GUARD",basic:"warrior.slash",color:"#edb66b",symbol:"◆" },
  MAGE: { name: "Mage", maxHp:400,speed:70,resistance:0,resourceType:"MANA",basic:"mage.arcane_bolt",color:"#af9aff",symbol:"✦" },
  THIEF: { name: "Thief", maxHp:450,speed:100,resistance:.05,resourceType:"FOCUS",basic:"thief.quick_strike",color:"#65dac0",symbol:"❖" },
  HEALER: { name: "Healer", maxHp:500,speed:60,resistance:.10,resourceType:"FAITH",basic:"healer.holy_bolt",color:"#99d8f3",symbol:"✧" }
};
function skill(classId:CharacterClass,id:string,name:string,type:SkillDefinition["type"],target:SkillDefinition["target"],cost:number,base:number,difficulty:SkillDefinition["difficulty"],category:number,priority:number,description:string,ultimate=false):SkillDefinition {
  return { classId,id,name,type,target,cost,base,difficulty,category,priority,description,ultimate };
}
export const SKILLS: SkillDefinition[] = [
  skill("WARRIOR","warrior.slash","Slash","OFFENSE","ENEMY",0,90,"EASY",50,40,"Generate 20 Guard."),
  skill("WARRIOR","warrior.shield_wall","Shield Wall","DEFENSE","PARTY",30,0,"MEDIUM",10,10,"Party reduction 15–50% this round."),
  skill("WARRIOR","warrior.provoke","Provoke","DEFENSE","MAIN_ENEMY",20,0,"MEDIUM",10,20,"Draw the next single-target attack."),
  skill("WARRIOR","warrior.last_bastion","Last Bastion","DEFENSE","SELF",0,0,"MEDIUM",10,5,"Redirect, protect party and self.",true),
  skill("MAGE","mage.arcane_bolt","Arcane Bolt","OFFENSE","ENEMY",0,110,"EASY",50,40,"Generate 20 Mana."),
  skill("MAGE","mage.overcharge","Overcharge","OFFENSE","ENEMY",40,220,"HARD",50,30,"High-risk arcane burst."),
  skill("MAGE","mage.frost_seal","Frost Seal","DEBUFF","MAIN_ENEMY",30,70,"MEDIUM",30,20,"Weaken the next damaging enemy action."),
  skill("MAGE","mage.meteor","Meteor","OFFENSE","ENEMY",0,450,"HARD",50,10,"Massive single-target damage.",true),
  skill("THIEF","thief.quick_strike","Quick Strike","OFFENSE","ENEMY",0,80,"EASY",50,40,"Perfect adds ×1.35; generate 20 Focus."),
  skill("THIEF","thief.focus_stance","Focus","BUFF","SELF",20,0,"MEDIUM",20,20,"Empower next hit and extend one reaction."),
  skill("THIEF","thief.expose_weakness","Expose Weakness","DEBUFF","MAIN_ENEMY",30,40,"MEDIUM",30,10,"Expose before subsequent party attacks."),
  skill("THIEF","thief.shadow_execution","Shadow Execution","OFFENSE","ENEMY",0,250,"HARD",50,20,"Finisher scales up to ×1.8.",true),
  skill("HEALER","healer.holy_bolt","Holy Bolt","OFFENSE","ENEMY",0,55,"EASY",50,40,"Generate 20 Faith."),
  skill("HEALER","healer.healing_wave","Healing Wave","HEAL","PARTY",35,65,"MEDIUM",40,10,"Heal each living ally."),
  skill("HEALER","healer.blessing","Blessing","BUFF","PARTY",30,0,"MEDIUM",20,10,"Boost output; next round questions +3s."),
  skill("HEALER","healer.divine_recovery","Divine Recovery","HEAL","PARTY",0,180,"MEDIUM",40,5,"Heal, cleanse one effect, revive one ally.",true)
];
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s=>[s.id,s])) as Record<string,SkillDefinition>;
export const BOSS = {
  baseHp:2000, hpScale:.6, damageScale:[0,.85,.92,.96,1],
  phaseDamage:[0,1,1.15,1.25], phaseRage:[0,20,25,30],
  threat:{WARRIOR:45,HEALER:25,MAGE:17,THIEF:13},
  claw:110,spear:180,wave:60,cataclysm:110,spearCooldownRounds:3,
  barrierBase:500,barrierPerPlayer:150,coreBase:350,corePerPlayer:100,
  normalHeavyLockout:2
} as const;
