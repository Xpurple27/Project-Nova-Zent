'use client';
import {useCallback,useState,useEffect} from 'react';
import StoryOverlay from '../story/StoryOverlay';
import {STORIES,type StoryId} from '@/game/story/definitions';
import type {StoryState} from '@/game/story/runtime';
import Exploration from './Exploration';
import {MAPS,SCENES,type SceneId,type Motion} from '@/game/exploration/model';
export default function ExplorationLab(){
 const [scene,setScene]=useState<SceneId>('VILLAGE'),[message,setMessage]=useState(''),[id]=useState(()=>crypto.randomUUID());
 const [story,setStory]=useState<StoryState>(),[now,setNow]=useState(0);useEffect(()=>{if(!story)return;const timer=setInterval(()=>{const value=Date.now();setNow(value);if(value>=story.endsAt)setStory(undefined);},100);return()=>clearInterval(timer);},[story]);
 const network=useCallback((receive:(id:string,m:Motion)=>void)=>{const c=new BroadcastChannel('nz-dev-exploration');c.onmessage=e=>{if(e.data.id!==id)receive('remote',e.data.motion);};return {send:(motion:Motion)=>c.postMessage({id,motion}),close:()=>c.close()};},[id]);
 return <div className="exploration-page"><h1>Exploration lab</h1><p>Local QA only. Markers are hooks, not completed encounters.</p><label htmlFor="dev-scene">Scene</label><select id="dev-scene" value={scene} onChange={e=>setScene(e.target.value as SceneId)}>{SCENES.map(id=><option key={id} value={id}>{MAPS[id].name}</option>)}</select><label htmlFor="preview-story">Preview cutscene</label><select id="preview-story" value={story?.id??''} onChange={e=>{if(!e.target.value){setStory(undefined);return;}const id=e.target.value as StoryId,t=Date.now();setNow(t);setScene(STORIES[id].scene);setStory({id,version:1,instanceId:crypto.randomUUID(),startedAt:t,endsAt:t+STORIES[id].durationMs,step:0,skipVotes:[]});}}><option value="">None</option>{Object.keys(STORIES).map(id=><option key={id}>{id}</option>)}</select><Exploration view={{scene,sceneToken:scene,localId:id,locked:!!story,...(story?{story:{state:story,now}}:{}),party:[{id,userId:id,name:'You',classId:'WARRIOR',seat:0},{id:'remote',userId:'remote',name:'Teammate',classId:'MAGE',seat:1}]}} network={network} onInteract={zone=>{if(zone==='guide')setMessage('Delapan Segel Arcane melindungi NOVA ZENITH. Ikuti rune ke timur.');else setMessage('Encounter/party transition hook: '+scene);}}/><p role="status">{message}</p>{story&&<StoryOverlay story={story} now={now} activeIds={[id]} working={false} onSkip={()=>setStory(undefined)}/>}</div>;
}
