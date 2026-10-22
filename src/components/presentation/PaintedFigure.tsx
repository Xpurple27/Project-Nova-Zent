'use client';
import {useEffect,useRef,useState} from 'react';
import type {ActorKind} from '@/game/animation/manifest';
import {PAINTED,paintedFrame} from '@/game/animation/painted';
import {motionDuration,poseAt,isTerminalMotion} from '@/game/animation/motion';
/** Actual illustrated frames, sampled only for presentation. No gameplay mutations or acknowledgements. */
export default function PaintedFigure({kind,state,startedAt=0,sampleMs,direction='E',phase=1}:{kind:ActorKind;state:string;startedAt?:number;sampleMs?:number;direction?:'N'|'S'|'E'|'W';phase?:number}){
 const root=useRef<HTMLSpanElement>(null),[failed,setFailed]=useState(false),asset=PAINTED[kind];
 useEffect(()=>{setFailed(false);root.current?.removeAttribute('data-loaded');const image=new Image();image.onload=()=>{if(root.current)root.current.dataset.loaded='true';};image.onerror=()=>setFailed(true);image.src=asset.source;return()=>{image.onload=null;image.onerror=null;};},[asset.source]);
 useEffect(()=>{const node=root.current;if(!node)return;const media=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,last=-Infinity,disposed=false;
  const draw=(time:number)=>{if(disposed)return;const elapsed=sampleMs??Math.max(0,time-startedAt),reduced=media.matches;
   if(!document.hidden&&time-last>=1000/30){const index=paintedFrame(kind,state,elapsed,reduced),pose=poseAt(state,elapsed,reduced),walk=state.startsWith('walk'),terminal=isTerminalMotion(state);node.style.backgroundPosition=`${index%4/3*100}% ${Math.floor(index/4)/(asset.rows-1)*100}%`;
    // Poses already contain real painted limbs/KO. Only small travel and opacity accents are additive.
    node.style.transform=`translate(${reduced||terminal||walk?0:pose.x*.18}% ,${reduced||terminal||walk?0:pose.y*.15}%) scaleX(${direction==='W'?-1:1})`;node.style.opacity=String(terminal?1:pose.alpha);node.dataset.frame=String(index);node.dataset.motionProgress=Math.min(1,elapsed/motionDuration(state)).toFixed(2);node.dataset.motionStatic=String(reduced);last=time;
   }
   if(sampleMs===undefined&&!reduced&&!(isTerminalMotion(state)&&elapsed>motionDuration(state)+100))frame=requestAnimationFrame(draw);
  };const resume=()=>{cancelAnimationFrame(frame);last=-Infinity;frame=requestAnimationFrame(draw);};resume();media.addEventListener('change',resume);document.addEventListener('visibilitychange',resume);return()=>{disposed=true;cancelAnimationFrame(frame);media.removeEventListener('change',resume);document.removeEventListener('visibilitychange',resume);};
 },[kind,state,startedAt,sampleMs,direction,asset.rows]);
 return <span className={'painted-figure phase-art-'+phase+(failed?' art-unavailable':'')} ref={root} data-raster={kind} data-motion={state} aria-hidden style={{backgroundImage:failed?undefined:`url(${asset.source})`,backgroundSize:`400% ${asset.rows*100}%`}}>{failed&&<span className="painted-fallback">{kind}<small>Artwork unavailable</small></span>}</span>;
}
