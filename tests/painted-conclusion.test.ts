import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,statSync} from 'node:fs';
import {PAINTED,paintedSequence,paintedFrame,PAINTED_ENVIRONMENT} from '../src/game/animation/painted';
import {SKILL_ANIMATIONS} from '../src/game/animation/controller';
import {createCombat,resolvePlayerActions} from '../src/game/combat/engine';
import {createConclusion,conclusionStage,CONCLUSION_TIMING} from '../src/game/presentation/conclusion';
import {HERO_IDENTITY} from '../src/game/animation/identity';

test('all actor atlases decode as real alpha artwork with valid frames, including named enemies',async()=>{
 const {default:sharp}=await import('sharp');let bytes=0;for(const a of Object.values(PAINTED)){const file=readFileSync('public'+a.source),m=await sharp(file).metadata();assert.equal(m.format,'webp');assert.ok(m.hasAlpha);assert.equal(m.width,a.frame*4);assert.equal(m.height,a.frame*a.rows);bytes+=file.length;for(const state of ['idle','hurt','ko','death','claw','spear','cataclysm',...Object.values(SKILL_ANIMATIONS)])for(let t=0;t<2000;t+=80){const f=paintedFrame(a.kind,state,t);assert.ok(f>=0&&f<a.rows*4);}}
 assert.ok(bytes<4*1024*1024);for(const a of Object.values(HERO_IDENTITY)){assert.ok(a.art.startsWith('/assets/chibi/'));assert.ok(statSync('public'+a.art).size>1000);}
});
test('each skill has real painted key poses; walk has four gait phases and distinct front/back rows',()=>{
 const classes={WARRIOR:['slash','shield','provoke','lastBastion'],MAGE:['arcaneCast','overchargeCast','frostCast','meteorCast'],THIEF:['quickStrike','focus','exposeWeakness','execution'],HEALER:['holyCast','healingWave','blessing','divineRecovery']} as const;
 for(const [kind,states]of Object.entries(classes)){const k=kind as keyof typeof classes;assert.equal(new Set(states.map(s=>JSON.stringify(paintedSequence(k,s)))).size,4);assert.deepEqual(paintedSequence(k,'walkE'),[4,5,6,7]);assert.deepEqual(paintedSequence(k,'walkN'),[12,13,14,15]);assert.deepEqual(paintedSequence(k,'walkS'),[8,9,10,11]);assert.equal(paintedFrame(k,'ko',99999),22);assert.equal(paintedFrame(k,'recovery',99999),0);assert.equal(paintedFrame(k,'walkE',180,true),6);}
 for(const kind of ['HOUND','SHAMAN','GUARDIAN'] as const)assert.equal(paintedFrame(kind,'death',99999),PAINTED[kind].rows*4-1);
});
test('all five locations use bounded painted background exports with existing map dimensions',async()=>{
 const {default:sharp}=await import('sharp');for(const src of Object.values(PAINTED_ENVIRONMENT)){const file=readFileSync('public'+src),m=await sharp(file).metadata();assert.equal(m.format,'webp');assert.equal(m.width,1152);assert.equal(m.height,768);assert.ok(file.length<450*1024);}
});
function kill(){const before=createCombat();before.boss.hp=1;const after=resolvePlayerActions(before,before.party.map(p=>({actorId:p.id,skillId:p.classId==='WARRIOR'?'warrior.slash':p.classId==='MAGE'?'mage.arcane_bolt':p.classId==='THIEF'?'thief.quick_strike':'healer.holy_bolt',targetId:'boss',performance:'PERFECT'})));return {before,after,events:after.events.filter(e=>e.seq>(before.events.at(-1)?.seq??0))};}
test('finishing strike keeps original attribution and amounts, then hit/fall/result precede visual exit',()=>{
 const {before,after,events}=kill(),truth=JSON.stringify({before,after,events}),finish=createConclusion(before,after,events,1000);assert.ok(finish);assert.equal(finish.before.hp,1);assert.equal(finish.after.hp,0);assert.ok(finish.attack?.events.some(e=>e.type==='DAMAGE'));assert.ok(finish.attack?.lead.actorId);assert.equal(conclusionStage(0),'STRIKE');assert.equal(conclusionStage(CONCLUSION_TIMING.hit),'HIT');assert.equal(conclusionStage(CONCLUSION_TIMING.fall),'FALL');assert.equal(conclusionStage(CONCLUSION_TIMING.result),'RESULT');assert.equal(conclusionStage(CONCLUSION_TIMING.end),'DONE');assert.equal(JSON.stringify({before,after,events}),truth);
 finish.after.hp=100;assert.equal(after.boss.hp,0);assert.equal(after.phase,'VICTORY');
});
test('refresh/dead snapshots, duplicate victory and unknown death cannot replay a conclusion',()=>{
 const {before,after,events}=kill();assert.equal(createConclusion(null,after,events,0),null);assert.equal(createConclusion(after,after,events,0),null);assert.equal(createConclusion(before,after,[],0),null);assert.equal(createConclusion(before,{...after,boss:{...after.boss,name:'Shadow Hound'}},events,0),null);assert.equal(createConclusion(before,before,events,0),null);
});
