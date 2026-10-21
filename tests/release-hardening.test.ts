import test from 'node:test';import assert from 'node:assert/strict';
import {presentationEvents} from '../src/game/multiplayer/synchronization';
import {createCombat,resolvePlayerActions,resolveRound,resolveReaction,resolveRune} from '../src/game/combat/engine';
import {updatePhase,selectTarget,incomingDamage,applyBossIntent,runeRequired} from '../src/game/boss/engine';
import {parseIntent} from '../src/game/multiplayer/server/service';
import {putEffect} from '../src/game/combat/effects';
const event=(seq:number)=>({seq,turn:1,type:'DAMAGE',text:'damage'});
test('presentation is bounded and hidden snapshots cannot accumulate audio/VFX backlog',()=>{
 assert.deepEqual(presentationEvents([event(1)],[event(2)],true),[]);
 const q=presentationEvents(Array.from({length:50},(_,i)=>event(i)),[event(50)],false);assert.equal(q.length,12);assert.equal(q.at(-1)?.seq,50);
});
test('phase boundary vectors and a large jump are exact, monotonic and once-only',()=>{
 for(const [ratio,phase] of [[.601,1],[.6,1],[.599,2],[.251,2],[.25,2],[.249,3]]){const s=createCombat();s.boss.hp=s.boss.maxHp*ratio;updatePhase(s);assert.equal(s.boss.phase,phase);}
 const s=createCombat();s.boss.hp=s.boss.maxHp*.2;updatePhase(s);updatePhase(s);assert.equal(s.events.filter(e=>e.type==='BOSS_PHASE_CHANGED').length,2);
});
test('weighted target distribution and inactive/KO exclusion preserve Provoke and redirect',()=>{
 const s=createCombat(),counts=[0,0,0,0];for(let i=0;i<10000;i++){const id=selectTarget(s,()=>i/10000);counts[s.party.findIndex(p=>p.id===id)]++;}assert.deepEqual(counts,[4500,1700,1300,2500]);
 s.party[0].hp=0;s.party[1].active=false;for(let i=0;i<100;i++)assert.ok(['thief','healer'].includes(selectTarget(s,()=>i/100)));
});
test('all four class reaction tiers apply once and reductions compose multiplicatively',()=>{
 const s=createCombat();for(const p of s.party)for(const tier of ['PERFECT','SUCCESS','FAILED'] as const){s.pending={kind:'REACTION',actorId:p.id,intent:{skill:'CLAW',targetId:p.id}};const n=incomingDamage(s,p,110,tier),r=resolveReaction(s,tier,false);assert.equal(r.events.filter(e=>e.type==='REACTION_RESOLVED').length,1);assert.equal(r.party.find(q=>q.id===p.id)!.hp,Math.min(p.maxHp,p.hp-n+(p.classId==='HEALER'?(tier==='PERFECT'?40:tier==='SUCCESS'?20:0):0)));}
 const p=s.party[0];putEffect(s,'SHIELD_WALL','warrior','party',.5,1);putEffect(s,'FROST','mage','boss',.3,1);assert.equal(incomingDamage(s,p,110,'SUCCESS'),Math.floor(110*.7*.5*.8*.5+.5));
});
test('1–4P Rune thresholds and same-round Core retarget are deterministic',()=>{
 for(let n=1;n<=4;n++){const classes=(['WARRIOR','MAGE','THIEF','HEALER'] as const).slice(0,n);const s=createCombat(classes);applyBossIntent(s,{skill:'BARRIER'});assert.equal(runeRequired(n),[1,2,3,3][n-1]);const r=resolveRune(s,Object.fromEntries(s.party.map(p=>[p.id,'SUCCESS'])),false);assert.equal(r.boss.shield,0);assert.equal(r.events.filter(e=>e.type==='BARRIER_BROKEN').length,1);}
 const s=createCombat();s.boss.core={id:'core',hp:1,maxHp:650};const r=resolvePlayerActions(s,s.party.map(p=>({actorId:p.id,skillId:({WARRIOR:'warrior.slash',MAGE:'mage.arcane_bolt',THIEF:'thief.quick_strike',HEALER:'healer.holy_bolt'}[p.classId]),targetId:'core',performance:'SUCCESS',origin:'MANUAL'})));assert.equal(r.events.filter(e=>e.type==='CORE_DESTROYED').length,1);assert.ok(r.boss.hp<s.boss.hp);
});
test('rage100 death wins; client-supplied correctness/damage is discarded',()=>{
 const s=createCombat(['WARRIOR']);s.boss.hp=1;s.boss.rage=100;const r=resolveRound(s,[{actorId:'warrior',skillId:'warrior.slash',targetId:'boss',performance:'SUCCESS',origin:'MANUAL'}]);assert.equal(r.phase,'VICTORY');assert.equal(r.events.filter(e=>e.type==='BOSS_DEFEATED').length,1);assert.equal(r.events.filter(e=>e.type==='INFERNAL_CORE_SPAWNED').length,0);
 assert.deepEqual(parseIntent({kind:'ANSWER',turnId:'a',phaseId:'b',version:'1',assignmentId:'c',optionToken:'d',is_correct:true,performance:'PERFECT',damage:99999}),{kind:'ANSWER',turnId:'a',phaseId:'b',version:'1',assignmentId:'c',optionToken:'d'});
});

import {RequestBudget,limitedBody} from '../src/game/multiplayer/server/http-guard';
test('HTTP guard bounds failed command bursts, expires windows and never evicts active budgets',async()=>{const b=new RequestBudget(2,1000,1);assert.equal(b.allow('a',0),true);assert.equal(b.allow('a',1),true);assert.equal(b.allow('a',2),false);assert.equal(b.allow('b',3),false);assert.equal(b.allow('b',1001),true);const r=new Request('https://example.invalid',{method:'POST',body:'12345'});await assert.rejects(()=>limitedBody(r,4),/PAYLOAD_TOO_LARGE/);assert.equal(await limitedBody(new Request('https://example.invalid',{method:'POST',body:'ok'})), 'ok');});

import {assertProductionEnvironment} from '../src/lib/validation/environment';
test('production boot rejects misnamed public configuration and privileged/nonpublishable keys',()=>{assert.doesNotThrow(()=>assertProductionEnvironment({}));assert.throws(()=>assertProductionEnvironment({VERCEL_ENV:'production',SUPABASE_PUBLISHABLE_KEY:'unused'}),/Missing production/);const env={VERCEL_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',NEXT_PUBLIC_HCAPTCHA_SITE_KEY:'site'};assert.doesNotThrow(()=>assertProductionEnvironment(env));assert.throws(()=>assertProductionEnvironment({...env,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'privileged'}),/publishable key/);});
