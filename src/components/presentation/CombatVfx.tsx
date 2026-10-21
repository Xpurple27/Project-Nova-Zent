'use client';
import {useEffect,useRef,useState} from 'react';
import type {CombatEvent} from '@/game/core/types';
import {VfxCursor,type VfxCue} from '@/game/animation/vfx';
export default function CombatVfx({event}:{event?:CombatEvent}){
 const cursor=useRef(new VfxCursor()),[cue,setCue]=useState<VfxCue|null>(null);
 useEffect(()=>{if(!event)return;const next=cursor.current.consume(event);if(!next)return;setCue(next);},[event]);
 useEffect(()=>{if(!cue)return;const timer=setTimeout(()=>setCue(null),cue.durationMs);return()=>clearTimeout(timer);},[cue]);
 if(!cue)return null;
 return <div key={cue.id} className={`combat-vfx fx-${cue.style} fx-${cue.shape} impact-${cue.strength}`} data-event-seq={cue.id} data-testid="combat-vfx" aria-hidden>
  <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid meet"><g fill="none" stroke="currentColor" strokeWidth="3">
   {cue.shape==='slash'?<><path d="M70 175Q170 135 315 35L235 130Z"/><path d="m150 170 90-100"/></>:cue.shape==='meteor'?<><path d="m120 10 120 110-30 40-40-20Z"/><circle cx="210" cy="150" r="44"/></>:cue.shape==='shield'?<><path d="m200 25 85 32-12 85-73 55-73-55-12-85Z"/><path d="M200 55v105M155 105h90"/></>:cue.shape==='seal'?<><circle cx="200" cy="110" r="70"/><path d="m200 40 62 105H138Z"/><circle cx="200" cy="110" r="28"/></>:cue.shape==='wave'?<><ellipse cx="200" cy="130" rx="130" ry="50"/><ellipse cx="200" cy="120" rx="85" ry="30"/><path d="M120 110q80-140 160 0"/></>:<><circle cx="200" cy="110" r="35"/><path d="M70 110h80M250 110h70"/></>}
  </g></svg><span className="fx-particle p1">✦</span><span className="fx-particle p2">✧</span><span className="fx-particle p3">◇</span>
 </div>;
}
