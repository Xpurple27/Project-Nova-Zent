import type {ActorKind} from './manifest';
import {motionDuration} from './motion';
export type PaintedAsset={source:string;rows:number;columns:4;frame:number;idle:string;kind:ActorKind};
export const PAINTED:Record<ActorKind,PaintedAsset>=Object.fromEntries((['WARRIOR','MAGE','THIEF','HEALER','HOUND','SHAMAN','GUARDIAN'] as ActorKind[]).map(kind=>{const hero=!['HOUND','SHAMAN','GUARDIAN'].includes(kind),id=kind.toLowerCase();return [kind,{kind,source:'/assets/chibi/'+id+'-atlas.webp',rows:hero?6:kind==='GUARDIAN'?4:3,columns:4,frame:hero?192:256,idle:'/assets/chibi/'+id+'-idle.webp'}];})) as Record<ActorKind,PaintedAsset>;
const basic=new Set(['slash','arcaneCast','quickStrike','holyCast']);
const heroSkill:Record<string,number>={shield:16,provoke:17,lastBastion:18,overchargeCast:16,frostCast:17,meteorCast:18,focus:16,exposeWeakness:17,execution:18,healingWave:16,blessing:17,divineRecovery:18,dodge:19,ward:19,barrier:19};
export function paintedSequence(kind:ActorKind,state:string):number[]{
 const hero=PAINTED[kind].rows===6;
 if(hero){
  if(state.startsWith('walk'))return state.endsWith('N')?[12,13,14,15]:state.endsWith('S')?[8,9,10,11]:[4,5,6,7];
  if(state==='ko')return [20,21,22];if(state==='recovery')return [22,21,23,0];if(state==='hurt')return [20,20,0];
  if(basic.has(state))return [0,1,2,3,0];if(heroSkill[state]!==undefined)return [0,heroSkill[state],heroSkill[state],heroSkill[state],0];return [0];
 }
 const boss=kind==='GUARDIAN';
 if(state==='death')return boss?[12,13,14,15]:[8,9,10,11];if(state==='hurt')return boss?[12,12,0]:[8,9,0];
 if(state==='idle')return [0,1,2,3];if(state==='entrance')return [13,8,10,0];if(state==='phase')return [0,8,10,0];
 if(!boss)return [4,5,6,7,0];
 const skills:Record<string,number[]>={claw:[0,4,5,7,0],spear:[0,4,6,7,0],wave:[0,8,11,7,0],roar:[0,8,8,0],armor:[0,9,9,0],barrier:[0,9,9,0],charge:[0,10,10,0],cataclysm:[0,10,11,11,0]};return skills[state]??[0];
}
export function paintedFrame(kind:ActorKind,state:string,elapsed:number,reduced=false):number{
 const frames=paintedSequence(kind,state),loop=state==='idle'||state.startsWith('walk'),duration=motionDuration(state),t=reduced?(state==='ko'||state==='death'?1:.5):loop?Math.max(0,elapsed)%duration/duration:Math.max(0,Math.min(1,elapsed/duration));
 return frames[Math.min(frames.length-1,Math.floor(t*frames.length))];
}
export const PAINTED_ENVIRONMENT={VILLAGE:'/assets/environment/painted/village.webp',FOREST_PATH:'/assets/environment/painted/forest_path.webp',RUINS_PATH:'/assets/environment/painted/ruins_path.webp',ANCIENT_RUINS:'/assets/environment/painted/ancient_ruins.webp',BOSS_CHAMBER:'/assets/environment/painted/boss_chamber.webp'} as const;
export const battleBackdrop=(name:string)=>name==='Shadow Hound'?PAINTED_ENVIRONMENT.FOREST_PATH:name==='Corrupted Shaman'?PAINTED_ENVIRONMENT.RUINS_PATH:PAINTED_ENVIRONMENT.BOSS_CHAMBER;
