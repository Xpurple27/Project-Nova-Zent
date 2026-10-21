import test from 'node:test';import assert from 'node:assert/strict';
import {SimulatedPersistence} from './helpers/authority-store';import {CLASSES,type CombatEvent} from '../src/game/core/types';import {CHARACTERS} from '../src/game/config';import type {BankQuestion} from '../src/game/multiplayer/server/authority';import type {Intent} from '../src/game/multiplayer/protocol';
const bank:BankQuestion[]=['EASY','MEDIUM','HARD'].flatMap(difficulty=>Array.from({length:8},(_,i)=>({id:crypto.randomUUID(),difficulty:difficulty as BankQuestion['difficulty'],category:'ALGEBRA',prompt:`QA ${i}`,options:[{id:'a',text:'1'},{id:'b',text:'2'},{id:'c',text:'3'},{id:'d',text:'4'}],correct:'b'})));
for(const size of [1,2,4])test(`full ${size}P expedition uses ordered encounters and one shared ending`,async()=>{
 const members=CLASSES.slice(0,size).map((classId,seat)=>({id:crypto.randomUUID(),userId:crypto.randomUUID(),classId,nickname:classId,seat,lastSeen:100000}));
 const store=new SimulatedPersistence({sessionId:crypto.randomUUID(),roomId:crypto.randomUUID(),state:'STORY',version:'1',now:100000,document:null,members,seed:crypto.randomUUID(),campaignEnabled:true},bank);
 const uid=members[0].userId,events=new Map<number,CombatEvent>();let s=await store.run(uid,{kind:'START'}),guard=0;
 const remember=()=>{for(const e of s.events)events.set(e.seq,e);};
 while(s.phase!=='COMPLETED'&&s.phase!=='DEFEAT'&&guard++<300){
  for(const m of store.value.members)m.lastSeen=store.value.now;remember();const d=store.value.document!;
  if(s.campaign?.story){for(const m of members)await store.run(m.userId,{kind:'SKIP',phaseId:s.phaseId,version:s.version,storyInstance:s.campaign.story.instanceId});s=await store.run(uid,{kind:'PUMP'});continue;}
  if(s.phase==='EXPLORATION'){for(const m of members){const command:Intent={kind:'RALLY',phaseId:s.phaseId,version:s.version,sceneToken:s.campaign!.sceneToken,ready:true};const key=crypto.randomUUID();await Promise.all([store.run(m.userId,command,key),store.run(m.userId,command,key)]);}s=await store.run(uid,{kind:'PUMP'});continue;}
  if(s.phase==='COMBAT_PLANNING'){
   for(const m of members){const p=d.engine.party.find(p=>p.id===m.id)!;if(p.hp<=0||p.active===false)continue;const skill=p.classId==='HEALER'&&p.resource>=35&&d.engine.party.some(a=>a.hp<a.maxHp-100)?'healer.healing_wave':CHARACTERS[p.classId].basic;await store.run(m.userId,{kind:'ACTION',turnId:s.turnId,phaseId:s.phaseId,version:s.version,skillId:skill,targetId:s.boss.core?.hp?'core':'boss'});}
   s=await store.tick();continue;
  }
  const context=s.phase==='MATH_CHALLENGE'?'ACTION':s.phase==='DEFENSIVE_REACTION'?'REACTION':s.phase==='TEAM_RUNE'?'TEAM_RUNE':null;
  if(context){for(const q of d.assignments.filter(a=>a.context===context&&a.performance===null)){store.value.now=q.startsAt+100;const m=members.find(m=>m.id===q.actorId)!;await store.run(m.userId,{kind:'ANSWER',turnId:s.turnId,phaseId:s.phaseId,version:s.version,assignmentId:q.id,optionToken:q.correctToken});}s=await store.run(uid,{kind:'PUMP'});continue;}
  s=await store.tick();
 }
 remember();assert.equal(s.phase,'COMPLETED');assert.deepEqual(s.campaign!.completed,['shadow-hound','corrupted-shaman','abyss-guardian']);assert.equal([...events.values()].filter(e=>e.type==='ENCOUNTER_STARTED').length,3);assert.equal([...events.values()].filter(e=>e.type==='BOSS_DEFEATED').length,1);assert.equal([...events.values()].filter(e=>e.type==='CUTSCENE_COMPLETED'&&e.text==='ending').length,1);
 const before=s.lastEventSeq;s=await store.run(uid,{kind:'GET'});assert.equal(s.lastEventSeq,before);assert.ok(guard<300);
});
