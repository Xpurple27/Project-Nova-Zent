"use client";
import { useEffect,useRef,useState } from "react";
import { gradeAnswer } from "@/game/core/math";
import type { DevelopmentQuestion,MathPerformance } from "@/game/core/types";
import MathText from "./MathText";
export default function MathChallenge({question,durationMs,title,onFinish}:{question:DevelopmentQuestion;durationMs:number;title:string;onFinish:(result:MathPerformance)=>void}){
 const panel=useRef<HTMLElement>(null);
 const start=useRef(0),submitted=useRef(false),callback=useRef(onFinish);
 const [remaining,setRemaining]=useState(durationMs),[selected,setSelected]=useState<number|null>(null);
 useEffect(()=>{callback.current=onFinish;},[onFinish]);
 useEffect(()=>{
  start.current=performance.now();
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
  const id=setInterval(()=>{const left=Math.max(0,durationMs-(performance.now()-start.current));setRemaining(left);if(left<=0&&!submitted.current){submitted.current=true;callback.current("FAILED");}},80);
  return ()=>{clearInterval(id);if(previous?.isConnected)previous.focus();};
 },[durationMs]);
 function answer(index:number){if(submitted.current)return;submitted.current=true;setSelected(index);callback.current(gradeAnswer(index===question.answerIndex,performance.now()-start.current,durationMs));}
 return <div className="modal-backdrop"><section ref={panel} onKeyDown={event=>{if(event.key!=="Tab")return;const buttons=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")??[]);const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}} role="dialog" aria-modal="true" aria-labelledby="formula-title" className="formula-panel"><div className="slot-top"><p className="eyebrow">{question.difficulty} ARCANE FORMULA</p><span className={remaining<4000?"danger":"teal"} aria-label="Time remaining">{Math.ceil(remaining/1000)}s</span></div><h2 id="formula-title">{title}</h2><div className="timer-track" aria-hidden><i style={{width:remaining/durationMs*100+"%"}}/></div><p className="formula-prompt"><MathText>{question.prompt}</MathText></p><div className="answers">{question.options.map((option,index)=><button key={index} className={"answer "+(selected===index?"selected":"")} disabled={submitted.current} onClick={()=>answer(index)}><span>{String.fromCharCode(65+index)}</span><MathText>{option}</MathText></button>)}</div><p className="muted">Benar dalam separuh waktu → PERFECT. Jawaban pertama terkunci.</p></section></div>;
}
