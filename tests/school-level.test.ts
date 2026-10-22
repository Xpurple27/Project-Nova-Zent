import test from 'node:test';import assert from 'node:assert/strict';
import {CLASSES,SCHOOL_LEVELS,type SchoolLevel} from '../src/game/core/types';
import {CHARACTERS} from '../src/game/config';
import {startAuthority,applyIntent,advance,publicSnapshot,type BankQuestion,type Context} from '../src/game/multiplayer/server/authority';
import {validateSchoolQuestionBank,type SchoolItem} from '../src/game/questions/validation';
const difficulties=['EASY','MEDIUM','HARD'] as const;
const bank:BankQuestion[]=SCHOOL_LEVELS.flatMap(schoolLevel=>CLASSES.flatMap(classId=>difficulties.flatMap(difficulty=>Array.from({length:20},(_,i)=>({id:`${schoolLevel}:${classId}:${difficulty}:${i}`,schoolLevel,classId,difficulty,category:'ARITHMETIC',affinity:[classId],prompt:`Private synthetic ${i}`,options:[{id:'a',text:'1'},{id:'b',text:'2'},{id:'c',text:'3'},{id:'d',text:'4'}],correct:'a'})))));
function setup(levels:SchoolLevel[]){let n=0;const members=CLASSES.slice(0,levels.length).map((classId,seat)=>({id:'p'+seat,userId:'u'+seat,classId,nickname:classId,schoolLevel:levels[seat],seat,lastSeen:1000})),c:Context={members,bank,id:()=>String(++n),now:1000};return {c,d:startAuthority('s','r',members,111,c)};}
for(const level of SCHOOL_LEVELS)test(`${level}: all classes and skill tiers stay in the correct school/class pool`,()=>{
 for(const difficulty of difficulties){const {c,d:initial}=setup([level,level,level,level]);let d=initial;
  const skills=difficulty==='EASY'?CLASSES.map(k=>CHARACTERS[k].basic):difficulty==='MEDIUM'?['warrior.shield_wall','mage.frost_seal','thief.expose_weakness','healer.blessing']:['warrior.last_bastion','mage.overcharge','thief.shadow_execution','healer.divine_recovery'];
  for(const [i,m] of c.members.entries()){d.engine.party[i].ultimate=100;d.engine.party[i].resource=100;d=applyIntent(d,m.userId,{kind:'ACTION',turnId:d.turnId,phaseId:d.phaseId,version:'1',skillId:skills[i],targetId:'boss'},c);}
  c.now=13000;d=advance(d,c);
  for(const q of d.assignments){const source=bank.find(b=>b.id===q.questionId)!;assert.equal(source.schoolLevel,level);assert.equal(source.classId,c.members.find(m=>m.id===q.actorId)!.classId);assert.equal(q.schoolLevel,level);}
 }
});
test('mixed levels are frozen per actor on reconnect and never reveal key/history metadata',()=>{
 const {c,d:initial}=setup(['SD','SMP','SMA','SD']);let d=initial;const levels=structuredClone(d.schoolLevels);
 for(const m of c.members)d=applyIntent(d,m.userId,{kind:'ACTION',turnId:d.turnId,phaseId:d.phaseId,version:'1',skillId:CHARACTERS[m.classId].basic,targetId:'boss'},c);
 c.members.forEach(m=>m.schoolLevel='SMA');c.now=13000;d=advance(d,c);assert.deepEqual(d.schoolLevels,levels);
 for(const m of c.members){const s=publicSnapshot(d,'5',c.now,m.userId,c.members);assert.equal(s.schoolLevel,levels![m.id]);assert.equal(s.assignment?.schoolLevel,levels![m.id]);assert.equal(s.assignment?.deadline,d.assignments.find(a=>a.actorId===m.id)!.deadline);for(const forbidden of ['correctToken','correct_option','questionId','question_class_id','explanation_json'])assert.equal(JSON.stringify(s).includes(forbidden),false);}
});
test('an unavailable school/class pool fails closed instead of changing grade',()=>{
 const {c,d:initial}=setup(['SD']);let d=initial;c.bank=bank.filter(q=>q.schoolLevel==='SMA');d=applyIntent(d,'u0',{kind:'ACTION',turnId:d.turnId,phaseId:d.phaseId,version:'1',skillId:'warrior.slash',targetId:'boss'},c);c.now=13000;assert.throws(()=>advance(d,c),/QUESTION_BANK_UNAVAILABLE/);
});
test('reaction and team Rune use the same per-player school/class contract',()=>{
 for(const rune of [false,true]){const {c,d:initial}=setup(['SD','SMP','SMA','SD']);let d=initial;d.phase='BOSS_ACTION';d.deadline=1000;d.intent={skill:rune?'BARRIER':'CLAW',targetId:'p1'};c.now=1001;d=advance(d,c);assert.equal(d.phase,rune?'TEAM_RUNE':'DEFENSIVE_REACTION');for(const a of d.assignments){const q=bank.find(q=>q.id===a.questionId)!;assert.equal(q.schoolLevel,d.schoolLevels![a.actorId]);assert.equal(q.classId,c.members.find(m=>m.id===a.actorId)!.classId);assert.equal(q.difficulty,rune?'MEDIUM':'EASY');}}
});
function syntheticBank():SchoolItem[]{return bank.map(q=>({revision_id:crypto.randomUUID(),logical_question_id:q.id,revision_number:1,difficulty:q.difficulty,tags:['ARITHMETIC','SCHOOL_'+q.schoolLevel,'AFFINITY_'+q.classId],school_level:q.schoolLevel!,question_class_id:q.classId!,prompt:q.id,options_json:q.options,correct_option_id:'a',explanation_json:{explanation:'QA fixture',expectedSolution:'1',family:q.id,affinity:[q.classId!],reviewStatus:'reviewed',schoolLevel:q.schoolLevel,primaryClass:q.classId} as SchoolItem['explanation_json'],status:'ACTIVE',content_version:'production-v1',estimated_solve_ms:1000,reviewed_by:'test'}));}
test('publication requires 60 per school/class, 20 per tier, and consistent classification metadata',()=>{
 const q=syntheticBank(),r=validateSchoolQuestionBank(q);assert.equal(r.count,720);assert.equal(Object.keys(r.coverage).length,36);assert.ok(Object.values(r.coverage).every(n=>n===20));
 const broken=structuredClone(q);broken[0].school_level='SMA';assert.throws(()=>validateSchoolQuestionBank(broken),/INVALID_SCHOOL_CLASSIFICATION/);assert.throws(()=>validateSchoolQuestionBank(q.slice(1)),/INVALID_BANK_SIZE/);
 const skew=structuredClone(q);skew[0].difficulty='MEDIUM';assert.throws(()=>validateSchoolQuestionBank(skew),/INSUFFICIENT/);
});
