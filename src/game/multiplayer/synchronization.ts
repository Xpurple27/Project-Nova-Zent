import type { CombatEvent } from '../core/types';
import type { CombatSnapshot } from './protocol';
export function newerSnapshot(old:CombatSnapshot|null,next:CombatSnapshot):boolean{return !old||old.sessionId!==next.sessionId||BigInt(next.version)>BigInt(old.version)||(next.version===old.version&&next.serverNow>=old.serverNow);}
export class EventCursor {
 private sequence:number|null=null;
 consume(snapshot:CombatSnapshot):{events:CombatEvent[];gap:boolean}{
  if(this.sequence===null){this.sequence=snapshot.lastEventSeq;return {events:[],gap:false};}
  const ordered=snapshot.events.filter(e=>e.seq>this.sequence!).sort((a,b)=>a.seq-b.seq);
  const gap=!!ordered.length&&ordered[0].seq!==this.sequence+1;
  this.sequence=Math.max(this.sequence,snapshot.lastEventSeq);
  return {events:gap?[]:ordered,gap};
 }
}
export function canonicalState(snapshot:CombatSnapshot):string {
 // Excludes per-client assignments, identity, estimated clock and presentation history.
 return JSON.stringify({session:snapshot.sessionId,room:snapshot.roomId,version:snapshot.version,turn:snapshot.turnId,phase:snapshot.phase,phaseId:snapshot.phaseId,deadline:snapshot.deadline,enemyId:snapshot.enemyId,campaign:snapshot.campaign,party:snapshot.party,boss:snapshot.boss,effects:snapshot.effects,combo:snapshot.combo,lastEventSeq:snapshot.lastEventSeq});
}
/** Snapshot truth is immediate; presentation catches up within 2.16s and never replays a hidden-tab backlog. */
export function presentationEvents(queued:CombatEvent[],incoming:CombatEvent[],hidden:boolean):CombatEvent[]{return hidden?[]:[...queued,...incoming].slice(-12);}
