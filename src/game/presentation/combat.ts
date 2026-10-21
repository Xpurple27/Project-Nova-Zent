import {SKILL_BY_ID} from '../config';
import type {CombatEvent,MathPerformance} from '../core/types';
export type CombatBeat={id:number;lead:CombatEvent;events:CombatEvent[];kind:'ACTION'|'BOSS'|'REACTION'|'MECHANIC';performance?:MathPerformance;durationMs:number};
const notable=new Set(['BOSS_PHASE_CHANGED','BARRIER_CREATED','BARRIER_BROKEN','BARRIER_RUNE_FAILED','HEAVY_TELEGRAPH','INFERNAL_CORE_SPAWNED','CORE_DESTROYED','CATACLYSM_RESOLVED','BOSS_DEFEATED','ENEMY_DEFEATED','PARTY_DEFEATED','TEAM_COMBO','COMBO']);
const results=new Set(['DAMAGE','INCOMING_DAMAGE','HEAL','SHIELD_DAMAGE','BLOCKED','PLAYER_KO','PLAYER_REVIVED','EFFECT_APPLIED','CRITICAL_HIT']);
// The existing authoritative event text ends with this enum; no grade is computed here.
export const eventPerformance=(e:CombatEvent):MathPerformance|undefined=>e.text.match(/(?:—\s*)(PERFECT|SUCCESS|FAILED)$/)?.[1] as MathPerformance|undefined;
/** Group one atomic event batch into readable casts/results. Amounts are copied verbatim. */
export function combatBeats(events:readonly CombatEvent[]):CombatBeat[]{
 const beats:CombatBeat[]=[];let current:CombatBeat|undefined;
 const begin=(e:CombatEvent,kind:CombatBeat['kind'])=>{const k=SKILL_BY_ID[e.skillId??''];current={id:e.seq,lead:e,events:[e],kind,performance:eventPerformance(e),durationMs:kind==='REACTION'?1200:k?.ultimate||/HEAVY|CATACLYSM/.test(e.type)?1400:k?.cost?1100:900};beats.push(current);};
 for(const e of [...events].sort((a,b)=>a.seq-b.seq)){
  if(e.type==='ACTION_RESOLVED')begin(e,'ACTION');
  else if(e.type==='BOSS_ACTION_SELECTED')begin(e,'BOSS');
  else if(e.type==='REACTION_RESOLVED'){
   if(current?.kind==='BOSS'&&!current.events.some(x=>x.type==='BOSS_ACTION_SELECTED')){current.events.push(e);current.lead=e;current.kind='REACTION';current.performance=eventPerformance(e);current.durationMs=1200;}
   else begin(e,'REACTION');
  }else if(notable.has(e.type)){
   // Keep phase/core/shield results attached to their triggering action; the snapshot also shows them persistently.
   if(current&&(current.kind==='ACTION'||current.kind==='BOSS'))current.events.push(e);else begin({...e,actorId:e.type==='TEAM_COMBO'||e.type==='COMBO'?'party':'boss'},'MECHANIC');
  }else if(results.has(e.type)){
   if(current)current.events.push(e);else begin(/^Dark Roar|^Demon Armor|^Dark Chant/.test(e.text)?{...e,actorId:'boss'}:e,e.type==='BLOCKED'||e.type==='INCOMING_DAMAGE'||/^Dark Roar|^Demon Armor|^Dark Chant/.test(e.text)?'BOSS':'MECHANIC');
  }
 }
 return beats;
}
/** Bounded cosmetic playback. Hidden tabs rebase; history keeps every accepted action in the latest batch. */
export class CombatPlayback{
 private through=0;private pending:CombatBeat[]=[];history:CombatBeat[]=[];
 accept(events:readonly CombatEvent[],hidden=false){
  const fresh=events.filter(e=>e.seq>this.through);this.through=Math.max(this.through,...events.map(e=>e.seq));
  if(hidden){this.pending=[];return;}
  const beats=combatBeats(fresh);this.history=[...this.history,...beats].slice(-8);this.pending=[...this.pending,...beats].slice(-6);
 }
 next(){const beat=this.pending.shift();if(!beat)return;return {...beat,durationMs:Math.min(beat.durationMs,this.pending.length>=4?750:1200)};}
 clear(){this.pending=[];}
}
export const impactEvent=(beat:CombatBeat)=>{if(beat.kind==='REACTION')return beat.lead;const e=beat.events.find(e=>['DAMAGE','INCOMING_DAMAGE','HEAL','BLOCKED','SHIELD_DAMAGE'].includes(e.type));return e?{...e,skillId:beat.lead.skillId??e.skillId}:beat.lead;};
export function actorLabel(id:string|undefined,party:readonly {id:string;name:string}[],enemy:string){return id==='boss'?enemy:id==='core'?'Infernal Core':id==='party'?'Party':party.find(p=>p.id===id)?.name??'Party';}
export function skillLabel(beat:CombatBeat){return SKILL_BY_ID[beat.lead.skillId??'']?.name??(beat.kind==='REACTION'?'Defensive reaction':beat.lead.skillId?.startsWith('boss.')?beat.lead.text.split(' — ').at(-1)?.replaceAll('_',' '):beat.lead.text)??'Arcane Formula';}
