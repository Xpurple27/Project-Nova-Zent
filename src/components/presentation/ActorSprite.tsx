'use client';
import {useEffect,useRef,useState} from 'react';
import {AnimationController} from '@/game/animation/controller';
import {SPRITES,clipFor,type ActorKind} from '@/game/animation/manifest';
import type {CombatEvent} from '@/game/core/types';
import {GUARDIAN_ART,HERO_IDENTITY} from '@/game/animation/identity';
export default function ActorSprite({kind,actorId,hp,event,large=false}:{kind:ActorKind;actorId:string;hp:number;event?:CombatEvent;large?:boolean}){
 const controller=useRef(new AnimationController(kind)),[state,setState]=useState(hp<=0?'ko':'idle'),[failed,setFailed]=useState(false),[artFailed,setArtFailed]=useState(false);
 useEffect(()=>{const c=controller.current;c.sync(hp,performance.now());if(event)c.consume(event,actorId,performance.now());setState(c.sample(performance.now()));const timer=setTimeout(()=>setState(c.sample(performance.now())),1850);return()=>clearTimeout(timer);},[event,actorId,hp]);
 const asset=SPRITES[kind].combat,clip=clipFor(asset,state);
 const art=kind==='GUARDIAN'?GUARDIAN_ART:kind==='HOUND'||kind==='SHAMAN'?null:HERO_IDENTITY[kind].art;
 // Background sheets fail safely: the semantic fallback remains readable.
 useEffect(()=>{const image=new Image();image.onerror=()=>setFailed(true);image.src=asset.source;return()=>{image.onerror=null;};},[asset.source]);
 return <span className={'actor-sprite '+(large?'large':'')+(art&&!artFailed?' illustrated':'')+(failed&&(!art||artFailed)?' asset-fallback':'')} role="img" aria-label={`${kind} ${hp<=0?'KO':state}`} data-animation={state}>
  {failed?<span className="actor-label-fallback" aria-hidden>{kind.replaceAll('_',' ')}<small>{hp<=0?'KO':'Asset unavailable'}</small></span>:<span key={state+(event?.seq??0)} className={'sprite-strip '+(clip.loop?'loop':'once')} style={{backgroundImage:`url(${asset.source})`,width:asset.frameWidth,height:asset.frameHeight,left:large?(256-asset.frameWidth)/2:0,top:large?256-asset.frameHeight:0,backgroundSize:`${asset.frameWidth*4}px auto`,backgroundPositionY:-clip.row*asset.frameHeight,animationDuration:`${clip.durationMs}ms`,'--frame-width':asset.frameWidth+'px'} as React.CSSProperties}/>}
  {art&&!artFailed&&<img className="actor-illustration" src={art} width={kind==='GUARDIAN'?768:512} height={kind==='GUARDIAN'?702:768} alt="" aria-hidden decoding="async" onError={()=>setArtFailed(true)}/>}
 </span>;
}
