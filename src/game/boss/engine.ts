import {normalEnemy,normalAction} from '../enemies/definitions';

import { BOSS, GAME } from "../config";
import { clamp, roundHalfUp, weightedIndex } from "../core/math";
import type { BossAction, BossPhase, BossState, Character, CombatState, MathPerformance } from "../core/types";
import { consume, magnitude, putEffect } from "../combat/effects";

export const bossHp=(n:number)=>{if(!Number.isInteger(n)||n<1||n>4)throw new Error("INVALID_PARTY_SIZE");return roundHalfUp(BOSS.baseHp*(1+BOSS.hpScale*(n-1)));};
export const coreHp=(n:number)=>BOSS.coreBase+BOSS.corePerPlayer*(n-1);
export const barrierHp=(n:number)=>BOSS.barrierBase+BOSS.barrierPerPlayer*(n-1);
export const runeRequired=(n:number)=>Math.max(1,Math.ceil(n*.75));
export function createBoss(n:number):BossState {
 const maxHp=bossHp(n);return {id:"boss",name:"Abyss Guardian",hp:maxHp,maxHp,phase:1,rage:0,shield:0,cycle:0,lastSpearRound:-100,lastUtility:null,barrierUsed:false,heavy:"NONE",core:null,normalSinceHeavy:2};
}
export function event(s:CombatState,type:string,text:string,amount?:number,actorId?:string,targetId?:string,skillId?:string):void {
 s.events.push({seq:s.nextSeq++,turn:s.turn,type,text,amount,actorId,targetId,...(skillId?{skillId}:{}),...(s.enemyId?{encounterId:s.enemyId}:{})});
}
export function random(s:CombatState):number {s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function updatePhase(s:CombatState):void {
 if(normalEnemy(s))return;
 const ratio=s.boss.hp/s.boss.maxHp;
 const next:BossPhase=ratio<.25?3:ratio<.6?2:1;
 while(s.boss.phase<next){s.boss.phase=(s.boss.phase+1) as BossPhase;event(s,"BOSS_PHASE_CHANGED",s.boss.phase===2?"ENRAGED — Phase 2":"DESPERATION — Phase 3");}
}
export function selectTarget(s:CombatState,rng:()=>number=()=>random(s)):string {
 const living=s.party.filter(p=>p.hp>0&&p.active!==false);if(!living.length)throw new Error("NO_TARGET");
 const warrior=living.find(p=>p.classId==="WARRIOR");
 const provoke=warrior?magnitude(s,"PROVOKE",warrior.id):0;
 const redirect=warrior?magnitude(s,"REDIRECT",warrior.id):0;
 if(warrior&&(redirect>0||provoke===1)){consume(s,"PROVOKE",warrior.id);return warrior.id;}
 const weights=living.map(p=>BOSS.threat[p.classId]*(p.id===warrior?.id&&provoke===4?4:1));
 if(warrior&&provoke>0)consume(s,"PROVOKE",warrior.id);
 return living[weightedIndex(weights,rng())].id;
}
function utility(s:CombatState):"ROAR"|"ARMOR"|"CLAW" {
 const roar=s.party.some(p=>p.hp>0&&magnitude(s,"ROAR",p.id)>0);
 const armor=magnitude(s,"ARMOR","boss")>0;
 if(!roar&&!armor)return s.boss.lastUtility==="ROAR"?"ARMOR":"ROAR";
 return !roar?"ROAR":!armor?"ARMOR":"CLAW";
}
export function selectBossAction(s:CombatState,rng:()=>number=()=>random(s)):BossAction {
 const b=s.boss,enemy=normalEnemy(s);
 if(enemy){const skill=enemy.cycle[b.cycle%enemy.cycle.length],action=normalAction(s,skill)!;return action.kind==='SINGLE'?{skill,targetId:selectTarget(s,rng)}:{skill};}
 if(b.heavy==="CORE_EXPOSED")return {skill:"CATACLYSM"};
 if(b.rage>=100&&b.normalSinceHeavy>=BOSS.normalHeavyLockout)return {skill:"CHARGE"};
 const slot=b.cycle%5;
 let skill:BossAction["skill"];
 if(slot===0)skill="CLAW";
 else if(slot===1)skill=utility(s);
 else if(slot===2)skill="WAVE";
 else if(slot===3)skill=s.turn-b.lastSpearRound>=BOSS.spearCooldownRounds?"SPEAR":"CLAW";
 else skill=!b.barrierUsed&&b.phase>=2?"BARRIER":utility(s);
 return skill==="CLAW"||skill==="SPEAR"?{skill,targetId:selectTarget(s,rng)}:{skill};
}
export function incomingDamage(s:CombatState,p:Character,base:number,reaction:MathPerformance|null=null,heavy=1):number {
 const drs={WARRIOR:[.8,.5,.2],THIEF:[1,.5,0],MAGE:[.7,.4,0],HEALER:[.6,.35,0]};
 const idx=reaction==="PERFECT"?0:reaction==="SUCCESS"?1:2;
 const reactionDR=reaction?drs[p.classId][idx]:0;
 const partyDR=Math.max(magnitude(s,"SHIELD_WALL","party"),magnitude(s,"BASTION_PARTY","party"));
 return roundHalfUp(base*BOSS.damageScale[s.partySize]*BOSS.phaseDamage[s.boss.phase]*(1-magnitude(s,"FROST","boss"))*heavy*(1-partyDR)*(1-p.resistance)*(1-magnitude(s,"BASTION_PERSONAL",p.id))*(1-reactionDR));
}
export function hurt(s:CombatState,p:Character,damage:number):void {
 p.hp=Math.max(0,p.hp-damage);event(s,"INCOMING_DAMAGE",p.name+" takes "+damage,damage,"boss",p.id);
 if(p.hp===0){s.effects=s.effects.filter(e=>e.target!==p.id);event(s,"PLAYER_KO",p.name+" is KO",undefined,undefined,p.id);}
}
export function gainUltimate(s:CombatState,p:Character,amount:number):void {
 const already=s.gainThisRound[p.id]??0;const add=Math.min(amount,GAME.ultimateGainCap-already);
 p.ultimate=clamp(p.ultimate+Math.max(0,add),0,100);s.gainThisRound[p.id]=already+Math.max(0,add);
}
export function settleBoss(s:CombatState,intent:BossAction):void {
 if(normalEnemy(s)){s.boss.cycle++;return;}
 const normal=intent.skill!=="CHARGE"&&intent.skill!=="CATACLYSM";
 if(normal){s.boss.cycle++;s.boss.normalSinceHeavy++;s.boss.rage=clamp(s.boss.rage+BOSS.phaseRage[s.boss.phase],0,100);}
 if(s.boss.rage>=100&&s.boss.heavy==="NONE")s.boss.heavy="PENDING_CHARGE";
 event(s,"RAGE_CHANGED","Rage "+s.boss.rage,s.boss.rage);
}
export function applyBossIntent(s:CombatState,intent:BossAction):void {
 const b=s.boss,action=normalAction(s,intent.skill);
 if(action){if(action.reaction){s.pending={kind:'REACTION',intent,actorId:intent.targetId!};s.phase='DEFENSIVE_REACTION';return;}
 if(action.kind==='AOE'){for(const p of s.party.filter(p=>p.hp>0&&p.active!==false))hurt(s,p,incomingDamage(s,p,action.damage));consume(s,'FROST','boss');}
 if(action.id==='DARK_CHANT'){putEffect(s,'ARMOR','boss','boss',.15,s.turn+2,s.turn+1);for(const p of s.party.filter(p=>p.hp>0&&p.active!==false))putEffect(s,'ROAR','boss',p.id,.10,s.turn+2,s.turn+1,true,true);event(s,'EFFECT_APPLIED','Dark Chant — armor +15%, party effectiveness −10%');}
 settleBoss(s,intent);return;}
 if(intent.skill==="CLAW"||intent.skill==="SPEAR"){
   if(intent.skill==="SPEAR")b.lastSpearRound=s.turn;
   s.pending={kind:"REACTION",intent,actorId:intent.targetId!};s.phase="DEFENSIVE_REACTION";return;
 }
 if(intent.skill==="ROAR"){for(const p of s.party.filter(p=>p.hp>0&&p.active!==false))putEffect(s,"ROAR","boss",p.id,.15,s.turn+2,s.turn+1,true,true);b.lastUtility="ROAR";event(s,"EFFECT_APPLIED","Dark Roar — output −15% for two rounds");}
 if(intent.skill==="ARMOR"){putEffect(s,"ARMOR","boss","boss",.3,s.turn+2,s.turn+1);b.lastUtility="ARMOR";event(s,"EFFECT_APPLIED","Demon Armor — damage received −30%");}
 if(intent.skill==="BARRIER"){
   b.shield=barrierHp(s.partySize);b.barrierUsed=true;
   const ids=s.party.filter(p=>p.hp>0&&p.active!==false).map(p=>p.id);
   s.pending={kind:"RUNE",actorIds:ids,required:runeRequired(ids.length)};s.phase="MATH_CHALLENGE";
   event(s,"BARRIER_CREATED","Abyss Barrier — solve the team rune",b.shield);return;
 }
 if(intent.skill==="CHARGE"){
   const hp=coreHp(s.partySize);b.core={id:"core",hp,maxHp:hp};b.heavy="CORE_EXPOSED";
   event(s,"HEAVY_TELEGRAPH","INFERNAL CATACLYSM — NEXT BOSS TURN");
   event(s,"INFERNAL_CORE_SPAWNED","Destroy the Infernal Core or prepare protection",hp);
 }
 if(intent.skill==="WAVE"||intent.skill==="CATACLYSM"){
   const heavy=(intent.skill==="CATACLYSM"&&b.core?.hp===0)?0.4:1;
   for(const p of s.party.filter(p=>p.hp>0&&p.active!==false))hurt(s,p,incomingDamage(s,p,intent.skill==="WAVE"?BOSS.wave:BOSS.cataclysm,null,heavy));
   consume(s,"FROST","boss");
   if(intent.skill==="CATACLYSM"){b.rage=0;b.heavy="NONE";b.core=null;b.normalSinceHeavy=0;event(s,"CATACLYSM_RESOLVED","Infernal Cataclysm resolved");}
 }
 settleBoss(s,intent);
}
