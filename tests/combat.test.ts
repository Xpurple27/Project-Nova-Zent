
import test from "node:test";
import assert from "node:assert/strict";
import {createCombat,resolveRound,resolveReaction,resolveRune,unavailableReason,isPartyWiped} from "../src/game/combat/engine";
import {activeEffect,magnitude,putEffect} from "../src/game/combat/effects";
import {bossHp,coreHp,barrierHp,runeRequired,selectTarget,selectBossAction,applyBossIntent,updatePhase,incomingDamage} from "../src/game/boss/engine";
import {SKILL_BY_ID,CHARACTERS} from "../src/game/config";
import type {CombatState,CombatAction,MathPerformance,CharacterClass} from "../src/game/core/types";
function action(s:CombatState,id:string,skillId:string,performance:MathPerformance="SUCCESS",targetId="boss"):CombatAction{return {actorId:id,skillId,performance,targetId:SKILL_BY_ID[skillId].target==="PARTY"?"party":SKILL_BY_ID[skillId].target==="SELF"?id:targetId};}
function basics(s:CombatState,p:MathPerformance="SUCCESS",target="boss"){return s.party.filter(p=>p.hp>0).map(c=>action(s,c.id,CHARACTERS[c.classId].basic,p,target));}
for(const cls of ["WARRIOR","MAGE","THIEF","HEALER"] as CharacterClass[]){
 test(cls+" initializes correctly; basic generates resource and solo normalized damage",()=>{
  const s=createCombat([cls],3,true),p=s.party[0];assert.equal(p.hp,CHARACTERS[cls].maxHp);assert.equal(p.resource,40);assert.equal(p.ultimate,0);
  const n=resolveRound(s,basics(s));assert.equal(n.party[0].resource,60);assert.equal(n.boss.hp,1800);assert.equal(n.party[0].ultimate,15);
  assert.equal(s.boss.hp,2000);
 });
}
test("resource validation rejects entire round before effects; duplicates and KO invalid",()=>{
 const s=createCombat(["MAGE"],3,true);s.party[0].resource=20;
 assert.throws(()=>resolveRound(s,[action(s,"mage","mage.overcharge")]),/Requires 40/);
 assert.equal(s.boss.hp,2000);assert.equal(s.party[0].resource,20);
 assert.throws(()=>resolveRound(s,[basics(s)[0],basics(s)[0]]),/DUPLICATE/);
 s.party[0].hp=0;assert.equal(isPartyWiped(s),true);assert.throws(()=>resolveRound(s,[action(s,"mage","mage.arcane_bolt")]),/KO/);
});
test("Overcharge uses 40 Mana; failed still produces 40% output",()=>{
 const s=createCombat(["MAGE"],2,true),a=action(s,"mage","mage.overcharge","FAILED");
 const n=resolveRound(s,[a]);assert.equal(n.party[0].resource,0);assert.equal(n.boss.hp,1840);assert.equal(n.party[0].ultimate,0);
});
test("every ultimate needs 100 and consumes it",()=>{
 for(const k of Object.values(SKILL_BY_ID).filter(k=>k.ultimate)){
  const s=createCombat([k.classId],9,true);assert.ok(unavailableReason(s.party[0],k));s.party[0].ultimate=100;
  const n=resolveRound(s,[action(s,s.party[0].id,k.id)]);assert.equal(n.party[0].ultimate,0,k.id);
  if(k.base>0&&k.type==="OFFENSE")assert.ok(n.boss.hp<s.boss.hp,k.id);
 }
});
test("Shield Wall activates before boss and combines by highest-only",()=>{
 const s=createCombat(["WARRIOR"],2),n=resolveRound(s,[action(s,"warrior","warrior.shield_wall","PERFECT")]);
 assert.equal(magnitude(n,"SHIELD_WALL","party"),.5);assert.equal(n.phase,"DEFENSIVE_REACTION");
 putEffect(n,"BASTION_PARTY","warrior","party",.4,n.turn);
 assert.equal(incomingDamage(n,n.party[0],110,"SUCCESS"),19);
 const done=resolveReaction(n,"SUCCESS");assert.equal(done.party[0].hp,631);assert.equal(magnitude(done,"SHIELD_WALL","party"),0);
});
test("Last Bastion redirects and installs tiered party/personal mitigation",()=>{
 const s=createCombat(["MAGE","WARRIOR"],2);s.party[1].ultimate=100;
 const n=resolveRound(s,[action(s,"warrior","warrior.last_bastion","PERFECT"),action(s,"mage","mage.arcane_bolt")],()=>.99);
 assert.equal(n.pending?.kind,"REACTION");if(n.pending?.kind==="REACTION")assert.equal(n.pending.actorId,"warrior");
 assert.equal(magnitude(n,"BASTION_PARTY","party"),.5);assert.equal(magnitude(n,"BASTION_PERSONAL","warrior"),.3);
});
test("Provoke success state and guarantee survive failed refresh",()=>{
 const s=createCombat(["WARRIOR","MAGE"],5,true);
 const n=resolveRound(s,[action(s,"warrior","warrior.provoke"),action(s,"mage","mage.arcane_bolt")]);
 assert.equal(magnitude(n,"PROVOKE","warrior"),1);
 putEffect(n,"PROVOKE","warrior","warrior",4,n.turn+2);
 assert.equal(selectTarget(n,()=>.99),"warrior");
});
test("Frost Seal damages and weakens one damaging action",()=>{
 const s=createCombat(["MAGE"],1),n=resolveRound(s,[action(s,"mage","mage.frost_seal","PERFECT")]);
 assert.equal(n.party[0].resource,10);assert.equal(magnitude(n,"FROST","boss"),.3);
 const done=resolveReaction(n,"FAILED");assert.equal(magnitude(done,"FROST","boss"),0);
});
test("Focus is consumed by next offensive action, reaction bonus separately",()=>{
 let s=createCombat(["THIEF"],1,true);s=resolveRound(s,[action(s,"thief","thief.focus_stance","PERFECT")]);
 assert.equal(s.party[0].resource,20);assert.equal(magnitude(s,"FOCUS_DAMAGE","thief"),.4);
 const n=resolveRound(s,[action(s,"thief","thief.quick_strike","PERFECT")]);
 assert.equal(magnitude(n,"FOCUS_DAMAGE","thief"),0);assert.equal(magnitude(n,"FOCUS_TIME","thief"),3000);
 assert.ok(n.events.some(e=>e.type==="DAMAGE"&&e.amount===473));
});
test("Expose precedes Mage action and enhances subsequent damage only",()=>{
 const s=createCombat(["THIEF","MAGE"],1,true);
 const n=resolveRound(s,[action(s,"thief","thief.expose_weakness","PERFECT"),action(s,"mage","mage.arcane_bolt")]);
 const e=n.events.findIndex(e=>e.type==="EFFECT_APPLIED"),m=n.events.findIndex(e=>e.type==="DAMAGE"&&e.actorId==="mage");
 assert.ok(e>=0&&m>e);assert.equal(n.party[0].resource,10);
 const baseline=resolveRound(s,basics(s));
 assert.ok(n.events.find(e=>e.type==="DAMAGE"&&e.actorId==="mage")!.amount!>baseline.events.find(e=>e.type==="DAMAGE"&&e.actorId==="mage")!.amount!);
});
test("Shadow Execution factor caps at 1.8",()=>{
 const s=createCombat(["THIEF"],1,true);s.party[0].ultimate=100;s.boss.hp=100;
 const n=resolveRound(s,[action(s,"thief","thief.shadow_execution")]);
 // Phase starts at 1 in this fixture, so 250 * solo resonance 2.5 * 1.8.
 assert.equal(n.events.find(e=>e.type==="DAMAGE")?.amount,1125);assert.equal(n.phase,"VICTORY");
});
test("Healing Wave clamps overheal and skips KO",()=>{
 const s=createCombat(["HEALER","WARRIOR"],1,true);s.party[1].hp=642;
 const n=resolveRound(s,[action(s,"healer","healer.healing_wave"),action(s,"warrior","warrior.slash")]);
 assert.equal(n.party[1].hp,650);assert.equal(n.party[0].resource,5);
 const ko=createCombat(["HEALER","WARRIOR"],1,true);ko.party[1].hp=0;
 assert.equal(resolveRound(ko,[action(ko,"healer","healer.healing_wave")]).party[1].hp,0);
});
test("Divine Recovery heals, cleanses one and revives 30% without double heal",()=>{
 const s=createCombat(["HEALER","WARRIOR"],1,true);s.party[0].hp=100;s.party[0].ultimate=100;s.party[1].hp=0;
 putEffect(s,"ROAR","boss","healer",.15,3,1,true,true);
 const n=resolveRound(s,[action(s,"healer","healer.divine_recovery")]);
 assert.equal(n.party[0].hp,253);assert.equal(n.party[1].hp,195);
 assert.equal(n.effects.some(e=>e.type==="ROAR"),false);
 assert.equal(n.events.some(e=>e.actorId==="warrior"&&e.type==="ACTION_RESOLVED"),false);
});
test("Blessing applies now; time bonus appears next round",()=>{
 const s=createCombat(["HEALER","MAGE"],1,true);
 const n=resolveRound(s,[action(s,"healer","healer.blessing"),action(s,"mage","mage.arcane_bolt")]);
 assert.equal(magnitude(n,"BLESSING","party"),.15);assert.equal(magnitude(n,"BLESSING_TIME","party"),3000);
 assert.equal(n.party[0].resource,10);
});
test("combo counts full successful round; any failure or auto breaks it",()=>{
 const s=createCombat(undefined,1,true),n=resolveRound(s,basics(s));assert.equal(n.combo,.15);assert.equal(n.party[0].ultimate,20);
 const a=basics(s);a[1].performance="FAILED";assert.equal(resolveRound(s,a).combo,0);
 const auto=resolveRound(s,[]);assert.equal(auto.combo,0);assert.equal(auto.party[0].resource,50);assert.equal(auto.party[0].ultimate,0);
});
test("boss and shield/core scale for locked roster",()=>{
 assert.deepEqual([1,2,3,4].map(bossHp),[2000,3200,4400,5600]);
 assert.deepEqual([1,2,3,4].map(coreHp),[350,450,550,650]);
 assert.deepEqual([1,2,3,4].map(barrierHp),[500,650,800,950]);
 assert.deepEqual([1,2,3,4].map(runeRequired),[1,2,3,3]);
});
test("phase boundaries are strict and transitions happen once",()=>{
 const s=createCombat();s.boss.hp=s.boss.maxHp*.6;updatePhase(s);assert.equal(s.boss.phase,1);
 s.boss.hp--;updatePhase(s);assert.equal(s.boss.phase,2);
 s.boss.hp=s.boss.maxHp*.25;updatePhase(s);assert.equal(s.boss.phase,2);
 s.boss.hp--;updatePhase(s);updatePhase(s);assert.equal(s.boss.phase,3);assert.equal(s.events.filter(e=>e.type==="BOSS_PHASE_CHANGED").length,2);
});
test("seeded weighted threat approximates baseline and excludes KO",()=>{
 const s=createCombat(),count:Record<string,number>={warrior:0,mage:0,thief:0,healer:0};
 for(let i=0;i<10000;i++)count[selectTarget(s)]++;
 for(const [id,expected] of Object.entries({warrior:.45,healer:.25,mage:.17,thief:.13}))assert.ok(Math.abs(count[id]/10000-expected)<.02,id);
 s.party[0].hp=0;for(let i=0;i<50;i++)assert.notEqual(selectTarget(s),"warrior");
});
test("Spear cooldown and context-aware utility",()=>{
 const s=createCombat();s.boss.cycle=3;s.boss.lastSpearRound=1;s.turn=2;assert.equal(selectBossAction(s).skill,"CLAW");
 s.turn=4;assert.equal(selectBossAction(s).skill,"SPEAR");
 s.boss.cycle=1;for(const p of s.party)putEffect(s,"ROAR","boss",p.id,.15,10,1,true,true);
 assert.equal(selectBossAction(s).skill,"ARMOR");putEffect(s,"ARMOR","boss","boss",.3,10);assert.equal(selectBossAction(s).skill,"CLAW");
});
test("Barrier rune threshold frozen, partial successes do not break, normal damage hits shield",()=>{
 const s=createCombat();applyBossIntent(s,{skill:"BARRIER"});
 assert.equal(s.boss.shield,950);assert.equal(s.pending?.kind,"RUNE");
 const failed=resolveRune(s,{warrior:"SUCCESS",mage:"SUCCESS"});assert.equal(failed.boss.shield,950);
 const broken=resolveRune(s,{warrior:"SUCCESS",mage:"SUCCESS",thief:"SUCCESS"});assert.equal(broken.boss.shield,0);
 const hit=resolveRound(failed,basics(failed));assert.ok(hit.boss.shield<950);assert.equal(hit.boss.hp,s.boss.hp);
});
test("Heavy gives full next planning phase; destroyed Core reduces Cataclysm to 40%; reset and lockout",()=>{
 const s=createCombat();s.boss.rage=100;
 const charged=resolveRound(s,basics(s,"FAILED"));assert.equal(charged.phase,"COMBAT_PLANNING");assert.equal(charged.turn,2);assert.equal(charged.boss.heavy,"CORE_EXPOSED");assert.equal(charged.boss.core?.hp,650);
 const hp=charged.party.find(p=>p.id==="mage")!.hp;
 const done=resolveRound(charged,basics(charged,"PERFECT","core"));
 assert.ok(done.events.some(e=>e.type==="CORE_DESTROYED"));assert.equal(hp-done.party.find(p=>p.id==="mage")!.hp,44);
 assert.equal(done.boss.rage,0);assert.equal(done.boss.normalSinceHeavy,0);
 done.boss.rage=100;assert.notEqual(selectBossAction(done).skill,"CHARGE");done.boss.normalSinceHeavy=1;assert.notEqual(selectBossAction(done).skill,"CHARGE");done.boss.normalSinceHeavy=2;assert.equal(selectBossAction(done).skill,"CHARGE");
});
test("reaction tiers and Healer Ward cannot self-revive",()=>{
 const thief=createCombat(["THIEF"]);const t=resolveRound(thief,basics(thief));assert.equal(resolveReaction(t,"PERFECT").party[0].hp,450);
 const healer=createCombat(["HEALER"]);healer.party[0].hp=1;const h=resolveRound(healer,basics(healer));const n=resolveReaction(h,"SUCCESS");assert.equal(n.party[0].hp,0);assert.equal(n.phase,"DEFEAT");
});
test("victory skips enemy action; deterministic replay leaves input unchanged",()=>{
 const s=createCombat();s.boss.hp=1;const before=JSON.stringify(s);
 const a=resolveRound(s,basics(s)),b=resolveRound(s,basics(s));
 assert.deepEqual(a,b);assert.equal(JSON.stringify(s),before);assert.equal(a.phase,"VICTORY");assert.equal(a.events.some(e=>e.type==="BOSS_ACTION_SELECTED"),false);
});
