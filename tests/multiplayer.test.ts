import test from 'node:test';
import assert from 'node:assert/strict';
import {startAuthority,advance,applyIntent,publicSnapshot,dueAt,type Authority,type Context,type Member,type BankQuestion} from '../src/game/multiplayer/server/authority';
import {SimulatedPersistence} from './helpers/authority-store';
import {canonicalState,EventCursor,newerSnapshot} from '../src/game/multiplayer/synchronization';
import {CHARACTERS} from '../src/game/config';
import type {Intent} from '../src/game/multiplayer/protocol';
import {CLASSES} from '../src/game/core/types';
let serial=0;const id=()=>`00000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`;
const bank:BankQuestion[]=['EASY','MEDIUM','HARD'].map((difficulty)=>({id:id(),difficulty:difficulty as BankQuestion['difficulty'],category:'ARITHMETIC',prompt:'2 + 2 = ?',options:[{id:'a',text:'4'},{id:'b',text:'3'},{id:'c',text:'2'},{id:'d',text:'1'}],correct:'a'}));
function setup(n=4){const members:Member[]=CLASSES.slice(0,n).map((classId,seat)=>({id:id(),userId:id(),classId,nickname:classId,seat,lastSeen:100000}));const c:Context={now:100000,members,bank,id};const d=startAuthority(id(),id(),members,23,c);return {c,d};}
function action(d:Authority,c:Context,index=0,skillId?:string,targetId='boss'){
 const m=c.members[index];return applyIntent(d,m.userId,{kind:'ACTION',turnId:d.turnId,phaseId:d.phaseId,version:'1',skillId:skillId??CHARACTERS[m.classId].basic,targetId},c);
}
function answer(d:Authority,c:Context,index=0,correct=true){const q=d.assignments.filter(a=>a.performance===null)[index];return applyIntent(d,c.members.find(m=>m.id===q.actorId)!.userId,{kind:'ANSWER',turnId:d.turnId,phaseId:d.phaseId,version:'1',assignmentId:q.id,optionToken:correct?q.correctToken:q.options.find(o=>o.token!==q.correctToken)!.token},c);}
function tick(d:Authority,c:Context){c.now=Math.max(c.now,dueAt(d)??c.now);c.members.forEach(m=>{if(!m.left)m.lastSeen=c.now;});return advance(d,c);}
test('parallel planning, timeouts, assignment ownership, reconnect deadline and safe snapshot',()=>{
 const {c,d:initial}=setup();let d=action(initial,c);const early=advance(d,c);assert.equal(early.phase,'COMBAT_PLANNING');
 c.now+=12000;d=advance(d,c);assert.equal(d.phase,'MATH_CHALLENGE');assert.equal(d.assignments.length,1);assert.equal(Object.values(d.actions).filter(a=>a.origin==='AUTO').length,3);
 const q=d.assignments[0],snap=publicSnapshot(d,'2',c.now,c.members[0].userId,c.members);
 const text=JSON.stringify(snap);assert.ok(!text.includes('correctToken'));assert.ok(!text.includes('questionId'));assert.ok(!text.includes('selectedToken'));assert.equal(snap.assignment?.deadline,q.deadline);
 assert.equal(publicSnapshot(d,'2',c.now,c.members[1].userId,c.members).assignment,null);
 assert.throws(()=>applyIntent(d,c.members[1].userId,{kind:'ANSWER',turnId:d.turnId,phaseId:d.phaseId,version:'2',assignmentId:q.id,optionToken:q.correctToken},c),/INVALID_ASSIGNMENT/);
 c.now=q.deadline;assert.throws(()=>answer(d,c),/DEADLINE_EXPIRED/);d=advance(d,c);assert.equal(d.phase,'COMBAT_RESOLUTION');assert.equal(d.engine.combo,0);assert.equal(d.engine.party[1].resource,50);
});
test('locked action and stale turn/phase cannot overwrite or spend twice',()=>{
 const {c,d:initial}=setup();const d=action(initial,c);assert.deepEqual(action(d,c),d);
 assert.throws(()=>action(d,c,0,'warrior.shield_wall'),/ACTION_LOCKED/);
 assert.throws(()=>applyIntent(d,c.members[0].userId,{kind:'ACTION',turnId:id(),phaseId:d.phaseId,version:'1',skillId:'warrior.slash',targetId:'boss'},c),/STALE_TURN/);
 assert.throws(()=>applyIntent(d,c.members[0].userId,{kind:'ACTION',turnId:d.turnId,phaseId:id(),version:'1',skillId:'warrior.slash',targetId:'boss'},c),/STALE_PHASE/);
});
test('different difficulty deadlines do not resolve remaining players early',()=>{
 const {c,d:initial}=setup(2);let d=action(action(initial,c),c,1,'mage.overcharge');d=tick(d,c);c.now=d.assignments[0].deadline;d=advance(d,c);
 assert.equal(d.phase,'MATH_CHALLENGE');assert.equal(d.assignments[0].performance,'FAILED');assert.equal(d.assignments[1].performance,null);
 c.now=d.assignments[1].startsAt+13000;d=answer(d,c);assert.equal(d.assignments[1].performance,'SUCCESS');d=advance(d,c);assert.equal(d.phase,'COMBAT_RESOLUTION');
});
test('boss intent frozen, defensive reaction timeout and turn expiration',()=>{
 const {c,d:initial}=setup();let d=initial;for(let i=0;i<4;i++)d=action(d,c,i);d=tick(d,c);c.now=d.assignments[0].startsAt+200;for(let i=0;i<4;i++)d=answer(d,c);d=advance(d,c);d=tick(d,c);assert.equal(d.phase,'BOSS_ACTION');const target=d.intent!.targetId;
 c.members.find(m=>m.id===target)!.lastSeen=0;d=tick(d,c);assert.equal(d.phase,'DEFENSIVE_REACTION');assert.equal(d.engine.pending?.kind,'REACTION');
 const before=d.engine.party.find(p=>p.id===target)!.hp;c.now=d.deadline!;d=advance(d,c);assert.equal(d.phase,'TURN_END');assert.ok(d.engine.party.find(p=>p.id===target)!.hp<before);assert.equal(d.engine.events.filter(e=>e.type==='REACTION_RESOLVED').length,1);
 const same=advance(d,c);assert.deepEqual(same,d);d=tick(d,c);assert.equal(d.engine.turn,2);
});
test('Core destruction, barrier threshold and phase changes are once-only',()=>{
 const {c,d:initial}=setup();let d=initial;d.engine.boss.rage=100;
 for(let i=0;i<4;i++)d=action(d,c,i);d=tick(d,c);c.now=d.assignments[0].startsAt+20;for(let i=0;i<4;i++)d=answer(d,c);d=advance(d,c);d=tick(d,c);d=tick(d,c);assert.equal(d.engine.boss.core?.hp,650);d=tick(d,c);
 for(let i=0;i<4;i++)d=action(d,c,i,undefined,'core');d=tick(d,c);c.now=d.assignments.find(q=>q.performance===null)!.startsAt+20;for(let i=0;i<4;i++)d=answer(d,c);d=advance(d,c);assert.equal(d.engine.events.filter(e=>e.type==='CORE_DESTROYED').length,1);
 d=tick(d,c);d=tick(d,c);assert.equal(d.engine.boss.rage,0);assert.equal(d.engine.events.filter(e=>e.type==='CATACLYSM_RESOLVED').length,1);
});
class MemoryStore extends SimulatedPersistence {
 constructor(n=4){const {c,d}=setup(n);super({sessionId:d.sessionId,roomId:d.roomId,state:'STORY',version:'1',now:c.now,document:null,members:c.members,seed:'00000001-0000-4000-8000-000000000001'},bank,id);}
}
test('CAS service: duplicate Start, simultaneous Ultimate/action, duplicate answer, competing resolvers',async()=>{
 const store=new MemoryStore();const uid=store.value.members[0].userId;
 const started=await Promise.all([store.run(uid,{kind:'START'}),store.run(uid,{kind:'START'})]);assert.equal(started[0].turnId,started[1].turnId);assert.equal(store.value.document!.engine.events.filter(e=>e.type==='SESSION_STARTED').length,1);
 store.value.document!.engine.party[0].ultimate=100;
 const snap=await store.run(uid,{kind:'GET'});const intent:Intent={kind:'ACTION',turnId:snap.turnId,phaseId:snap.phaseId,version:snap.version,skillId:'warrior.last_bastion',targetId:'boss'};const key=id();await Promise.all([store.run(uid,intent,key),store.run(uid,intent,key)]);assert.equal(Object.keys(store.value.document!.actions).length,1);
 await store.tick();let s=await store.run(uid,{kind:'GET'});store.value.now=s.assignment!.startsAt+10;const q=store.value.document!.assignments[0];const ans:Intent={kind:'ANSWER',turnId:s.turnId,phaseId:s.phaseId,version:s.version,assignmentId:q.id,optionToken:q.correctToken};const answerKey=id();await Promise.all([store.run(uid,ans,answerKey),store.run(uid,ans,answerKey)]);assert.equal(store.value.document!.engine.events.filter(e=>e.type==='MATH_PERFECT').length,1);
 await Promise.all([store.run(uid,{kind:'PUMP'}),store.run(uid,{kind:'PUMP'})]);assert.equal(store.value.document!.engine.party[0].ultimate,0);assert.equal(store.value.document!.engine.events.filter(e=>e.type==='ACTION_RESOLVED'&&e.actorId===store.value.members[0].id).length,1);assert.ok(store.conflicts>0);
 s=await store.run(uid,{kind:'GET'});assert.equal(s.phase,'COMBAT_RESOLUTION');
});
for(const n of [1,2,4])test(`${n}-player full server simulation reaches one shared victory with Rune/Core and reconnect`,async()=>{
 const store=new MemoryStore(n),uid=store.value.members[0].userId;let snap=await store.run(uid,{kind:'START'});let guard=0;
 while(!['VICTORY','DEFEAT'].includes(snap.phase)&&guard++<120){
  const d=store.value.document!;
  if(snap.phase==='COMBAT_PLANNING'){
   // Guard and occasional heal extend this test enough to exercise Heavy and Barrier without debug mutation.
   for(let i=0;i<n;i++){
    const m=store.value.members[i],p=d.engine.party[i];if(p.hp<=0||p.active===false)continue;
    const skill=m.classId==='WARRIOR'&&p.resource>=30&&d.engine.turn%3===0?'warrior.shield_wall':m.classId==='HEALER'&&p.resource>=35&&d.engine.party.some(p=>p.hp<p.maxHp-100)?'healer.healing_wave':CHARACTERS[m.classId].basic;
    await store.run(m.userId,{kind:'ACTION',turnId:d.turnId,phaseId:d.phaseId,version:snap.version,skillId:skill,targetId:d.engine.boss.core?.hp?'core':'boss'});
   }
   snap=await store.tick();continue;
  }
  const context=snap.phase==='MATH_CHALLENGE'?'ACTION':snap.phase==='DEFENSIVE_REACTION'?'REACTION':snap.phase==='TEAM_RUNE'?'TEAM_RUNE':null;
  if(context){
   const pending=d.assignments.filter(q=>q.context===context&&q.performance===null);
   for(const q of pending){store.value.now=q.startsAt+100;const m=store.value.members.find(m=>m.id===q.actorId)!;const reconnect=await store.run(m.userId,{kind:'GET'});if(reconnect.phaseId!==d.phaseId)continue;assert.equal(reconnect.assignment!.id,q.id);await store.run(m.userId,{kind:'ANSWER',turnId:d.turnId,phaseId:d.phaseId,version:reconnect.version,assignmentId:q.id,optionToken:q.correctToken});}
   snap=await store.run(uid,{kind:'PUMP'});continue;
  }
  snap=await store.tick();
 }
 assert.equal(snap.phase,'VICTORY',`${n}P ended ${snap.phase}, HP ${snap.boss.hp}`);assert.equal(snap.events.filter(e=>e.type==='BOSS_DEFEATED').length,1);
 const all=await Promise.all(store.value.members.map(m=>store.run(m.userId,{kind:'GET'})));assert.equal(new Set(all.map(canonicalState)).size,1);
 assert.ok(guard<120);console.log(`SIMULATION ${n}P: ${snap.turn} rounds, ${snap.lastEventSeq} events, ${snap.phase}`);
});
test('client duplicate/out-of-order/gap snapshots do not replay events',()=>{
 const {d,c}=setup();let s=publicSnapshot(d,'3',c.now);const cursor=new EventCursor();assert.deepEqual(cursor.consume(s).events,[]);assert.equal(cursor.consume(s).events.length,0);
 s={...s,lastEventSeq:4,events:[{seq:4,turn:1,type:'DAMAGE',text:'hit'}]};assert.equal(cursor.consume(s).gap,true);assert.equal(cursor.consume(s).events.length,0);assert.equal(newerSnapshot(s,{...s,version:'2'}),false);
});
test('victory at Rage100 cancels boss/Core; repeated pump cannot repeat terminal events',async()=>{
 const store=new MemoryStore(1),uid=store.value.members[0].userId;let s=await store.run(uid,{kind:'START'});store.value.document!.engine.boss.hp=1;store.value.document!.engine.boss.rage=100;
 await store.run(uid,{kind:'ACTION',turnId:s.turnId,phaseId:s.phaseId,version:s.version,skillId:'warrior.slash',targetId:'boss'});s=await store.tick();store.value.now=s.assignment!.startsAt+1;const q=store.value.document!.assignments[0];await store.run(uid,{kind:'ANSWER',turnId:s.turnId,phaseId:s.phaseId,version:s.version,assignmentId:q.id,optionToken:q.correctToken});s=await store.run(uid,{kind:'PUMP'});
 assert.equal(s.phase,'VICTORY');for(let i=0;i<3;i++)s=await store.run(uid,{kind:'PUMP'});assert.equal(s.events.filter(e=>e.type==='VICTORY').length,1);assert.equal(s.boss.core,null);assert.equal(s.events.some(e=>e.type==='BOSS_ACTION_SELECTED'),false);
});
test('Defeat and inactive/suspended recovery are deterministic',()=>{
 const {c,d:initial}=setup(1);let d=initial;d.engine.party[0].hp=1;d=tick(d,c);d=tick(d,c);d=tick(d,c);d=tick(d,c);c.now=d.deadline!;d=advance(d,c);assert.equal(d.phase,'DEFEAT');assert.deepEqual(advance(d,c),d);
 const disconnected=setup(1);disconnected.c.members[0].lastSeen=0;disconnected.c.now+=61000;let suspended=startAuthority(id(),id(),disconnected.c.members,1,disconnected.c);assert.equal(suspended.phase,'SUSPENDED');disconnected.c.now+=10000;disconnected.c.members[0].lastSeen=disconnected.c.now;suspended=advance(suspended,disconnected.c);assert.equal(suspended.phase,'COMBAT_PLANNING');assert.equal(suspended.engine.party[0].hp,650);
});
test('persisted JSON key order does not turn an identical lock retry into a new action',()=>{
 const {c,d:initial}=setup(1);const d=action(initial,c);const a=d.actions[c.members[0].id];d.actions[c.members[0].id]=Object.fromEntries(Object.entries(a).sort(([a],[b])=>a.localeCompare(b))) as typeof a;
 assert.equal(Object.keys(action(d,c).actions).length,1);
});
test('same-version older server timestamps cannot rewind the visual clock',()=>{
 const {d,c}=setup();const current=publicSnapshot(d,'2',c.now);assert.equal(newerSnapshot(current,{...current,serverNow:c.now-1000}),false);assert.equal(newerSnapshot(current,{...current,serverNow:c.now+1000}),true);
});
test('a suspended round has one UUID across watchdog polls and reconnect',()=>{
 const {c}=setup(1);c.now+=61000;let d=startAuthority(id(),id(),c.members,1,c);const turnId=d.turnId;
 assert.equal(d.phase,'SUSPENDED');assert.ok(turnId);assert.equal(d.identityRound,d.engine.turn);
 for(let i=0;i<3;i++){c.now+=10000;d=advance(d,c);assert.equal(d.turnId,turnId);assert.equal(d.identityRound,d.engine.turn);}
 c.members[0].lastSeen=c.now;c.now+=10000;d=advance(d,c);assert.equal(d.phase,'COMBAT_PLANNING');assert.equal(d.turnId,turnId);assert.equal(d.engine.events.filter(e=>e.type==='TURN_STARTED').length,1);
});
