import type {BossState,Character,CombatEvent} from '../core/types';
import {combatBeats,type CombatBeat} from './combat';
export const CONCLUSION_TIMING={hit:450,fall:1100,result:2800,end:4200} as const;
export type ConclusionStage='STRIKE'|'HIT'|'FALL'|'RESULT'|'DONE';
export type EncounterConclusion={key:number;before:BossState;after:BossState;party:Character[];attack?:CombatBeat;death:CombatEvent;startedAt:number};
export function conclusionStage(elapsed:number):ConclusionStage{return elapsed<CONCLUSION_TIMING.hit?'STRIKE':elapsed<CONCLUSION_TIMING.fall?'HIT':elapsed<CONCLUSION_TIMING.result?'FALL':elapsed<CONCLUSION_TIMING.end?'RESULT':'DONE';}
/** Input is two accepted authoritative snapshots. Cached old HP is only an animation endpoint. */
export function createConclusion(before:{boss:BossState}|null,after:{boss:BossState;party:Character[]},events:readonly CombatEvent[],startedAt:number):EncounterConclusion|null{
 if(!before||before.boss.hp<=0||after.boss.hp!==0||before.boss.name!==after.boss.name)return null;
 const death=[...events].reverse().find(e=>e.type==='BOSS_DEFEATED'||e.type==='ENEMY_DEFEATED');if(!death)return null;
 const beats=combatBeats(events),attack=[...beats].reverse().find(b=>b.kind==='ACTION'&&b.events.some(e=>e.seq===death.seq))??[...beats].reverse().find(b=>b.kind==='ACTION');
 return {key:death.seq,before:structuredClone(before.boss),after:structuredClone(after.boss),party:structuredClone(after.party),attack,death:structuredClone(death),startedAt};
}
