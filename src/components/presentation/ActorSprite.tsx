'use client';
import {useEffect,useRef,useState} from 'react';
import {AnimationController} from '@/game/animation/controller';
import {SPRITES,clipFor,type ActorKind} from '@/game/animation/manifest';
import type {CombatEvent} from '@/game/core/types';
export default function ActorSprite({kind,actorId,hp,event,large=false}:{kind:ActorKind;actorId:string;hp:number;event?:CombatEvent;large?:boolean}){
 const controller=useRef(new AnimationController(kind)),[state,setState]=useState(hp<=0?'ko':'idle'),[failed,setFailed]=useState(false);
 useEffect(()=>{const c=controller.current;c.sync(hp,performance.now());if(event)c.consume(event,actorId,performance.now());setState(c.sample(performance.now()));const timer=setTimeout(()=>setState(c.sample(performance.now())),1850);return()=>clearTimeout(timer);},[event,actorId,hp]);
 const asset=SPRITES[kind].combat,clip=clipFor(asset,state);
 // Background sheets fail safely: the semantic fallback remains readable.
 useEffect(()=>{const image=new Image();image.onerror=()=>setFailed(true);image.src=asset.source;return()=>{image.onerror=null;};},[asset.source]);
 return <span className={'actor-sprite '+(large?'large':'')+(failed?' asset-fallback':'')} role="img" aria-label={`${kind} ${hp<=0?'KO':state}`} data-animation={state}>
  {failed?<span aria-hidden>✦</span>:<span key={state+(event?.seq??0)} className={'sprite-strip '+(clip.loop?'loop':'once')} style={{backgroundImage:`url(${asset.source})`,width:asset.frameWidth,height:asset.frameHeight,left:large?(256-asset.frameWidth)/2:0,top:large?256-asset.frameHeight:0,backgroundSize:`${asset.frameWidth*4}px auto`,backgroundPositionY:-clip.row*asset.frameHeight,animationDuration:`${clip.durationMs}ms`,'--frame-width':asset.frameWidth+'px'} as React.CSSProperties}/>}
 </span>;
}
