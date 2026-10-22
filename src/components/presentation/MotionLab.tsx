'use client';
import {useState} from 'react';
import {CHARACTER_STATES,BOSS_STATES,type ActorKind} from '@/game/animation/manifest';
import {motionDuration} from '@/game/animation/motion';
import {SKILL_ANIMATIONS} from '@/game/animation/controller';
import RigFigure from './RigFigure';
import ActorSprite from './ActorSprite';
export default function MotionLab(){
 const [kind,setKind]=useState<ActorKind>('WARRIOR'),[motion,setMotion]=useState('slash'),[startedAt,setStartedAt]=useState(0),[sample,setSample]=useState<number|undefined>(0),[hp,setHp]=useState(100);
 const states=kind==='GUARDIAN'?[...BOSS_STATES]:[...CHARACTER_STATES[kind as keyof typeof CHARACTER_STATES],'walkE','walkN','walkS','walkW'];
 function play(next=motion){setMotion(next);setSample(undefined);setStartedAt(performance.now());}
 const direction=motion.startsWith('walk')?motion.at(-1) as 'N'|'S'|'E'|'W':'E';
 return <section className="motion-lab" aria-label="Motion studio"><h2>Motion studio</h2><p className="muted">Offline presentation QA · joints, walk, skill poses, KO and recovery</p><div className="motion-lab-controls"><label>Actor<select value={kind} onChange={e=>{const value=e.target.value as ActorKind;setKind(value);setHp(100);play(value==='GUARDIAN'?'claw':CHARACTER_STATES[value as keyof typeof CHARACTER_STATES][1]);}}>{['WARRIOR','MAGE','THIEF','HEALER','GUARDIAN'].map(k=><option key={k}>{k}</option>)}</select></label><label>Motion<select value={motion} onChange={e=>play(e.target.value)}>{states.map(s=><option key={s}>{s}</option>)}</select></label></div>
  <div className="motion-stage"><div className="rig-pedestal" data-testid="motion-preview"><RigFigure kind={kind} state={motion} direction={direction} startedAt={startedAt} sampleMs={sample}/></div></div>
  <div className="motion-lab-controls"><button className="button secondary" onClick={()=>play()}>Play motion</button><label>Pose timeline<input aria-label="Pose timeline" type="range" min="0" max={motionDuration(motion)} step="10" value={sample??0} onChange={e=>setSample(Number(e.target.value))}/></label></div><p className="motion-caption">{kind} · {motion} · {motionDuration(motion)}ms{Object.entries(SKILL_ANIMATIONS).find(([,clip])=>clip===motion)?' · '+Object.entries(SKILL_ANIMATIONS).find(([,clip])=>clip===motion)![0]:''}</p>
  <div className="motion-lab-controls" data-testid="life-demo"><ActorSprite key={kind} kind={kind} actorId="motion-qa" hp={hp}/><button className="button secondary" onClick={()=>setHp(0)}>Simulate KO / death</button><button className="button secondary" onClick={()=>setHp(30)}>Revive / recover</button><span>{hp>0?'Alive':'KO / defeated'}</span></div>
 </section>;
}
