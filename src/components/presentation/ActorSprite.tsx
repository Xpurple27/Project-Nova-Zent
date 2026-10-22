'use client';
import {useEffect,useRef,useState} from 'react';
import {AnimationController} from '@/game/animation/controller';
import type {ActorKind} from '@/game/animation/manifest';
import type {CombatEvent} from '@/game/core/types';
import PaintedFigure from './PaintedFigure';
export type PresentationPose={state:string;startedAt:number};
export default function ActorSprite({kind,actorId,hp,event,large=false,phase=1,presentation}:{kind:ActorKind;actorId:string;hp:number;event?:CombatEvent;large?:boolean;phase?:number;presentation?:PresentationPose}){
 const controller=useRef(new AnimationController(kind)),[motion,setMotion]=useState({state:hp<=0?(['GUARDIAN','HOUND','SHAMAN'].includes(kind)?'death':'ko'):'idle',startedAt:0});
 useEffect(()=>{const c=controller.current,now=performance.now();c.sync(hp,now);if(event)c.consume(event,actorId,now);setMotion({state:c.sample(now),startedAt:c.startedAt});const timer=setTimeout(()=>setMotion({state:c.sample(performance.now()),startedAt:c.startedAt}),Math.max(0,c.until-now)+20);return()=>clearTimeout(timer);},[event,actorId,hp]);
 const pose=presentation??motion;
 return <span className={'actor-sprite painted '+(large?'large':'')} role="img" aria-label={`${kind} ${pose.state}${hp<=0?' · defeated':''}`} data-animation={pose.state}><PaintedFigure kind={kind} state={pose.state} startedAt={pose.startedAt} phase={phase}/></span>;
}
