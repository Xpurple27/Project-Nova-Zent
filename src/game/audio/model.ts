import type {CombatEvent} from '../core/types';
export type MusicState='lobby'|'village'|'exploration'|'ruins'|'normal-combat'|'boss-combat'|'victory'|'defeat';
export type AudioSettings={master:number;music:number;sfx:number;muted:boolean};
export const DEFAULT_AUDIO:AudioSettings={master:.55,music:.3,sfx:.55,muted:true};
const level=(v:unknown,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(1,v)):fallback;
export function audioSettings(v:unknown):AudioSettings{const o=(v&&typeof v==='object'?v:{}) as Partial<AudioSettings>;return {master:level(o.master,DEFAULT_AUDIO.master),music:level(o.music,DEFAULT_AUDIO.music),sfx:level(o.sfx,DEFAULT_AUDIO.sfx),muted:typeof o.muted==='boolean'?o.muted:true};}
export function cueFor(e:CombatEvent):string|null{
 if(e.type==='ACTION_RESOLVED')return e.skillId??'attack';
 if(e.type==='BOSS_ACTION_SELECTED')return e.skillId??'boss_roar';
 return ({ULTIMATE_READY:'ultimate_ready',MATH_PERFECT:'correct',MATH_SUCCESS:'correct',MATH_FAILED:'failed',HEAL:'heal',BLOCKED:'block',PLAYER_REVIVED:'healer.divine_recovery',HEAVY_TELEGRAPH:'heavy_warning',INFERNAL_CORE_SPAWNED:'core',CATACLYSM_RESOLVED:'cataclysm',BARRIER_CREATED:'barrier',BARRIER_BROKEN:'barrier_break',BOSS_PHASE_CHANGED:'rage',BOSS_DEFEATED:'victory',ENEMY_DEFEATED:'victory',PARTY_DEFEATED:'defeat',ACTION_LOCKED:'answer_lock'} as Record<string,string>)[e.type]??null;
}
export class AudioCursor{private sequence=0;consume(e:CombatEvent){if(e.seq<=this.sequence)return null;this.sequence=e.seq;return cueFor(e);}}
// Original motifs, synthesized at runtime. These are not transcriptions of existing music.
export const MUSIC:Record<MusicState,{notes:readonly number[];tempo:number;wave:OscillatorType}>= {
 lobby:{notes:[220,261.63,329.63,293.66],tempo:680,wave:'sine'},village:{notes:[261.63,329.63,392,329.63,293.66,349.23],tempo:720,wave:'sine'},exploration:{notes:[146.83,220,261.63,196],tempo:720,wave:'triangle'},ruins:{notes:[110,130.81,146.83,123.47],tempo:950,wave:'sine'},'normal-combat':{notes:[196,293.66,261.63,220],tempo:360,wave:'triangle'},'boss-combat':{notes:[110,164.81,130.81,146.83],tempo:310,wave:'triangle'},victory:{notes:[261.63,329.63,392,523.25],tempo:550,wave:'sine'},defeat:{notes:[220,196,146.83,110],tempo:1000,wave:'sine'}
};
export function soundSpec(cue:string){let hash=0;for(const c of cue)hash=(hash*31+c.charCodeAt(0))>>>0;const warning=/heavy|CATACLYSM|cataclysm|CHARGE/.test(cue);return {frequency:warning?82:180+hash%600,duration:warning?.65:.15+(hash%3)*.06,wave:(/warrior|CLAW|thief|attack/.test(cue)?'triangle':'sine') as OscillatorType,endFrequency:warning?164:300+hash%300};}
