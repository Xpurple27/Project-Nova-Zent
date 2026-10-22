import { advance, applyIntent, CombatFault, dueAt, publicSnapshot, startAuthority, type Authority, type BankQuestion, type Member } from './authority';
import type { CombatSnapshot, Intent } from '../protocol';
export type Loaded={campaignEnabled?:boolean;receipt?:CombatSnapshot;sessionId:string;roomId:string;state:string;version:string;now:number;document:Authority|null;members:Member[];seed:string};
export type Commit={sessionId:string;expected:string;document:Authority;projection:CombatSnapshot;due:number|null;uid:string|null;requestId:string|null;payload:Intent|null;result:CombatSnapshot|null;cutoff:number|null};
export interface Persistence {load(sessionId:string,uid:string|null,token:string|null,requestId:string|null,intent:Intent|null):Promise<Loaded>;bank(sessionId:string):Promise<BankQuestion[]>;commit(c:Commit):Promise<{conflict?:boolean;receipt?:CombatSnapshot;version?:string;result?:CombatSnapshot}>;}
export async function execute(p:Persistence,sessionId:string,uid:string|null,intent:Intent,requestId:string|null,token:string|null=null,id=()=>crypto.randomUUID()):Promise<CombatSnapshot|null>{
 for(let attempt=0;attempt<16;attempt++){
  const l=await p.load(sessionId,uid,token,requestId,intent);if(l.receipt)return l.receipt;
  const c={now:l.now,members:l.members,bank:[] as BankQuestion[],id};let d=l.document;
  let mutation=false;
  if(!d){
   if(l.state!=='STORY')throw new CombatFault('ROOM_NOT_STARTED');
   d=startAuthority(l.sessionId,l.roomId,l.members,parseInt(l.seed.replaceAll('-','').slice(0,8),16),c,l.campaignEnabled);mutation=true;
  }
  const read=['GET','START','PUMP'].includes(intent.kind);
  if(read){
   const due=dueAt(d);
   if(due!==null&&due<=l.now){c.bank=await p.bank(l.sessionId);const next=advance(d,c);mutation=JSON.stringify(next)!==JSON.stringify(d)||mutation;d=next;}
   if(!mutation)return uid?publicSnapshot(d,l.version,l.now,uid,l.members):null;
  }else{
   if(!uid)throw new CombatFault('UNAUTHENTICATED');
   if('version' in intent&&(!/^\d+$/.test(intent.version)||BigInt(intent.version)>BigInt(l.version)))throw new CombatFault('STALE_VERSION');
   d=applyIntent(d,uid,intent,c);mutation=true;
  }
  d.engine.events=d.engine.events.slice(-100);
  const nextVersion=(BigInt(l.version)+1n).toString(),result=uid?publicSnapshot(d,nextVersion,l.now,uid,l.members):null;
  const projection=publicSnapshot(d,nextVersion,l.now);
  const cutoff=intent.kind==='ACTION'?l.document?.deadline??null:intent.kind==='ANSWER'?l.document?.assignments.find(q=>q.id===intent.assignmentId&&q.performance===null)?.deadline??null:null;
  const saved=await p.commit({sessionId,expected:l.version,document:d,projection,due:dueAt(d),uid:read?null:uid,requestId:read?null:requestId,payload:read?null:intent,result,cutoff});
  if(saved.conflict)continue;
  if(saved.receipt)return saved.receipt;
  if(!read)return {...result!,version:saved.version!};
 }
 throw new CombatFault('STATE_CONFLICT_RETRY');
}
export function parseIntent(value:unknown):Intent {
 if(!value||typeof value!=='object')throw new CombatFault('INVALID_COMMAND');
 const o=value as Record<string,unknown>;
 const str=(key:string,max=80)=>{const v=o[key];if(typeof v!=='string'||!v.length||v.length>max)throw new CombatFault('INVALID_'+key.toUpperCase());return v;};
 const kind=str('kind');if(kind==='START'||kind==='GET'||kind==='PUMP')return {kind};
 if(kind==='SKIP')return {kind,phaseId:str('phaseId'),version:str('version',20),storyInstance:str('storyInstance')};
 if(kind==='RALLY'){if(typeof o.ready!=='boolean')throw new CombatFault('INVALID_READY');return {kind,phaseId:str('phaseId'),version:str('version',20),sceneToken:str('sceneToken'),ready:o.ready};}
 if(!['ACTION','ANSWER','LEAVE'].includes(kind))throw new CombatFault('INVALID_COMMAND');
 const base={turnId:str('turnId'),phaseId:str('phaseId'),version:str('version',20)};
 if(kind==='ACTION')return {kind,...base,skillId:str('skillId'),targetId:str('targetId'),...(o.reviveTargetId?{reviveTargetId:str('reviveTargetId')}: {})};
 if(kind==='ANSWER')return {kind,...base,assignmentId:str('assignmentId'),optionToken:str('optionToken')};
 return {kind:'LEAVE',...base};
}
