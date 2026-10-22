'use client';
import {useGameAudio} from '../audio/AudioProvider';
import {useEffect,useRef,useState} from 'react';
import type {SafeAssignment} from '@/game/multiplayer/protocol';
import MathText from './MathText';
export default function OnlineQuestion({assignment,now,working,error,onAnswer}:{assignment:SafeAssignment;now:number;working:boolean;error?:string;onAnswer:(token:string)=>void}){
 const audio=useGameAudio();
 const panel=useRef<HTMLElement>(null),chosen=useRef<string|null>(null);const [selected,setSelected]=useState<string|null>(null);
 useEffect(()=>{const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;panel.current?.focus();return()=>{if(previous?.isConnected)previous.focus();};},[]);
 const left=Math.max(0,assignment.deadline-now),available=now>=assignment.startsAt&&left>0;
 useEffect(()=>{if(available&&!working)panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();},[available,working]);
 return <div className="modal-backdrop"><section ref={panel} tabIndex={-1} data-assignment-id={assignment.id} role="dialog" aria-modal="true" aria-labelledby="online-formula-title" className="formula-panel" onKeyDown={e=>{
  if(e.key!=='Tab')return;const buttons=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);if(!buttons.length){e.preventDefault();panel.current?.focus();return;}const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 }}><div className="slot-top"><p className="eyebrow">{assignment.difficulty} ARCANE FORMULA</p><span aria-label="Time remaining">{Math.ceil(left/1000)}s</span></div><h2 id="online-formula-title">{assignment.context==='ACTION'?'Channel the Formula':assignment.context==='REACTION'?'Stabilize the Ward':'Decode the Team Seal'}</h2><div className="timer-track" aria-hidden><i style={{width:left/(assignment.deadline-assignment.startsAt)*100+'%'}}/></div><p className="formula-prompt"><MathText>{assignment.prompt}</MathText></p><div className="answers">{assignment.options.map((option,i)=><button key={option.token} className={'answer '+(selected===option.token?'selected':'')} disabled={!available||working||(selected!==null&&selected!==option.token)} onClick={()=>{if(chosen.current&&chosen.current!==option.token)return;chosen.current=option.token;setSelected(option.token);audio?.play('answer_lock');onAnswer(option.token);}}><span>{String.fromCharCode(65+i)}</span><MathText>{option.text}</MathText></button>)}</div>{error&&<p role="alert" className="danger">{error}</p>}<p className="muted" role="status">{working?'Submitting answer…':!available?left===0?'Time expired. Synchronizing…':'Stabilizing rune…':'Jawaban pertama terkunci. Hasil ditentukan server.'}</p></section></div>;
}
