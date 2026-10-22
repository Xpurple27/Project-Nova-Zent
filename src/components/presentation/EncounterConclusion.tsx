'use client';
import {useEffect,useRef,useState} from 'react';
import type {EncounterConclusion as Conclusion} from '@/game/presentation/conclusion';
import {conclusionStage,CONCLUSION_TIMING} from '@/game/presentation/conclusion';
import {impactEvent} from '@/game/presentation/combat';
import {Battlefield} from '../combat/Battlefield';
import ActionReadout from './ActionReadout';
import {useGameAudio} from '../audio/AudioProvider';
/** A bounded visual bridge only. Server state, progression and clocks already advanced. */
export default function EncounterConclusion({value,onDone}:{value:Conclusion;onDone:()=>void}){
 const [elapsed,setElapsed]=useState(()=>Math.max(0,performance.now()-value.startedAt)),done=useRef(false),audio=useGameAudio(),stage=conclusionStage(elapsed),lastStage=useRef(''),onDoneRef=useRef(onDone);
 useEffect(()=>{onDoneRef.current=onDone;},[onDone]);
 useEffect(()=>{const tick=()=>{const elapsed=performance.now()-value.startedAt;setElapsed(elapsed);if(elapsed>=CONCLUSION_TIMING.end&&!done.current){done.current=true;onDoneRef.current();}};tick();const timer=setInterval(tick,40);const hidden=()=>{if(document.hidden&&!done.current){done.current=true;onDoneRef.current();}};document.addEventListener('visibilitychange',hidden);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',hidden);};},[value.startedAt]);
 useEffect(()=>{if(lastStage.current===stage)return;lastStage.current=stage;if(stage==='RESULT')audio?.music('victory');},[stage,audio]);
 const attack=value.attack,shown=stage==='STRIKE'?attack?.lead:stage==='HIT'?attack?impactEvent(attack):value.death:value.death,boss=stage==='STRIKE'?value.before:value.after;
 const enemyPose={state:stage==='STRIKE'?'idle':stage==='HIT'?'hurt':'death',startedAt:value.startedAt+(stage==='HIT'?CONCLUSION_TIMING.hit:stage==='STRIKE'?0:CONCLUSION_TIMING.fall)};
 return <div className="combat-page encounter-conclusion" data-testid="encounter-conclusion" data-stage={stage} data-conclusion-id={value.key}>
  <div className="finish-heading"><p className="eyebrow">NOVA ZENITH · THE FINAL FORMULA</p><h1>{value.after.name}</h1></div>
  <Battlefield boss={boss} shown={shown} acting={value.party.find(p=>p.id===attack?.lead.actorId)} enemyPose={enemyPose}/>
  <p className="finish-stage-label" role="status">{stage==='STRIKE'?'Serangan penentu…':stage==='HIT'?'Serangan mengenai target!':stage==='FALL'?value.after.name+' tumbang.':'Pertarungan selesai.'}</p>
  {attack&&<ActionReadout beat={attack} history={[attack]} party={value.party} enemy={value.after.name}/>}
  {stage==='RESULT'&&<section className="finish-result" role="status"><p className="eyebrow">ENCOUNTER CLEARED</p><h2>{value.after.name}<br/>DEFEATED</h2><p>Party berhasil menstabilkan Arcane Formula.</p><button className="button primary" onClick={()=>{done.current=true;onDoneRef.current();}}>Lanjutkan perjalanan</button></section>}
  <p className="finish-hint">Hasil pertarungan tersimpan. Perjalanan berlanjut setelah animasi selesai.</p>
 </div>;
}
