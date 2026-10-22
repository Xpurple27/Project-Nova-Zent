'use client';
import {useEffect,useId,useMemo,useRef} from 'react';
import type {ActorKind} from '@/game/animation/manifest';
import {boneTransforms,rigBody,rigSymbols,shardTransform,type RigDirection} from '@/game/animation/rig';
import {poseAt,motionDuration,isTerminalMotion} from '@/game/animation/motion';
/** Disposable vector skeleton. Joint transforms are cosmetic and never acknowledge a game phase. */
export default function RigFigure({kind,state,startedAt=0,phase=1,sampleMs,direction='E'}:{kind:ActorKind;state:string;startedAt?:number;phase?:number;sampleMs?:number;direction?:RigDirection}){
 const svg=useRef<SVGSVGElement>(null),id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const markup=useMemo(()=>({__html:rigSymbols(kind,id,direction)+`<g transform="${direction==='W'?'translate(128 0) scale(-1 1)':''}">${rigBody(kind,id,undefined,direction)}</g>`}),[kind,id,direction]);
 useEffect(()=>{
  const root=svg.current;if(!root)return;const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const bones=Object.fromEntries(Array.from(root.querySelectorAll<SVGGElement>('[data-bone]')).map(el=>[el.dataset.bone!,el]));
  const shards=Array.from(root.querySelectorAll<SVGGElement>('[data-shard]')),core=root.querySelector<SVGGElement>('[data-core]');let frame=0,last=-Infinity,disposed=false;
  const draw=(now:number)=>{
   if(disposed)return;const reduced=media.matches,elapsed=sampleMs??Math.max(0,now-startedAt),pose=poseAt(state,elapsed,reduced);
   if(!document.hidden&&now-last>=1000/30){
    const transforms=boneTransforms(kind,pose);for(const [name,value]of Object.entries(transforms))bones[name]?.setAttribute('transform',value);
    bones.root?.setAttribute('opacity',String(pose.alpha));core?.setAttribute('opacity',String(Math.min(1,pose.core)));
    shards.forEach((shard,i)=>shard.setAttribute('transform',shardTransform(i,pose.shards+Math.max(0,phase-1)*2,pose.shards)));
    root.dataset.motionProgress=String(Math.min(1,elapsed/motionDuration(state)).toFixed(2));root.dataset.motionStatic=String(reduced);last=now;
   }
   if(sampleMs===undefined&&!reduced&&!(isTerminalMotion(state)&&elapsed>=motionDuration(state)+100))frame=requestAnimationFrame(draw);
  };
  const resume=()=>{cancelAnimationFrame(frame);last=-Infinity;frame=requestAnimationFrame(draw);};resume();document.addEventListener('visibilitychange',resume);media.addEventListener('change',resume);
  return()=>{disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',resume);media.removeEventListener('change',resume);};
 },[kind,state,startedAt,phase,sampleMs,direction]);
 return <svg ref={svg} className={'articulated-rig rig-'+kind.toLowerCase()} viewBox={kind==='GUARDIAN'?'-20 -8 296 280':'-12 -10 152 174'} data-rig={kind} data-motion={state} aria-hidden fill="none" dangerouslySetInnerHTML={markup}/>;
}
