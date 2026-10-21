/** SERVER MODULE: never import from a client component. Keys are private persistence data. */
import { CHARACTERS, GAME, SKILL_BY_ID } from '../../config';
import type { BossAction, CharacterClass, CombatAction, CombatState, QuestionDifficulty } from '../../core/types';
import { gradeAnswer } from '../../core/math';
import { createCombat, decideBoss, finishRound, resolvePlayerActions, resolveReaction, resolveRune, validateAction } from '../../combat/engine';
import { applyBossIntent, event, random } from '../../boss/engine';
import { magnitude } from '../../combat/effects';
import type { CombatSnapshot, Intent, OnlinePhase, SafeAssignment } from '../protocol';
export type Member={id:string;userId:string;classId:CharacterClass;nickname:string;seat:number;lastSeen:number;left?:boolean};
export type BankQuestion={id:string;difficulty:QuestionDifficulty;category:string;prompt:string;options:{id:string;text:string}[];correct:string};
export type Assignment=SafeAssignment & {questionId:string;correctToken:string;answeredAt:number|null;selectedToken:string|null;cancelled?:boolean};
export type Authority={schema:1;sessionId:string;roomId:string;engine:CombatState;turnId:string;identityRound?:number;phase:OnlinePhase;phaseId:string;openedAt:number;deadline:number|null;actors:string[];actions:Record<string,CombatAction>;assignments:Assignment[];used:Record<string,string[]>;intent:BossAction|null;departed:string[];suspendedAt:number|null};
export type Context={now:number;members:Member[];bank:BankQuestion[];id:()=>string};
export class CombatFault extends Error { constructor(public code:string){super(code);} }
function fail(code:string):never {throw new CombatFault(code);}
const terminal=(d:Authority)=>['VICTORY','DEFEAT','ABORTED'].includes(d.phase);
const phaseTransitions:Record<OnlinePhase,readonly OnlinePhase[]>={
 COMBAT_PLANNING:['MATH_CHALLENGE'],MATH_CHALLENGE:['COMBAT_RESOLUTION','VICTORY'],COMBAT_RESOLUTION:['BOSS_ACTION'],
 BOSS_ACTION:['DEFENSIVE_REACTION','TEAM_RUNE','TURN_END','DEFEAT'],DEFENSIVE_REACTION:['TURN_END','DEFEAT'],TEAM_RUNE:['TURN_END','DEFEAT'],
 TURN_END:['COMBAT_PLANNING','VICTORY','DEFEAT','SUSPENDED','ABORTED'],SUSPENDED:['SUSPENDED','COMBAT_PLANNING','DEFEAT','ABORTED'],VICTORY:[],DEFEAT:[],ABORTED:[]
};
function enter(d:Authority,c:Context,phase:OnlinePhase,ms:number|null){
 if(d.phaseId&&!phaseTransitions[d.phase].includes(phase))fail('INVALID_TRANSITION');
 d.phase=phase;d.phaseId=c.id();d.openedAt=c.now;d.deadline=ms===null?null:c.now+ms;
}
function liveMembers(d:Authority,c:Context){return c.members.filter(m=>!m.left&&!d.departed.includes(m.id)&&c.now-m.lastSeen<GAME.reconnectGraceMs);}
function openTurn(d:Authority,c:Context){
 if(d.identityRound!==d.engine.turn){
  d.turnId=c.id();d.identityRound=d.engine.turn;d.actors=[];d.actions={};d.assignments=[];d.intent=null;
  event(d.engine,'TURN_STARTED','Round '+d.engine.turn);
 }
 const active=new Set(liveMembers(d,c).map(m=>m.id));
 for(const p of d.engine.party)p.active=active.has(p.id);
 const eligible=d.engine.party.filter(p=>p.active&&p.hp>0);
 if(!eligible.length){
  if(d.engine.party.some(p=>p.hp>0&&!d.departed.includes(p.id))&&!d.engine.party.some(p=>p.active)){
   d.suspendedAt??=c.now;enter(d,c,c.now-d.suspendedAt>=600000?'ABORTED':'SUSPENDED',10000);return;
  }
  d.engine.phase='DEFEAT';event(d.engine,'PARTY_DEFEATED','DEFEAT — no eligible adventurer remains.');enter(d,c,'DEFEAT',null);return;
 }
 d.suspendedAt=null;d.actors=eligible.map(p=>p.id);d.engine.phase='COMBAT_PLANNING';
 enter(d,c,'COMBAT_PLANNING',GAME.planningMs);
}
export function startAuthority(sessionId:string,roomId:string,members:Member[],seed:number,c:Context):Authority {
 if(!members.length||members.length>4||members.some(m=>!m.classId))fail('INVALID_ROSTER');
 const sorted=[...members].sort((a,b)=>a.seat-b.seat),engine=createCombat(sorted.map(m=>m.classId),seed);
 engine.mode='SERVER';engine.party.forEach((p,i)=>{p.id=sorted[i].id;p.name=sorted[i].nickname;p.seat=sorted[i].seat;});
 const d:Authority={schema:1,sessionId,roomId,engine,turnId:'',phase:'COMBAT_PLANNING',phaseId:'',openedAt:c.now,deadline:null,actors:[],actions:{},assignments:[],used:{},intent:null,departed:[],suspendedAt:null};
 event(engine,'SESSION_STARTED','NOVA ZENITH — Abyss Guardian encounter');openTurn(d,c);return d;
}
function assign(d:Authority,c:Context,actorId:string,difficulty:QuestionDifficulty,context:Assignment['context'],bonus=0){
 const actor=d.engine.party.find(p=>p.id===actorId)!;
 const preferred:Record<CharacterClass,string[]>={WARRIOR:['ARITHMETIC','RATIO'],MAGE:['ALGEBRA'],THIEF:['PATTERN','PROBABILITY'],HEALER:['PERCENTAGE','RATIO']};
 const used=d.used[actorId]??[],all=c.bank.filter(q=>q.difficulty===difficulty);
 if(!all.length)fail('QUESTION_BANK_UNAVAILABLE');
 const fresh=all.filter(q=>!used.includes(q.id)),pool=fresh.length?fresh:all;
 const matches=pool.filter(q=>preferred[actor.classId].includes(q.category));
 const candidates=matches.length?matches:pool,q=candidates[Math.floor(random(d.engine)*candidates.length)];
 const options=q.options.map(o=>({id:o.id,token:c.id(),text:o.text}));
 for(let i=options.length-1;i>0;i--){const j=Math.floor(random(d.engine)*(i+1));[options[i],options[j]]=[options[j],options[i]];}
 const startsAt=c.now+1000;
 d.assignments.push({id:c.id(),actorId,context,difficulty,prompt:q.prompt,options:options.map(({token,text})=>({token,text})),startsAt,deadline:startsAt+GAME.timers[difficulty]+bonus,performance:null,questionId:q.id,correctToken:options.find(o=>o.id===q.correct)!.token,answeredAt:null,selectedToken:null});
 d.used[actorId]=[...used,q.id].slice(-100);
}
function completePhase(d:Authority,c:Context){
 if(d.phase==='COMBAT_PLANNING'){
  for(const id of d.actors){
   const p=d.engine.party.find(p=>p.id===id)!;
   d.actions[id]??={actorId:id,skillId:CHARACTERS[p.classId].basic,targetId:'boss',performance:'FAILED',origin:'AUTO'};
   const a=d.actions[id];
   if(a.origin!=='AUTO')assign(d,c,id,SKILL_BY_ID[a.skillId].difficulty,'ACTION',magnitude(d.engine,'BLESSING_TIME','party'));
  }
  enter(d,c,'MATH_CHALLENGE',0);d.deadline=d.assignments.length?Math.max(...d.assignments.map(a=>a.deadline)):c.now;return;
 }
 if(d.phase==='MATH_CHALLENGE'){
  expire(d,c);
  const actions=Object.values(d.actions).map(a=>({...a,performance:d.assignments.find(q=>q.actorId===a.actorId&&q.context==='ACTION')?.performance??'FAILED'}));
  for(const a of actions)d.actions[a.actorId]=a;
  d.engine=resolvePlayerActions(d.engine,actions);
  if(d.engine.phase==='VICTORY'){enter(d,c,'VICTORY',null);return;}
  enter(d,c,'COMBAT_RESOLUTION',4000);return;
 }
 if(d.phase==='COMBAT_RESOLUTION'){
  d.intent=decideBoss(d.engine);enter(d,c,'BOSS_ACTION',2000);return;
 }
 if(d.phase==='BOSS_ACTION'){
  if(!d.intent)fail('MISSING_BOSS_INTENT');
  applyBossIntent(d.engine,d.intent);
  if(d.engine.pending?.kind==='REACTION'){
   const id=d.engine.pending.actorId;assign(d,c,id,'EASY','REACTION',magnitude(d.engine,'FOCUS_TIME',id));
   enter(d,c,'DEFENSIVE_REACTION',0);d.deadline=d.assignments.at(-1)!.deadline;return;
  }
  if(d.engine.pending?.kind==='RUNE'){
   for(const id of d.engine.pending.actorIds)assign(d,c,id,'MEDIUM','TEAM_RUNE');
   enter(d,c,'TEAM_RUNE',0);d.deadline=Math.max(...d.assignments.filter(a=>a.context==='TEAM_RUNE').map(a=>a.deadline));return;
  }
  endBoss(d,c);return;
 }
 if(d.phase==='DEFENSIVE_REACTION'){
  expire(d,c);d.engine=resolveReaction(d.engine,d.assignments.find(a=>a.context==='REACTION')!.performance??'FAILED',false);endBoss(d,c);return;
 }
 if(d.phase==='TEAM_RUNE'){
  const passed=d.engine.pending?.kind==='RUNE'&&d.assignments.filter(a=>a.context==='TEAM_RUNE'&&a.performance&&a.performance!=='FAILED').length>=d.engine.pending.required;
  if(passed){for(const q of d.assignments.filter(a=>a.context==='TEAM_RUNE'&&a.performance===null))q.cancelled=true;}else expire(d,c);
  const results=Object.fromEntries(d.assignments.filter(a=>a.context==='TEAM_RUNE').map(a=>[a.actorId,a.performance??'FAILED']));
  d.engine=resolveRune(d.engine,results,false);endBoss(d,c);return;
 }
 if(d.phase==='TURN_END'){
  finishRound(d.engine);
  if(d.engine.phase==='VICTORY'||d.engine.phase==='DEFEAT'){enter(d,c,d.engine.phase,null);return;}
  openTurn(d,c);return;
 }
 if(d.phase==='SUSPENDED'){openTurn(d,c);}
}
function endBoss(d:Authority,c:Context){
 if(d.engine.party.filter(p=>p.active!==false).every(p=>p.hp<=0)){finishRound(d.engine);enter(d,c,'DEFEAT',null);return;}
 enter(d,c,'TURN_END',2000);
}
function currentContext(d:Authority):Assignment['context']|null{return d.phase==='MATH_CHALLENGE'?'ACTION':d.phase==='DEFENSIVE_REACTION'?'REACTION':d.phase==='TEAM_RUNE'?'TEAM_RUNE':null;}
function expire(d:Authority,c:Context){
 for(const q of d.assignments.filter(q=>q.context===currentContext(d)&&q.performance===null)){
  q.performance='FAILED';q.answeredAt=c.now;event(d.engine,'MATH_FAILED','Formula expired',undefined,q.actorId);
 }
}
export function dueAt(d:Authority):number|null {
 if(terminal(d))return null;
 if(d.phase==='COMBAT_PLANNING'&&d.actors.every(id=>!!d.actions[id]))return Math.min(d.deadline!,d.openedAt+GAME.minimumPlanningMs);
 const context=currentContext(d),pending=d.assignments.filter(a=>a.context===context);
 if(context){
  if(context==='TEAM_RUNE'&&d.engine.pending?.kind==='RUNE'&&pending.filter(q=>q.performance&&q.performance!=='FAILED').length>=d.engine.pending.required)return d.openedAt;
  if(pending.every(a=>a.performance!==null))return d.openedAt;
  return Math.min(...pending.filter(a=>a.performance===null).map(a=>a.deadline));
 }
 return d.deadline;
}
export function advance(input:Authority,c:Context):Authority {
 const d=structuredClone(input);if(terminal(d))return d;
 const context=currentContext(d);let changed=false;
 if(context)for(const q of d.assignments.filter(q=>q.context===context&&q.performance===null&&q.deadline<=c.now)){
  q.performance='FAILED';q.answeredAt=c.now;event(d.engine,'MATH_FAILED','Formula expired',undefined,q.actorId);changed=true;
 }
 const due=dueAt(d);if(due!==null&&c.now>=due){
  // Per-question deadlines can precede the global phase deadline: expire only that owner and keep waiting.
  const current=d.assignments.filter(q=>q.context===context);
  const runeReady=d.phase==='TEAM_RUNE'&&d.engine.pending?.kind==='RUNE'&&current.filter(q=>q.performance&&q.performance!=='FAILED').length>=d.engine.pending.required;
  if(!context||runeReady||current.every(q=>q.performance!==null)||c.now>=d.deadline!)completePhase(d,c);
 }
 void changed;return d;
}
export function applyIntent(input:Authority,uid:string,intent:Intent,c:Context):Authority {
 if(['GET','START','PUMP'].includes(intent.kind))return input;
 const d=structuredClone(input),member=c.members.find(m=>m.userId===uid);
 if(!member||!d.engine.party.some(p=>p.id===member.id))fail('NOT_A_MEMBER');
 if(!('turnId' in intent)||intent.turnId!==d.turnId)fail('STALE_TURN');
 if(intent.phaseId!==d.phaseId)fail('STALE_PHASE');
 if(terminal(d))fail('ENCOUNTER_FINISHED');
 if(intent.kind==='LEAVE'){
  if(!d.departed.includes(member.id))d.departed.push(member.id);event(d.engine,'PLAYER_LEFT',member.nickname+' left the encounter',undefined,member.id);return d;
 }
 if(intent.kind==='ACTION'){
  if(d.phase!=='COMBAT_PLANNING')fail('INVALID_PHASE');
  const old=d.actions[member.id];
  const k=SKILL_BY_ID[intent.skillId],p=d.engine.party.find(p=>p.id===member.id)!;
  if(!k)fail('INVALID_SKILL');
  const action:CombatAction={actorId:p.id,skillId:k.id,targetId:k.target==='PARTY'?'party':k.target==='SELF'?p.id:k.target==='MAIN_ENEMY'?'boss':intent.targetId,reviveTargetId:intent.reviveTargetId,performance:'FAILED',origin:'MANUAL'};
  if(old){if(old.skillId!==action.skillId||old.targetId!==action.targetId||(old.reviveTargetId??undefined)!==action.reviveTargetId)fail('ACTION_LOCKED');return d;}
  if(c.now>=d.deadline!)fail('DEADLINE_EXPIRED');
  if(!d.actors.includes(member.id)||d.departed.includes(member.id))fail('INACTIVE_ACTOR');
  validateAction(d.engine,action);d.actions[member.id]=action;event(d.engine,'ACTION_LOCKED',p.name+' locked a formula',undefined,p.id);return d;
 }
 if(intent.kind==='ANSWER'){
  const q=d.assignments.find(a=>a.id===intent.assignmentId&&a.actorId===member.id);
  if(!q)fail('INVALID_ASSIGNMENT');
  if(q.performance!==null){if(q.selectedToken!==intent.optionToken)fail('ANSWER_LOCKED');return d;}
  if(q.context!==currentContext(d))fail('STALE_ASSIGNMENT');
  if(c.now<q.startsAt)fail('NOT_AVAILABLE_YET');
  if(c.now>=q.deadline)fail('DEADLINE_EXPIRED');
  if(!q.options.some(o=>o.token===intent.optionToken))fail('INVALID_OPTION');
  q.performance=gradeAnswer(q.correctToken===intent.optionToken,c.now-q.startsAt,q.deadline-q.startsAt);q.answeredAt=c.now;q.selectedToken=intent.optionToken;
  event(d.engine,'MATH_'+q.performance,q.performance==='FAILED'?'FAILED CALCULATION':q.performance,undefined,q.actorId);return d;
 }
 return fail('INVALID_COMMAND');
}
export function publicSnapshot(d:Authority,version:string,now:number,uid?:string,members:Member[]=[]):CombatSnapshot {
 const myActorId=members.find(m=>m.userId===uid)?.id??null;
 const q=d.assignments.find(q=>q.actorId===myActorId&&q.context===currentContext(d));
 const assignment=q?{id:q.id,actorId:q.actorId,context:q.context,difficulty:q.difficulty,prompt:q.prompt,options:q.options,startsAt:q.startsAt,deadline:q.deadline,performance:q.performance}:null;
 return {schema:1,sessionId:d.sessionId,roomId:d.roomId,version,serverNow:now,turnId:d.turnId,turn:d.engine.turn,phase:d.phase,phaseId:d.phaseId,deadline:d.deadline,partySize:d.engine.partySize,party:d.engine.party,boss:d.engine.boss,effects:d.engine.effects,combo:d.engine.combo,pendingBoss:d.intent,progress:d.engine.party.map(p=>({actorId:p.id,locked:!!d.actions[p.id],answered:d.assignments.some(a=>a.actorId===p.id&&a.context===currentContext(d)&&a.performance!==null),performance:d.assignments.find(a=>a.actorId===p.id&&a.context===currentContext(d))?.performance??null})),events:d.engine.events.slice(-50),lastEventSeq:d.engine.nextSeq-1,assignment,myActorId};
}
