'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {CHARACTERS,SKILLS} from '@/game/config';
import {unavailableReason} from '@/game/combat/availability';
import type {Character,CombatEvent} from '@/game/core/types';
import type {CombatSnapshot,Intent} from '@/game/multiplayer/protocol';
import {combatCommand,connectCombat} from '@/game/multiplayer/combat-client';
import {canonicalState,EventCursor,newerSnapshot,presentationEvents} from '@/game/multiplayer/synchronization';
import {useGameAudio} from '../audio/AudioProvider';
import ActorSprite from '../presentation/ActorSprite';
import OnlineWorld from '../exploration/OnlineWorld';
import {Battlefield,Bar} from './Battlefield';
import OnlineQuestion from './OnlineQuestion';
function ActionPicker({actor,snapshot,working,onLock}:{actor:Character;snapshot:CombatSnapshot;working:boolean;onLock:(skillId:string,targetId:string,reviveTargetId?:string)=>void}){
 const [selected,setSelected]=useState(CHARACTERS[actor.classId].basic),[target,setTarget]=useState('boss'),[revive,setRevive]=useState('');
 const locked=snapshot.progress.find(p=>p.actorId===actor.id)?.locked;
 return <section className="panel action-panel"><div className="section-title"><div><p className="eyebrow">COMMAND {CHARACTERS[actor.classId].name}</p><h2>{locked?'Formula locked':'Choose your formula'}</h2></div></div><div className="skill-grid">{SKILLS.filter(k=>k.classId===actor.classId).map(k=>{const reason=unavailableReason(actor,k);return <button key={k.id} className={'skill-button '+(selected===k.id?'selected':'')} aria-pressed={selected===k.id} title={reason??k.description} disabled={working||locked||!!reason} onClick={()=>setSelected(k.id)}><span>{k.ultimate?'✦ ULTIMATE':k.difficulty}</span><strong>{k.name}</strong><small>{reason??(k.ultimate?'100 Ultimate':k.cost?k.cost+' '+CHARACTERS[actor.classId].resourceType:'Generate 20 '+CHARACTERS[actor.classId].resourceType)}</small></button>;})}</div><div className="resolution-controls"><label>Target<select value={target} onChange={e=>setTarget(e.target.value)} disabled={working||locked||SKILLS.find(k=>k.id===selected)?.target!=='ENEMY'}><option value="boss">{snapshot.boss.name}</option>{snapshot.boss.core&&snapshot.boss.core.hp>0&&<option value="core">Infernal Core</option>}</select></label>{selected==='healer.divine_recovery'&&<label>Revive<select value={revive} onChange={e=>setRevive(e.target.value)}><option value="">Lowest seat (automatic)</option>{snapshot.party.filter(p=>p.hp===0).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}<button className="button primary" disabled={working||locked||!!unavailableReason(actor,SKILLS.find(k=>k.id===selected)!)} onClick={()=>onLock(selected,target,revive||undefined)}>{working?'Submitting action…':locked?'Waiting for party…':'Lock formula'} <span>✦</span></button></div><p className="muted">Skill terkunci setelah server menerima. Tanpa pilihan: basic action otomatis saat deadline.</p></section>;
}
export default function OnlineCombat({sessionId,roomId}:{sessionId:string;roomId:string}){
 const [snapshot,setSnapshot]=useState<CombatSnapshot|null>(null),[connection,setConnection]=useState('Synchronizing'),[error,setError]=useState(''),[working,setWorking]=useState(false),[now,setNow]=useState(0),[shown,setShown]=useState<CombatEvent>();
 const snapshotRef=useRef<CombatSnapshot|null>(null),clock=useRef({server:0,mono:0}),cursor=useRef(new EventCursor()),queue=useRef<CombatEvent[]>([]),sending=useRef(false);
 const audio=useGameAudio(),previousUltimate=useRef<number|null>(null);const refresh=useRef<()=>Promise<void>>(async()=>{});
 const accept=useCallback((next:CombatSnapshot,rtt=0)=>{
  if(!newerSnapshot(snapshotRef.current,next))return;
  const playback=cursor.current.consume(next);queue.current=presentationEvents(queue.current,playback.events,document.hidden);
  snapshotRef.current=next;clock.current={server:next.serverNow+rtt/2,mono:performance.now()};setNow(next.serverNow+rtt/2);setSnapshot(next);setError('');
 },[]);
 useEffect(()=>{
  const sync=connectCombat(sessionId,roomId,accept,setConnection,e=>setError(e instanceof Error?e.message:'Connection unavailable'));refresh.current=sync.refresh;
  const time=setInterval(()=>setNow(clock.current.server+performance.now()-clock.current.mono),200);
  const animate=setInterval(()=>{const next=queue.current.shift();if(next){setShown(next);audio?.event(next,sessionId);}},180);
  const visibility=()=>{queue.current=[];setShown(undefined);cursor.current=new EventCursor();if(!document.hidden)void sync.refresh();};
  document.addEventListener('visibilitychange',visibility);
  return()=>{sync.close();clearInterval(time);clearInterval(animate);queue.current=[];document.removeEventListener('visibilitychange',visibility);};
 },[sessionId,roomId,accept,audio]);
 useEffect(()=>{const value=snapshot?.party.find(p=>p.id===snapshot.myActorId)?.ultimate;if(value!==undefined){if(previousUltimate.current!==null&&previousUltimate.current<100&&value>=100)audio?.play('ultimate_ready');previousUltimate.current=value;}},[snapshot?.party,snapshot?.myActorId,audio]);
 useEffect(()=>{if(snapshot&&!snapshot.campaign?.story&&!['EXPLORATION','STORY','ENDING'].includes(snapshot.phase))audio?.music(snapshot.phase==='VICTORY'||snapshot.phase==='COMPLETED'?'victory':snapshot.phase==='DEFEAT'?'defeat':snapshot.enemyId&&snapshot.enemyId!=='abyss-guardian'?'normal-combat':'boss-combat');},[snapshot?.phase,snapshot?.enemyId,audio]);
 async function send(intent:Intent){
  if(sending.current)return;sending.current=true;setWorking(true);setError('');
  try{const next=await combatCommand(sessionId,intent);accept(next);if(intent.kind==='LEAVE'){sessionStorage.removeItem('nz.room.v1');window.location.assign('/');}}
  catch(e){await refresh.current();setError(e instanceof Error?e.message:'Request failed');}
  finally{sending.current=false;setWorking(false);}
 }
 if(!snapshot)return <div className="combat-page"><h1>Synchronizing expedition…</h1><p role="status">{connection}</p>{error&&<p role="alert">{error}</p>}<Link href="/lobby">Return to lobby</Link></div>;
 if(snapshot.campaign&&['EXPLORATION','STORY','ENDING','COMPLETED'].includes(snapshot.phase))return <OnlineWorld snapshot={snapshot} now={now} working={working} error={error} connection={connection} onIntent={intent=>void send(intent)}/>;
 const actor=snapshot.party.find(p=>p.id===snapshot.myActorId),terminal=['VICTORY','DEFEAT','ABORTED'].includes(snapshot.phase),left=snapshot.deadline===null?null:Math.max(0,snapshot.deadline-now);
 const fence={turnId:snapshot.turnId,phaseId:snapshot.phaseId,version:snapshot.version};const question=snapshot.assignment;
 return <div className="combat-page" data-testid="online-combat" data-state-version={snapshot.version}><div className="combat-heading"><div><p className="eyebrow">NOVA ZENITH · ONLINE PARTY</p><h1>{snapshot.boss.name}</h1><p role="status">{connection} · {snapshot.phase.replaceAll('_',' ')}{left!==null?' · '+Math.ceil(left/1000)+'s':''}</p></div><div className="actions"><span className="round-pill">ROUND {snapshot.turn}</span></div></div>{error&&<p role="alert" className="notice error">{error}</p>}<Battlefield boss={snapshot.boss} shown={shown??snapshot.events.at(-1)}/><section className="combat-party" aria-label="Party members">{snapshot.party.map(p=><article key={p.id} className={'member-card '+(p.id===actor?.id?'selected':'')+(p.hp===0?' ko':'')} style={{'--class-color':CHARACTERS[p.classId].color} as React.CSSProperties}><ActorSprite kind={p.classId} actorId={p.id} hp={p.hp} event={shown}/><div className="slot-top"><strong>{CHARACTERS[p.classId].symbol} {p.name}{p.id===actor?.id?' · YOU':''}</strong><small>{p.hp===0?'KO':p.hp+'/'+p.maxHp}</small></div><Bar value={p.hp} max={p.maxHp} label={p.name+' HP'}/><div className="member-resource"><span>{p.resource} {CHARACTERS[p.classId].resourceType}</span><span>ULT {p.ultimate}%</span></div><Bar value={p.ultimate} max={100} label={p.name+' Ultimate'} kind="ultimate-meter"/><small>{p.active===false?'Inactive':snapshot.progress.find(a=>a.actorId===p.id)?.answered?'✓ Answered':snapshot.progress.find(a=>a.actorId===p.id)?.locked?'✓ Locked':'Choosing…'}</small></article>)}</section>
 {actor&&snapshot.phase==='COMBAT_PLANNING'&&left!==0&&actor.hp>0&&actor.active!==false&&<ActionPicker key={snapshot.turnId} actor={actor} snapshot={snapshot} working={working} onLock={(skillId,targetId,reviveTargetId)=>void send({kind:'ACTION',...fence,skillId,targetId,reviveTargetId})}/>}
 {!terminal&&snapshot.phase!=='COMBAT_PLANNING'&&<section className="panel pending-panel" role="status"><h2>{snapshot.phase==='DEFENSIVE_REACTION'?'A targeted attack approaches':snapshot.phase==='TEAM_RUNE'?'Decode the team seal':snapshot.phase==='SUSPENDED'?'Waiting for adventurers to reconnect':snapshot.phase==='MATH_CHALLENGE'?'Channeling the party formula':'Resolving the battle'}</h2><p>{question?.performance?question.performance==='FAILED'?'FAILED CALCULATION — your formula still has power.':question.performance:question?'Your rune is ready.':'Waiting for party / server…'}</p>{snapshot.pendingBoss&&<p>Guardian: {snapshot.pendingBoss.skill} {snapshot.pendingBoss.targetId?snapshot.party.find(p=>p.id===snapshot.pendingBoss?.targetId)?.name:''}</p>}</section>}
 {terminal&&<section className={'outcome panel '+snapshot.phase.toLowerCase()} role="status"><p className="eyebrow">{snapshot.phase}</p><h2>{snapshot.phase==='VICTORY'?'The seal holds.':'The Abyss endures.'}</h2><p>{snapshot.phase==='VICTORY'?'“The creature you defeated was merely a servant.”':'Regroup your party and begin another expedition.'}</p><Link className="button secondary" href="/" onClick={()=>sessionStorage.removeItem('nz.room.v1')}>Return home</Link></section>}
 <section className="effects-list" aria-label="Active status effects">{snapshot.effects.map(e=><details className={'effect-chip '+(e.negative?'negative':'')} key={e.id}><summary>{e.negative?'↓':'↑'} {e.type.replaceAll('_',' ')}</summary><p>Magnitude {e.magnitude}. Rounds {e.from}–{e.through}.</p></details>)}</section><details className="panel combat-log"><summary>Combat chronicle</summary><ol>{snapshot.events.map(e=><li key={e.seq}><span>R{e.turn}</span>{e.text}</li>)}</ol></details>
 {process.env.NODE_ENV!=='production'&&<details className="panel"><summary>Canonical state · development comparison</summary><code data-testid="canonical-state" style={{overflowWrap:'anywhere'}}>{canonicalState(snapshot)}</code></details>}
 {!terminal&&<button className="text-button" disabled={working} onClick={()=>void send({kind:'LEAVE',...fence})}>Leave this encounter permanently</button>}
 {question&&question.performance===null&&<OnlineQuestion key={question.id} assignment={question} now={now} working={working} error={error} onAnswer={optionToken=>void send({kind:'ANSWER',...fence,assignmentId:question.id,optionToken})}/>}
 </div>;
}
