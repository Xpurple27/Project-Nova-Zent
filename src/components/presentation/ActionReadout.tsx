import {SKILL_BY_ID} from '@/game/config';
import type {Character} from '@/game/core/types';
import {actorLabel,skillLabel,type CombatBeat} from '@/game/presentation/combat';
import HeroArt from './HeroArt';
function Results({beat,party,enemy}:{beat:CombatBeat;party:readonly Character[];enemy:string}){
 return <ul className="action-results">{beat.events.filter(e=>['DAMAGE','INCOMING_DAMAGE','HEAL','SHIELD_DAMAGE','BLOCKED','PLAYER_REVIVED','EFFECT_APPLIED','PLAYER_KO','BARRIER_BROKEN','CORE_DESTROYED','HEAVY_TELEGRAPH','BOSS_PHASE_CHANGED'].includes(e.type)).map(e=><li key={e.seq} className={e.type.toLowerCase()}>{e.amount!==undefined?<><b>{e.type==='HEAL'?'+':e.type==='BLOCKED'?'−':''}{e.amount}</b> {e.type==='HEAL'?'HP pulih':e.type==='SHIELD_DAMAGE'?'shield damage':e.type==='BLOCKED'?e.text.startsWith('DODGED')?'DODGE · tanpa damage':'BLOCK · damage dicegah':'damage'} · {actorLabel(e.targetId,party,enemy)}</>:e.text}</li>)}</ul>;
}
export default function ActionReadout({beat,history,party,enemy}:{beat?:CombatBeat;history:CombatBeat[];party:readonly Character[];enemy:string}){
 const actor=party.find(p=>p.id===beat?.lead.actorId),skill=SKILL_BY_ID[beat?.lead.skillId??''];
 const targets=beat?[...new Set(beat.events.filter(e=>e.targetId).map(e=>actorLabel(e.targetId,party,enemy)))].join(', '):'';
 const target=targets||(!skill?'Party':skill.target==='SELF'?actor?.name:skill.target==='PARTY'?'Party':enemy);
 return <section className="action-readout" aria-label="Action presentation">
  {beat?<div className={'action-banner '+(beat.performance?.toLowerCase()??'')} key={beat.id} data-testid="action-banner" data-actor={beat.lead.actorId}>
   {actor&&<HeroArt kind={actor.classId} portrait/>}<div className="action-heading"><span className="eyebrow">{beat.kind==='BOSS'?'ENEMY ACTION':beat.kind==='REACTION'?'DEFENSIVE REACTION':beat.kind==='MECHANIC'?'BATTLE SIGNAL':'PARTY ACTION'}</span><span className="action-target">Target: {target}</span><strong>{actorLabel(beat.lead.actorId,party,enemy)} <span>→</span> {skillLabel(beat)}</strong>{beat.performance&&<span className={'performance-tag '+beat.performance.toLowerCase()}>{beat.performance==='FAILED'?'FAILED CALCULATION · kekuatan melemah':beat.performance}</span>}</div><Results beat={beat} party={party} enemy={enemy}/>
  </div>:<div className="action-banner quiet"><p>Aksi dan hasil formula akan tampil di sini.</p></div>}
  {history.length>0&&<details className="action-history"><summary>Urutan aksi · hasil dari server</summary><ol>{history.map(b=><li key={b.id}><strong>{actorLabel(b.lead.actorId,party,enemy)} · {skillLabel(b)}</strong>{b.performance&&<span className={'performance-tag '+b.performance.toLowerCase()}>{b.performance==='FAILED'?'FAILED CALCULATION':b.performance}</span>}<Results beat={b} party={party} enemy={enemy}/></li>)}</ol></details>}
 </section>;
}
