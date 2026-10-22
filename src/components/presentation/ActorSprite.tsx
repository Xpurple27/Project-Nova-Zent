'use client';
import {useEffect,useRef,useState} from 'react';
import {AnimationController} from '@/game/animation/controller';
import {SPRITES,clipFor,type ActorKind} from '@/game/animation/manifest';
import {hasRig} from '@/game/animation/motion';
import type {CombatEvent} from '@/game/core/types';
import RigFigure from './RigFigure';
export default function ActorSprite({kind,actorId,hp,event,large=false,phase=1}:{kind:ActorKind;actorId:string;hp:number;event?:CombatEvent;large?:boolean;phase?:number}){
 const controller=useRef(new AnimationController(kind)),[motion,setMotion]=useState({state:hp<=0?(kind==='GUARDIAN'||kind==='HOUND'||kind==='SHAMAN'?'death':'ko'):'idle',startedAt:0}),[failed,setFailed]=useState(false);
 useEffect(()=>{const c=controller.current,now=performance.now();c.sync(hp,now);if(event)c.consume(event,actorId,now);setMotion({state:c.sample(now),startedAt:c.startedAt});const timer=setTimeout(()=>setMotion({state:c.sample(performance.now()),startedAt:c.startedAt}),Math.max(0,c.until-now)+20);return()=>clearTimeout(timer);},[event,actorId,hp]);
 const asset=SPRITES[kind].combat,clip=clipFor(asset,motion.state),rig=hasRig(kind);
 useEffect(()=>{if(rig)return;const image=new Image();image.onerror=()=>setFailed(true);image.src=asset.source;return()=>{image.onerror=null;};},[asset.source,rig]);
 return <span className={'actor-sprite '+(large?'large':'')+(rig?' articulated':'')+(failed?' asset-fallback':'')} role="img" aria-label={`${kind} ${hp<=0?'KO':motion.state}`} data-animation={motion.state}>
  {rig?<RigFigure kind={kind} state={motion.state} startedAt={motion.startedAt} phase={phase}/>:failed?<span className="actor-label-fallback" aria-hidden>{kind}<small>{hp<=0?'KO':'Asset unavailable'}</small></span>:<span key={motion.state+(event?.seq??0)} className={'sprite-strip '+(clip.loop?'loop':'once')} style={{backgroundImage:`url(${asset.source})`,width:asset.frameWidth,height:asset.frameHeight,left:large?(256-asset.frameWidth)/2:0,top:large?256-asset.frameHeight:0,backgroundSize:`${asset.frameWidth*asset.columns}px auto`,backgroundPositionY:-clip.row*asset.frameHeight,animationDuration:`${clip.durationMs}ms`,'--frame-width':asset.frameWidth+'px'} as React.CSSProperties}/>}
 </span>;
}
