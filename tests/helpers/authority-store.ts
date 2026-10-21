import {execute,type Persistence,type Loaded,type Commit} from '../../src/game/multiplayer/server/service';
import type {Authority,BankQuestion} from '../../src/game/multiplayer/server/authority';
import {dueAt} from '../../src/game/multiplayer/server/authority';
import type {CombatSnapshot,Intent} from '../../src/game/multiplayer/protocol';
export class SimulatedPersistence implements Persistence {
 value:Loaded;receipts=new Map<string,{intent:string;result:CombatSnapshot}>();commits=0;conflicts=0;
 constructor(loaded:Loaded,private questions:BankQuestion[],private id:()=>string=()=>crypto.randomUUID()){this.value=loaded;}
 disconnected=new Set<string>();
 disconnect(index:number){this.disconnected.add(this.value.members[index].id);}
 reconnect(index:number){const m=this.value.members[index];this.disconnected.delete(m.id);m.lastSeen=this.value.now;}
 forceDeadline(){this.value.now=this.value.document!.deadline!;}
 debug(edit:(d:Authority)=>void){edit(this.value.document!);}
 async load(_s:string,uid:string|null,_token:string|null,req:string|null,intent:Intent|null){await Promise.resolve();const receipt=req?this.receipts.get(uid+req):null;if(receipt){if(receipt.intent!==JSON.stringify(intent))throw Error('IDEMPOTENCY_KEY_REUSED');return {receipt:structuredClone(receipt.result)} as Loaded;}return structuredClone(this.value);}
 async bank(){return this.questions;}
 async commit(c:Commit){await Promise.resolve();const receipt=c.requestId?this.receipts.get(c.uid+c.requestId):null;if(receipt)return {receipt:structuredClone(receipt.result)};
  if(c.expected!==this.value.version){this.conflicts++;return {conflict:true};}
  if(c.cutoff!==null&&this.value.now>=c.cutoff)return {conflict:true};
  this.value.document=structuredClone(c.document);this.value.version=String(BigInt(this.value.version)+1n);this.commits++;
  const result=c.result?{...c.result,version:this.value.version}:null;
  if(c.requestId&&result)this.receipts.set(c.uid+c.requestId,{intent:JSON.stringify(c.payload),result});return {version:this.value.version,result:result??undefined};
 }
 async run(uid:string,intent:Intent,req=this.id()){return (await execute(this,this.value.sessionId,uid,intent,req,null,this.id))!;}
 async tick(){this.value.now=Math.max(this.value.now,dueAt(this.value.document!)??this.value.now);for(const m of this.value.members)if(!m.left&&!this.disconnected.has(m.id))m.lastSeen=this.value.now;return await this.run(this.value.members[0].userId,{kind:'PUMP'});}
}
