
/** Offline QA only. Never accepts or writes an online lobby/combat snapshot. */
import { BOSS, CHARACTERS, GAME, SKILL_BY_ID } from "../config";
import type { Character, CharacterClass, CombatAction, CombatState, MathPerformance, ResolvedAction, SkillDefinition } from "../core/types";
import { clampHp, clampResource, performanceMultiplier, roundHalfUp } from "../core/math";
import { cleanseOne, consume, expireEffects, magnitude, outputModifier, putEffect } from "./effects";
import { applyBossIntent, createBoss, event, gainUltimate, hurt, incomingDamage, selectBossAction, settleBoss, updatePhase } from "../boss/engine";

export function createCharacter(classId:CharacterClass,seat=0):Character {
 const c=CHARACTERS[classId];return {id:classId.toLowerCase(),name:c.name,classId,maxHp:c.maxHp,hp:c.maxHp,speed:c.speed,resistance:c.resistance,resource:GAME.resourceStart,ultimate:0,seat};
}
export function createCombat(classes:CharacterClass[]=["WARRIOR","MAGE","THIEF","HEALER"],seed=12345,dummy=false):CombatState {
 if(classes.length<1||classes.length>4||new Set(classes).size!==classes.length)throw new Error("INVALID_ROSTER");
 const party=classes.map(createCharacter);const boss=createBoss(party.length);
 const basics=party.reduce((n,p)=>n+SKILL_BY_ID[CHARACTERS[p.classId].basic].base,0);
 return {mode:"OFFLINE_QA",turn:1,phase:"COMBAT_PLANNING",party,boss,partySize:party.length,resonance:boss.maxHp/(10*basics),seed:seed>>>0,effects:[],events:[],nextSeq:1,effectSeq:1,combo:0,roundSuccess:false,roundBossHpStart:boss.hp,rageBonus:0,gainThisRound:{},pending:null,dummy};
}
export const isPartyWiped=(s:CombatState)=>s.party.every(p=>p.hp<=0);
export function unavailableReason(p:Character,skill:SkillDefinition):string|null {
 if(p.hp<=0)return "Character is KO";
 if(p.classId!==skill.classId)return "Wrong class";
 if(skill.ultimate&&p.ultimate<100)return "Requires 100 Ultimate";
 if(!skill.ultimate&&p.resource<skill.cost)return "Requires "+skill.cost+" "+CHARACTERS[p.classId].resourceType;
 return null;
}
export function validateAction(s:CombatState,a:CombatAction):void {
 const p=s.party.find(x=>x.id===a.actorId),k=SKILL_BY_ID[a.skillId];
 if(!p||!k)throw new Error("INVALID_ACTION");
 const reason=unavailableReason(p,k);if(reason)throw new Error(reason);
 if(!["PERFECT","SUCCESS","FAILED"].includes(a.performance))throw new Error("INVALID_PERFORMANCE");
 if(a.origin==="AUTO"&&(a.skillId!==CHARACTERS[p.classId].basic||a.performance!=="FAILED"))throw new Error("INVALID_AUTO_ACTION");
 if(k.target==="ENEMY"&&(a.targetId!=="boss"&&!(a.targetId==="core"&&s.boss.core&&s.boss.core.hp>0)))throw new Error("INVALID_TARGET");
 if(k.target==="MAIN_ENEMY"&&a.targetId!=="boss")throw new Error("INVALID_TARGET");
 if(a.reviveTargetId&&!s.party.some(x=>x.id===a.reviveTargetId&&x.hp===0))throw new Error("INVALID_REVIVE_TARGET");
}
export function sortActions(s:CombatState,actions:CombatAction[]):CombatAction[] {
 return [...actions].sort((a,b)=>{const x=SKILL_BY_ID[a.skillId],y=SKILL_BY_ID[b.skillId];const p=s.party.find(p=>p.id===a.actorId)!,q=s.party.find(p=>p.id===b.actorId)!;
 return x.category-y.category||x.priority-y.priority||q.speed-p.speed||p.seat-q.seat||a.actorId.localeCompare(b.actorId);});
}
const tier=(p:MathPerformance,perfect:number,success:number,failed:number)=>p==="PERFECT"?perfect:p==="SUCCESS"?success:failed;
function heal(s:CombatState,p:Character,n:number,source:string):number {
 if(p.hp<=0)return 0;const old=p.hp;p.hp=clampHp(p.hp+roundHalfUp(n),p.maxHp);
 event(s,"HEAL",p.name+" recovers "+(p.hp-old),p.hp-old,source,p.id);return p.hp-old;
}
function hit(s:CombatState,a:CombatAction,p:Character,k:SkillDefinition):number {
 let target=a.targetId==="core"&&s.boss.core&&s.boss.core.hp>0?"core":"boss";
 const hp=target==="core"?s.boss.core!.hp:s.boss.hp,max=target==="core"?s.boss.core!.maxHp:s.boss.maxHp;
 let special=1;
 if(k.id==="thief.quick_strike"&&a.performance==="PERFECT")special=1.35;
 if(k.id==="thief.shadow_execution")special=Math.min(1.8,2-hp/max);
 const focused=magnitude(s,"FOCUS_DAMAGE",p.id);
 const damage=roundHalfUp(k.base*performanceMultiplier(a.performance)*s.resonance*outputModifier(s,p.id)*(1+focused)*(1+s.combo)*special*(target==="boss"?1+magnitude(s,"EXPOSE","boss"):1)*(target==="boss"&&s.boss.phase===3?1.15:1)*(target==="boss"?1-magnitude(s,"ARMOR","boss"):1));
 if(focused)consume(s,"FOCUS_DAMAGE",p.id);
 if(target==="core"){
   s.boss.core!.hp=Math.max(0,hp-damage);event(s,"DAMAGE","Infernal Core takes "+damage,damage,p.id,"core");
   if(s.boss.core!.hp===0)event(s,"CORE_DESTROYED","Infernal Core destroyed — Cataclysm reduced to 40%");
 }else{
   let remaining=damage;const shieldDamage=Math.min(s.boss.shield,remaining);
   if(shieldDamage){s.boss.shield-=shieldDamage;remaining-=shieldDamage;event(s,"SHIELD_DAMAGE","Barrier absorbs "+shieldDamage,shieldDamage,p.id,"boss");if(s.boss.shield===0){s.rageBonus=Math.min(10,s.rageBonus+4);event(s,"BARRIER_BROKEN","Abyss Barrier shattered");}}
   s.boss.hp=Math.max(0,s.boss.hp-remaining);event(s,"DAMAGE",p.name+" uses "+k.name+" — "+remaining+" damage",remaining,p.id,"boss");updatePhase(s);
 }
 return damage;
}
function execute(s:CombatState,a:CombatAction):ResolvedAction {
 const p=s.party.find(x=>x.id===a.actorId)!,k=SKILL_BY_ID[a.skillId];const r=s.turn;
 if(s.boss.hp<=0)return {...a,damage:0,healing:0,canceled:true};
 if(k.ultimate)p.ultimate=0;else p.resource=clampResource(p.resource-k.cost);
 event(s,"ACTION_RESOLVED",p.name+" — "+k.name+" — "+a.performance,undefined,p.id);
 let damage=0,healing=0;
 if(k.base>0&&k.type!=="HEAL")damage=hit(s,a,p,k);
 const add=(type:Parameters<typeof putEffect>[1],target:string,n:number,through=r,from=r)=>putEffect(s,type,p.id,target,n,through,from);
 switch(k.id){
  case "warrior.shield_wall":add("SHIELD_WALL","party",tier(a.performance,.5,.35,.15));break;
  case "warrior.provoke":add("PROVOKE",p.id,a.performance==="FAILED"?4:1,r+2);break;
  case "warrior.last_bastion":add("BASTION_PARTY","party",tier(a.performance,.5,.4,.2));add("BASTION_PERSONAL",p.id,tier(a.performance,.3,.25,.1));add("REDIRECT",p.id,1);break;
  case "mage.frost_seal":add("FROST","boss",tier(a.performance,.3,.2,.1),r+1);break;
  case "thief.focus_stance":add("FOCUS_DAMAGE",p.id,tier(a.performance,.4,.25,.1),r+2);add("FOCUS_TIME",p.id,tier(a.performance,3000,2000,1000),r+2);break;
  case "thief.expose_weakness":add("EXPOSE","boss",tier(a.performance,.3,.2,.08),r+1);event(s,"EFFECT_APPLIED","Boss is EXPOSED");break;
  case "healer.blessing":add("BLESSING","party",tier(a.performance,.2,.15,.075),r+1);add("BLESSING_TIME","party",3000,r+1,r+1);break;
  case "healer.healing_wave":
  case "healer.divine_recovery":
   for(const ally of s.party.filter(x=>x.hp>0))healing+=heal(s,ally,k.base*performanceMultiplier(a.performance)*outputModifier(s,p.id),p.id);
   if(k.ultimate){
     for(const ally of s.party.filter(x=>x.hp>0))cleanseOne(s,ally.id);
     const ko=s.party.filter(x=>x.hp===0).sort((a,b)=>a.seat-b.seat);
     const revive=ko.find(x=>x.id===a.reviveTargetId)??ko[0];
     if(revive){revive.hp=Math.max(1,roundHalfUp(revive.maxHp*.3));event(s,"PLAYER_REVIVED",revive.name+" revived",revive.hp,p.id,revive.id);}
   }break;
 }
 if(k.cost===0&&!k.ultimate)p.resource=clampResource(p.resource+(a.origin==="AUTO"?GAME.autoBasicGain:GAME.basicGain));
 if(!k.ultimate&&a.origin!=="AUTO")gainUltimate(s,p,a.performance==="PERFECT"?20:a.performance==="SUCCESS"?15:0);
 return {...a,damage,healing};
}
export function finishRound(s:CombatState):void {
 s.pending=null;expireEffects(s);
 if(s.boss.hp<=0){s.phase="VICTORY";s.boss.core=null;event(s,"BOSS_DEFEATED","VICTORY — the seal holds, for now.");return;}
 if(isPartyWiped(s)){s.phase="DEFEAT";event(s,"PARTY_DEFEATED","DEFEAT — regroup and try another formula.");return;}
 s.turn++;s.phase="COMBAT_PLANNING";
}
export function resolveRound(input:CombatState,requested:CombatAction[],rng?:()=>number):CombatState {
 if(input.phase!=="COMBAT_PLANNING")throw new Error("INVALID_PHASE");
 const s=structuredClone(input);s.gainThisRound={};s.roundBossHpStart=s.boss.hp;s.rageBonus=0;
 const living=s.party.filter(p=>p.hp>0);
 if(new Set(requested.map(a=>a.actorId)).size!==requested.length)throw new Error("DUPLICATE_ACTION");
 for(const a of requested)validateAction(s,a);
 const actions=living.map(p=>requested.find(a=>a.actorId===p.id)??{actorId:p.id,skillId:CHARACTERS[p.classId].basic,targetId:"boss",performance:"FAILED" as const,origin:"AUTO" as const});
 s.roundSuccess=actions.every(a=>a.performance!=="FAILED"&&a.origin!=="AUTO");
 s.combo=s.roundSuccess?GAME.combo[actions.length]??0:0;
 if(s.combo)event(s,actions.length===4?"TEAM_COMBO":"COMBO","COMBO ×"+actions.length+" — +"+Math.round(s.combo*100)+"% damage");
 for(const a of sortActions(s,actions))execute(s,a);
 if(s.roundSuccess&&actions.length===4)for(const p of living)gainUltimate(s,p,5);
 if(s.boss.hp<=0){finishRound(s);return s;}
 if(s.dummy){finishRound(s);return s;}
 if(s.boss.heavy==="NONE"||s.boss.heavy==="PENDING_CHARGE"){
   s.rageBonus=Math.min(10,s.rageBonus+(s.roundSuccess?3:0)+(s.roundBossHpStart-s.boss.hp>=s.boss.maxHp*.1?3:0));
   s.boss.rage=Math.min(100,s.boss.rage+s.rageBonus);
 }
 const intent=selectBossAction(s,rng);event(s,"BOSS_ACTION_SELECTED","Abyss Guardian — "+intent.skill,undefined,"boss",intent.targetId);
 applyBossIntent(s,intent);if(!s.pending)finishRound(s);return s;
}
export function resolveReaction(input:CombatState,performance:MathPerformance):CombatState {
 if(input.pending?.kind!=="REACTION")throw new Error("NO_PENDING_REACTION");
 const s=structuredClone(input),pending=s.pending!;
 if(pending.kind!=="REACTION")throw new Error("INVALID_PENDING");
 const p=s.party.find(x=>x.id===pending.actorId)!;
 const damage=incomingDamage(s,p,pending.intent.skill==="SPEAR"?BOSS.spear:BOSS.claw,performance);
 hurt(s,p,damage);consume(s,"FROST","boss");consume(s,"FOCUS_TIME",p.id);
 if(p.hp>0&&p.classId==="HEALER")heal(s,p,performance==="PERFECT"?40:performance==="SUCCESS"?20:0,p.id);
 gainUltimate(s,p,performance==="PERFECT"?5:performance==="SUCCESS"?3:0);
 event(s,"REACTION_RESOLVED",p.name+" reaction — "+performance,damage,p.id);
 settleBoss(s,pending.intent);finishRound(s);return s;
}
export function resolveRune(input:CombatState,results:Record<string,MathPerformance>):CombatState {
 if(input.pending?.kind!=="RUNE")throw new Error("NO_PENDING_RUNE");
 const s=structuredClone(input),pending=s.pending!;
 if(pending.kind!=="RUNE")throw new Error("INVALID_PENDING");
 let correct=0;for(const id of pending.actorIds){if(results[id]&&results[id]!=="FAILED"){correct++;gainUltimate(s,s.party.find(p=>p.id===id)!,5);}}
 if(correct>=pending.required){s.boss.shield=0;s.boss.rage=Math.min(100,s.boss.rage+4);event(s,"BARRIER_BROKEN","Team Rune succeeded — barrier broken");}
 else event(s,"BARRIER_RUNE_FAILED","Team Rune "+correct+"/"+pending.required+" — shield remains");
 settleBoss(s,{skill:"BARRIER"});finishRound(s);return s;
}
