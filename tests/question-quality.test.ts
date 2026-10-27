import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateQuestionQuality} from '../src/game/questions/quality';
import type {SchoolItem} from '../src/game/questions/validation';
import {applyIntent,advance,startAuthority,publicSnapshot,type BankQuestion,type Context} from '../src/game/multiplayer/server/authority';

function fixture():SchoolItem{return {
 revision_id:crypto.randomUUID(),logical_question_id:'synthetic-quality-only',revision_number:1,school_level:'SMP',question_class_id:'WARRIOR',
 difficulty:'EASY',tags:['ARITHMETIC','SCHOOL_SMP','AFFINITY_WARRIOR'],prompt:'Hitung $6\\times4$.',
 options_json:[{id:'a',text:'$24$'},{id:'b',text:'$10$'},{id:'c',text:'$18$'},{id:'d',text:'$30$'}],correct_option_id:'a',
 explanation_json:{explanation:'Kalikan dua bilangan.',expectedSolution:'6*4',family:'synthetic',affinity:['WARRIOR'],reviewStatus:'reviewed',
 qualityVersion:3,conceptFamily:'synthetic',cognitiveDemand:{tier:'EASY',reason:'Satu operasi perkalian langsung.',reasoningSteps:1},
 distractors:[{optionId:'b',misconception:'Menjumlahkan kedua faktor',valueExpression:'6+4'},{optionId:'c',misconception:'Menggunakan tiga kelompok saja',valueExpression:'6*3'},{optionId:'d',misconception:'Menggunakan lima kelompok',valueExpression:'6*5'}]} as SchoolItem['explanation_json'],
 status:'ACTIVE',content_version:'production-v1',estimated_solve_ms:8000,reviewed_by:'synthetic test'
};}

test('publication requires a rationale for every wrong option and the chosen difficulty',()=>{
 const q=fixture();assert.deepEqual(validateQuestionQuality([q]),{qualityVersion:3,items:1,reviewedDistractors:3,mathSpans:5});
 const missing=structuredClone(q);Object.assign(missing.explanation_json,{distractors:[]});assert.throws(()=>validateQuestionQuality([missing]),/MISSING_DISTRACTOR_REVIEW/);
 const wrongTier=structuredClone(q);Object.assign(wrongTier.explanation_json,{cognitiveDemand:{tier:'HARD',reason:'A sufficiently long but wrong classification.',reasoningSteps:3}});assert.throws(()=>validateQuestionQuality([wrongTier]),/INVALID_DIFFICULTY_RATIONALE/);
 const unsafe=structuredClone(q);unsafe.prompt='Nilai $\\href{https://example.com}{x}$';assert.throws(()=>validateQuestionQuality([unsafe]),/UNSAFE/);
 const raw=structuredClone(q);raw.prompt='Hitung 6 × 4.';assert.throws(()=>validateQuestionQuality([raw]),/UNFORMATTED_MATH/);
});

test('exact audit rejects equivalent fractions, wrong keys, false distractor derivations and a mismatched displayed calculation',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'nova-question-quality-'));
 try{
  const execute=async(q:SchoolItem)=>{const path=join(folder,'private-fixture.json');await writeFile(path,JSON.stringify([q]));const python=process.env.NOVA_QA_PYTHON??(process.platform==='win32'?'python':'python3');const r=spawnSync(python,['scripts/audit-question-math.py',path],{encoding:'utf8'});assert.equal(r.error,undefined);return {status:r.status,report:JSON.parse(r.stdout)};};
  assert.equal((await execute(fixture())).status,0);
  const equivalent=fixture();equivalent.options_json[1].text='$\\frac{48}{2}$';assert.equal((await execute(equivalent)).report.failures[0].error,'EQUIVALENT_OR_AMBIGUOUS_OPTIONS');
  const key=fixture();key.correct_option_id='b';assert.equal((await execute(key)).report.failures[0].error,'INCORRECT_KEY');
  const stem=fixture();stem.prompt='Hitung $6\\times5$.';assert.equal((await execute(stem)).report.failures[0].error,'DISPLAYED_PROMPT_MISMATCH');
  const errorModel=fixture();Object.assign(errorModel.explanation_json,{distractors:[{optionId:'b',misconception:'Synthetic mistake',valueExpression:'6-4'}]});assert.equal((await execute(errorModel)).report.failures[0].error,'DISTRACTOR_DERIVATION_MISMATCH');
 }finally{await rm(folder,{recursive:true,force:true});}
});

test('publishing a replacement bank cannot regrade or reset a challenge already assigned',()=>{
 let nextId=0;const members=[{id:'p0',userId:'u0',classId:'WARRIOR' as const,nickname:'QA',schoolLevel:'SD' as const,seat:0,lastSeen:1000}];
 const old:BankQuestion={id:'old-revision',schoolLevel:'SD',classId:'WARRIOR',difficulty:'EASY',category:'ARITHMETIC',prompt:'Synthetic $1+1$',options:[{id:'a',text:'$2$'},{id:'b',text:'$3$'},{id:'c',text:'$4$'},{id:'d',text:'$5$'}],correct:'a'};
 const context:Context={now:1000,members,bank:[old],id:()=>String(++nextId)};let state=startAuthority('s','r',members,42,context);
 state=applyIntent(state,'u0',{kind:'ACTION',turnId:state.turnId,phaseId:state.phaseId,version:'1',skillId:'warrior.slash',targetId:'boss'},context);
 context.now=4000;state=advance(state,context);const assigned=structuredClone(state.assignments[0]);
 context.bank=[{...old,id:'new-revision',prompt:'Synthetic revised prompt',correct:'b'}];context.now=assigned.startsAt+1000;
 const safe=publicSnapshot(state,'2',context.now,'u0',members);assert.equal(safe.assignment?.prompt,assigned.prompt);assert.equal(safe.assignment?.deadline,assigned.deadline);
 state=applyIntent(state,'u0',{kind:'ANSWER',turnId:state.turnId,phaseId:state.phaseId,version:'2',assignmentId:assigned.id,optionToken:assigned.correctToken},context);
 assert.equal(state.assignments[0].performance,'PERFECT');assert.equal(state.assignments[0].questionId,'old-revision');assert.equal(state.assignments[0].deadline,assigned.deadline);
 for(const forbidden of ['correctToken','expectedSolution','correct_option_id','distractors'])assert.equal(JSON.stringify(safe).includes(forbidden),false);
});
