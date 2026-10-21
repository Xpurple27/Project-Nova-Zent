
"use client";
import { useEffect,useRef,useState } from "react";
import { CHARACTERS,GAME,SKILLS,SKILL_BY_ID } from "@/game/config";
import { CLASSES,type CharacterClass,type CombatAction,type CombatState,type DevelopmentQuestion,type MathPerformance } from "@/game/core/types";
import { createCombat,resolveRound,resolveReaction,resolveRune,unavailableReason } from "@/game/combat/engine";
import { magnitude } from "@/game/combat/effects";
import { developmentQuestion } from "@/game/questions/development";
import {useGameAudio} from '../audio/AudioProvider';
import ActorSprite from '../presentation/ActorSprite';
import ActionReadout from '../presentation/ActionReadout';
import {useCombatPlayback} from '../presentation/useCombatPlayback';
import { Battlefield, Bar } from "./Battlefield";
import MathChallenge from "./MathChallenge";
import DebugPanel from "./DebugPanel";
type Task={actorId:string;question:DevelopmentQuestion;durationMs:number};
type Plan=Record<string,{skillId:string;targetId:string}>;
function initialPlans(s:CombatState):Plan{return Object.fromEntries(s.party.map(p=>[p.id,{skillId:CHARACTERS[p.classId].basic,targetId:"boss"}]));}
export default function CombatLab({debug}:{debug:boolean}){
 const [state,setState]=useState(()=>createCombat());
 const [roster,setRoster]=useState<CharacterClass[]>([...CLASSES]);
 const [plans,setPlans]=useState<Plan>(()=>initialPlans(state));
 const [actorId,setActorId]=useState(state.party[0].id);
 const [tasks,setTasks]=useState<Task[]>([]),[index,setIndex]=useState(0),[results,setResults]=useState<Record<string,MathPerformance>>({});
 const [context,setContext]=useState<"ACTION"|"REACTION"|"RUNE">("ACTION");
 const [feedback,setFeedback]=useState<MathPerformance|null>(null),[error,setError]=useState("");
 const audio=useGameAudio(),audioRun=useRef('offline-'+crypto.randomUUID());
 const playback=useCombatPlayback(audioRun.current),shown=playback.event;
 const enqueue=playback.enqueue;
 const timeout=useRef<ReturnType<typeof setTimeout>|null>(null),seen=useRef(0);
 useEffect(()=>{audio?.music(state.phase==='VICTORY'?'victory':state.phase==='DEFEAT'?'defeat':'boss-combat');},[audio,state.phase]);
 useEffect(()=>()=>{if(timeout.current)clearTimeout(timeout.current);},[]);
 useEffect(()=>{const events=state.events.filter(e=>e.seq>seen.current);if(events.length){seen.current=events.at(-1)!.seq;enqueue(events);}},[state.events,enqueue]);
 function apply(next:CombatState){setState(next);setPlans(initialPlans(next));setTasks([]);setIndex(0);setResults({});setFeedback(null);}
 function restart(){audioRun.current='offline-'+crypto.randomUUID();if(timeout.current)clearTimeout(timeout.current);seen.current=0;playback.reset();const next=createCombat(roster);apply(next);setActorId(next.party[0].id);setError("");}
 const actor=state.party.find(p=>p.id===actorId)??state.party[0];
 const task=tasks[index],taskActor=state.party.find(p=>p.id===task?.actorId);
 function start(){
  if(tasks.length)return;
  const living=state.party.filter(p=>p.hp>0);
  setContext("ACTION");setIndex(0);setResults({});setError("");
  setTasks(living.map(p=>{const k=SKILL_BY_ID[plans[p.id].skillId];return {actorId:p.id,question:developmentQuestion(k.difficulty,state.turn,p.seat),durationMs:GAME.timers[k.difficulty]+magnitude(state,"BLESSING_TIME","party")};}));
 }
 function openPending(){
  if(state.pending?.kind==="REACTION"){
   const targetId=state.pending.actorId;const p=state.party.find(p=>p.id===targetId)!;
   setContext("REACTION");setTasks([{actorId:p.id,question:developmentQuestion("EASY",state.turn,p.seat),durationMs:GAME.timers.EASY+magnitude(state,"FOCUS_TIME",p.id)}]);
  }else if(state.pending?.kind==="RUNE"){
   setContext("RUNE");setTasks(state.pending.actorIds.map(id=>{const p=state.party.find(p=>p.id===id)!;return {actorId:id,question:developmentQuestion("MEDIUM",state.turn,p.seat),durationMs:GAME.timers.MEDIUM};}));
  }
  setIndex(0);setResults({});setError("");
 }
 function buildActions(grades:Record<string,MathPerformance>):CombatAction[]{
  return state.party.filter(p=>p.hp>0).map(p=>{const plan=plans[p.id],k=SKILL_BY_ID[plan.skillId];return {actorId:p.id,skillId:k.id,targetId:k.target==="PARTY"?"party":k.target==="SELF"?p.id:k.target==="MAIN_ENEMY"?"boss":plan.targetId,performance:grades[p.id]??"FAILED"};});
 }
 function complete(result:MathPerformance){
  setFeedback(result);audio?.play(result==="FAILED"?"failed":"correct");
  timeout.current=setTimeout(()=>{
   const grades={...results,[task.actorId]:result};setResults(grades);setFeedback(null);
   const runeSolved=context==="RUNE"&&state.pending?.kind==="RUNE"&&Object.values(grades).filter(g=>g!=="FAILED").length>=state.pending.required;
   if(index+1<tasks.length&&!runeSolved){setIndex(index+1);return;}
   try{apply(context==="ACTION"?resolveRound(state,buildActions(grades)):context==="REACTION"?resolveReaction(state,result):resolveRune(state,grades));}
   catch(e){setError(e instanceof Error?e.message:"Resolution failed");setTasks([]);}
  },650);
 }
 const pendingActorId=state.pending?.kind==="REACTION"?state.pending.actorId:null;
 const pendingActor=state.party.find(p=>p.id===pendingActorId);
 const terminal=state.phase==="VICTORY"||state.phase==="DEFEAT";
 return <div className="combat-page"><div className="combat-heading"><div><p className="eyebrow">ARCANE BATTLE LAB · OFFLINE</p><h1>The Abyss Guardian</h1><p className="muted">Local simulation · no online progress or rewards</p></div><div className="actions"><span className="round-pill">ROUND {state.turn}</span></div></div>
 <details className="roster-settings panel"><summary>Party setup · {state.partySize} players · seed 12345</summary><div className="actions">{CLASSES.map(c=><label key={c}><input type="checkbox" checked={roster.includes(c)} onChange={()=>setRoster(old=>old.includes(c)?old.length>1?old.filter(x=>x!==c):old:[...old,c])}/>{CHARACTERS[c].name}</label>)}<button className="button small secondary" onClick={restart}>New simulation</button><span className="muted">Resonance ×{state.resonance.toFixed(3)}</span></div></details>
 {error&&<p className="notice error" role="alert">{error}</p>}
 <Battlefield boss={state.boss} shown={shown} acting={state.party.find(p=>p.id===playback.beat?.lead.actorId)} canTarget={state.phase==="COMBAT_PLANNING"} onCore={()=>setPlans(old=>({...old,[actor.id]:{...old[actor.id],targetId:"core"}}))}/><ActionReadout beat={playback.beat} history={playback.history} party={state.party} enemy={state.boss.name}/>
 <section className="combat-party" aria-label="Party members">{state.party.map(p=><button className={"member-card "+(actor.id===p.id?"selected":"")+(p.hp===0?" ko":"")+(playback.beat?.lead.actorId===p.id?" actor-focus":"")+(shown?.targetId===p.id?" target-focus":"")} key={p.id} onClick={()=>setActorId(p.id)} aria-pressed={actor.id===p.id} style={{"--class-color":CHARACTERS[p.classId].color} as React.CSSProperties}><ActorSprite kind={p.classId} actorId={p.id} hp={p.hp} event={shown}/><div className="slot-top"><strong>{p.name}</strong><small>{p.hp===0?"KO":p.hp+"/"+p.maxHp}</small></div><Bar value={p.hp} max={p.maxHp} label={p.name+" HP"}/><div className="member-resource"><span>{p.resource} {CHARACTERS[p.classId].resourceType}</span><span>ULT {p.ultimate}%</span></div><Bar value={p.ultimate} max={100} label={p.name+" Ultimate"} kind="ultimate-meter"/><small className="planned-label">{p.hp>0?SKILL_BY_ID[plans[p.id].skillId].name:"Awaiting revival"}</small></button>)}</section>
 {!terminal&&<section className="panel action-panel"><div className="section-title"><div><p className="eyebrow">COMMAND {actor.name.toUpperCase()}</p><h2>{state.pending?"Enemy formula":"Choose your formula"}</h2></div><span className="muted">{state.phase.replaceAll("_"," ")}</span></div>
 {!state.pending?<><div className="skill-grid">{SKILLS.filter(k=>k.classId===actor.classId).map(k=>{const reason=unavailableReason(actor,k),selected=plans[actor.id].skillId===k.id;return <button key={k.id} className={"skill-button "+(selected?"selected":"")+(k.ultimate?" ultimate-skill":"")} disabled={!!reason||!!tasks.length} onClick={()=>setPlans(old=>({...old,[actor.id]:{skillId:k.id,targetId:"boss"}}))} aria-pressed={selected} title={reason??k.description}><span>{k.ultimate?"✦ ULTIMATE":k.difficulty}</span><strong>{k.name}</strong><small>{reason??(k.ultimate?"100 Ultimate":k.cost?k.cost+" "+CHARACTERS[actor.classId].resourceType:"Generate 20 "+CHARACTERS[actor.classId].resourceType)}</small></button>;})}</div>
 <div className="resolution-controls"><label>Target<select value={plans[actor.id].targetId} onChange={e=>setPlans(old=>({...old,[actor.id]:{...old[actor.id],targetId:e.target.value}}))} disabled={SKILL_BY_ID[plans[actor.id].skillId].target!=="ENEMY"||!!tasks.length}><option value="boss">Abyss Guardian</option>{state.boss.core&&state.boss.core.hp>0&&<option value="core">Infernal Core</option>}</select></label><button className="button primary" disabled={!!tasks.length||state.phase!=="COMBAT_PLANNING"} onClick={start}>Channel party formulas <span>↗</span></button></div><p className="muted">QA mode: pilih skill untuk setiap class, lalu jawab formula tiap anggota secara bergantian. Untuk mode online simultan, gunakan Expedition Lobby.</p></>:
 <div className="pending-panel"><p>{state.pending.kind==="REACTION"?pendingActor?.name+" is targeted. Prepare "+(pendingActor?.classId==="WARRIOR"?"Block":pendingActor?.classId==="THIEF"?"Dodge":pendingActor?.classId==="MAGE"?"Arcane Barrier":"Divine Ward")+".":"TEAM RUNE — "+state.pending.required+" correct answers required. Shield remains if the rune fails."}</p><button className="button primary" disabled={!!tasks.length} onClick={openPending}>{state.pending.kind==="REACTION"?"Stabilize the ward":"Decode the team seal"} <span>✦</span></button></div>}</section>}
 {terminal&&<section className={"outcome panel "+state.phase.toLowerCase()} role="status"><p className="eyebrow">{state.phase}</p><h2>{state.phase==="VICTORY"?"The seal holds.":"The Abyss endures."}</h2><p>{state.phase==="VICTORY"?"“The creature you defeated was merely a servant.”":"Regroup your party. A different formula can change the outcome."}</p><button className="button primary" onClick={restart}>Begin another simulation</button></section>}
 <section className="effects-list" aria-label="Active status effects">{state.effects.map(e=><details className={"effect-chip "+(e.negative?"negative":"")} key={e.id}><summary>{e.negative?"↓":"↑"} {e.type.replaceAll("_"," ")} · {e.target}</summary><p>Magnitude {e.magnitude}. Active rounds {e.from}–{e.through}.</p></details>)}</section>
 <details className="panel combat-log"><summary>Combat chronicle · {state.events.length} events</summary><ol>{state.events.slice(-80).map(e=><li key={e.seq}><span>R{e.turn}</span>{e.text}</li>)}</ol></details>
 {debug&&<DebugPanel state={state} onChange={apply} onResolve={tier=>{if(tasks.length)return;try{apply(resolveRound(state,buildActions(Object.fromEntries(state.party.map(p=>[p.id,tier])))));}catch(e){setError(e instanceof Error?e.message:"Resolution failed");}}}/>}
 {task&&!feedback&&<MathChallenge key={context+"-"+state.turn+"-"+index+"-"+task.actorId} question={task.question} durationMs={task.durationMs} title={(taskActor?.name??"Party")+" · "+(context==="ACTION"?"Channel the Formula":context==="REACTION"?"Stabilize the Rune":"Decode the Seal")} onFinish={complete}/>}
 {feedback&&<div className="modal-backdrop"><div className={"performance-feedback "+feedback.toLowerCase()} role="status"><span>✦</span><h2>{feedback==="FAILED"?"FAILED CALCULATION":feedback}</h2><p>{feedback==="FAILED"?"Your formula still carries power.":"Arcane formula stabilized."}</p></div></div>}
 </div>;
}
