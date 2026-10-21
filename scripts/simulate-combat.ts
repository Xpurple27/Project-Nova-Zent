// Development only. Never imported by application routes or deployed Edge functions.
import {SimulatedPersistence} from '../tests/helpers/authority-store';
import {CLASSES,type CharacterClass} from '../src/game/core/types';
import {CHARACTERS} from '../src/game/config';
import {createHash} from 'node:crypto';
import {canonicalState} from '../src/game/multiplayer/synchronization';
async function main(){
const count=Number(process.argv.find(a=>a.startsWith('--players='))?.split('=')[1]??4);
if(![1,2,3,4].includes(count))throw Error('--players must be 1–4');
const now=100000,id=()=>crypto.randomUUID();
const members=CLASSES.slice(0,count).map((classId,seat)=>({id:id(),userId:id(),classId:classId as CharacterClass,nickname:classId,seat,lastSeen:now}));
const bank=(['EASY','MEDIUM','HARD'] as const).map(difficulty=>({id:id(),difficulty,category:'ARITHMETIC',prompt:'2 + 2 = ?',options:[{id:'0',text:'4'},{id:'1',text:'3'},{id:'2',text:'2'},{id:'3',text:'1'}],correct:'0'}));
const store=new SimulatedPersistence({sessionId:id(),roomId:id(),state:'STORY',version:'1',now,document:null,members,seed:'00000001-0000-4000-8000-000000000001'},bank);
const uid=members[0].userId;let s=await store.run(uid,{kind:'START'}),steps=0;
if(process.argv.includes('--heavy'))store.debug(d=>{d.engine.boss.rage=100;});
while(!['VICTORY','DEFEAT','ABORTED'].includes(s.phase)&&steps++<200){
 const d=store.value.document!;
 if(s.phase==='COMBAT_PLANNING'){
  if(process.argv.includes('--disconnect')&&s.turn===2)store.disconnect(count-1);
  if(process.argv.includes('--disconnect')&&s.turn===4)store.reconnect(count-1);
  for(const member of members){
   const p=d.engine.party.find(p=>p.id===member.id)!;if(p.hp<=0||p.active===false||store.disconnected.has(member.id))continue;
   const skill=member.classId==='WARRIOR'&&p.resource>=30&&s.turn%3===0?'warrior.shield_wall':member.classId==='HEALER'&&p.resource>=35&&d.engine.party.some(p=>p.hp<p.maxHp-100)?'healer.healing_wave':CHARACTERS[member.classId].basic;
   await store.run(member.userId,{kind:'ACTION',turnId:s.turnId,phaseId:s.phaseId,version:s.version,skillId:skill,targetId:d.engine.boss.core?.hp?'core':'boss'});
  }
  s=await store.tick();
 }else if(['MATH_CHALLENGE','DEFENSIVE_REACTION','TEAM_RUNE'].includes(s.phase)){
  const context=s.phase==='MATH_CHALLENGE'?'ACTION':s.phase==='TEAM_RUNE'?'TEAM_RUNE':'REACTION';
  for(const q of d.assignments.filter(a=>a.context===context&&a.performance===null)){
   if(store.disconnected.has(q.actorId))continue;
   store.value.now=q.startsAt+100;
   await store.run(members.find(m=>m.id===q.actorId)!.userId,{kind:'ANSWER',turnId:s.turnId,phaseId:s.phaseId,version:s.version,assignmentId:q.id,optionToken:q.correctToken});
  }
  s=await store.tick();
 }else s=await store.tick();
 console.log('SIMULATION',s.turn,s.phase,'HP',s.boss.hp,'Rage',s.boss.rage,'v'+s.version);
}
console.log('Canonical SHA256',createHash('sha256').update(canonicalState(s)).digest('hex'));
if(!['VICTORY','DEFEAT'].includes(s.phase))throw Error('Simulation did not terminate');

}
main().catch(error=>{console.error(error);process.exitCode=1;});
