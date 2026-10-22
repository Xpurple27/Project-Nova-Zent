'use client';
import MotionLab from './MotionLab';
import OnlineQuestion from '../combat/OnlineQuestion';
import {useState} from 'react';
import {createBoss} from '@/game/boss/engine';
import {Battlefield} from '../combat/Battlefield';
import type {CombatEvent} from '@/game/core/types';
export default function PresentationLab(){
 const [event,setEvent]=useState<CombatEvent>({seq:1,turn:1,type:'ACTION_RESOLVED',skillId:'mage.meteor',text:'Meteor'});
 const [question,setQuestion]=useState(false);
 const boss={...createBoss(4),shield:950,heavy:'CORE_EXPOSED' as const,core:{id:'core' as const,hp:650,maxHp:650}};
 return <div className="combat-page"><h1>Presentation lab</h1><button className="button" onClick={()=>setEvent(e=>({...e,seq:e.seq+1}))}>Play next effect</button><button className="button" onClick={()=>setEvent(e=>({...e}))}>Replay duplicate event</button><button className="button" onClick={()=>setQuestion(true)}>Preview long formula</button><Battlefield boss={boss} shown={event}/><MotionLab/>{question&&<OnlineQuestion assignment={{id:'qa-long',actorId:'qa',context:'ACTION',difficulty:'HARD',prompt:'Diberikan f(x) = 3(x − 2)² + 4x − 5 dan g(x) = (x + 1)/2. Tentukan f(g(5)) dengan mengikuti urutan operasi dan penulisan satuan yang konsisten.',options:['123456789/987654321 + 3√2 satuan panjang','22 satuan panjang','30 satuan panjang','18 satuan panjang'].map((text,i)=>({token:String(i),text})),startsAt:0,deadline:Date.now()+25000,performance:null}} now={Date.now()} working={false} onAnswer={()=>setQuestion(false)}/>}</div>;
}
