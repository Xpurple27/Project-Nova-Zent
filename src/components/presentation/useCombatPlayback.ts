'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {CombatEvent} from '@/game/core/types';
import {CombatPlayback,impactEvent,type CombatBeat} from '@/game/presentation/combat';
import {useGameAudio} from '../audio/AudioProvider';
export function useCombatPlayback(scope:string){
 const timeline=useRef(new CombatPlayback()),[beat,setBeat]=useState<CombatBeat>(),[event,setEvent]=useState<CombatEvent>(),[history,setHistory]=useState<CombatBeat[]>([]),audio=useGameAudio();
 const enqueue=useCallback((events:readonly CombatEvent[])=>{timeline.current.accept(events,document.hidden);setHistory([...timeline.current.history]);},[]);
 const reset=useCallback(()=>{timeline.current.clear();setBeat(undefined);setEvent(undefined);},[]);
 useEffect(()=>{
  timeline.current=new CombatPlayback();setHistory([]);setBeat(undefined);setEvent(undefined);
  let nextAt=0,impactAt=0,current:CombatBeat|undefined;
  const timer=setInterval(()=>{
   if(document.hidden)return;const now=performance.now();
   if(current&&impactAt&&now>=impactAt){setEvent(impactEvent(current));for(const e of current.events)audio?.event(e,scope);impactAt=0;}
   if(now<nextAt)return;const next=timeline.current.next();if(!next)return;
   current=next;setBeat(next);setEvent(next.kind==='REACTION'?next.events[0]:next.lead);impactAt=now+260;nextAt=now+next.durationMs;
  },40);
  const visibility=()=>{current=undefined;impactAt=0;nextAt=0;reset();};document.addEventListener('visibilitychange',visibility);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibility);};
 },[scope,audio,reset]);
 return {beat,event,history,enqueue,reset};
}
