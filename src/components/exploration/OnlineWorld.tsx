'use client';
import {useGameAudio} from '../audio/AudioProvider';
import {useEffect} from 'react';
import {useCallback,useMemo,useState} from 'react';
import StoryOverlay from '../story/StoryOverlay';
import Exploration from './Exploration';
import {connectMotion} from '@/game/exploration/network';
import type {Explorer} from '@/game/exploration/bridge';
import type {Motion} from '@/game/exploration/model';
import type {CombatSnapshot,Intent} from '@/game/multiplayer/protocol';
export default function OnlineWorld({snapshot,working,error,connection,onIntent,now}:{snapshot:CombatSnapshot;now:number;working:boolean;error:string;connection:string;onIntent:(i:Intent)=>void}){
 const audio=useGameAudio();
 const [notice,setNotice]=useState(''),[motionStatus,setMotionStatus]=useState('Movement connecting');
 const campaign=snapshot.campaign!;
 useEffect(()=>{audio?.music(snapshot.phase==='COMPLETED'?'victory':campaign.scene==='VILLAGE'?'village':campaign.scene==='ANCIENT_RUINS'||campaign.scene==='BOSS_CHAMBER'?'ruins':'exploration');},[audio,campaign.scene,snapshot.phase]);
 // User ids are provided by the authenticated room projection; names/classes by the server snapshot.
 const memberKey=JSON.stringify(snapshot.party.map(p=>({id:p.id,userId:p.id,name:p.name,classId:p.classId,seat:p.seat})));
 const members=useMemo(()=>JSON.parse(memberKey) as Explorer[],[memberKey]);
 // The room membership resolver below supplies Auth identities without trusting motion payloads.
 const network=useCallback((receive:(id:string,m:Motion)=>void)=>{
  let closed=false,transport:ReturnType<typeof connectMotion>|undefined,retry:ReturnType<typeof setTimeout>|undefined;
  async function connect(){try{
   const {lobbyCommand}=await import('@/game/multiplayer/client');const room=await lobbyCommand('GET',{roomId:snapshot.roomId});if(closed)return;
   const party=members.map(p=>{const member=room.players.find(m=>m.id===p.id);if(!member)throw Error('STALE_ROSTER');return {...p,userId:member.userId};});
   const me=party.find(p=>p.id===snapshot.myActorId);if(me)transport=connectMotion(snapshot.roomId,party,me.userId,campaign.sceneToken,receive,setMotionStatus);
  }catch{if(!closed){setMotionStatus('Movement reconnecting…');retry=setTimeout(()=>void connect(),3000);}}}
  void connect();
  return {send:(m:Motion)=>transport?.send(m),close:()=>{closed=true;if(retry)clearTimeout(retry);transport?.close();}};
 },[snapshot.roomId,snapshot.myActorId,campaign.sceneToken,members]);
 const ready=campaign.rally.includes(snapshot.myActorId??'');
 return <div className="exploration-page"><div className="page-heading"><h1>Expedition</h1><p role="status">{connection} · {motionStatus}</p></div>{error&&<p role="alert">{error}</p>}<p role="status">Rally {campaign.rally.filter(id=>campaign.activeIds.includes(id)).length}/{campaign.activeIds.length} • Semua anggota aktif harus setuju.</p>
 <Exploration view={{scene:campaign.scene,sceneToken:campaign.sceneToken,locked:snapshot.phase!=='EXPLORATION',...(campaign.story?{story:{state:campaign.story,now}}:{}),party:members,localId:snapshot.myActorId??''}} network={network} onInteract={zone=>{if(zone==='guide')setNotice('Delapan Segel Arcane melindungi NOVA ZENITH. Ikuti rune ke timur, lalu kumpulkan party.');else onIntent({kind:'RALLY',phaseId:snapshot.phaseId,version:snapshot.version,sceneToken:campaign.sceneToken,ready:true});}}/>
 {campaign.story&&<StoryOverlay story={campaign.story} now={now} activeIds={campaign.activeIds} working={working} onSkip={()=>onIntent({kind:'SKIP',phaseId:snapshot.phaseId,version:snapshot.version,storyInstance:campaign.story!.instanceId})}/>}
 {snapshot.phase==='COMPLETED'&&<section className='outcome panel'><h2>To be continued</h2><a className='button secondary' href='/' onClick={()=>sessionStorage.removeItem('nz.room.v1')}>Return home</a></section>}
 {ready&&<button className="button secondary" disabled={working} onClick={()=>onIntent({kind:'RALLY',phaseId:snapshot.phaseId,version:snapshot.version,sceneToken:campaign.sceneToken,ready:false})}>Batalkan rally</button>}<p role="status">{notice}</p><p className="muted">Reconnect kembali ke checkpoint scene. Pergerakan tidak menyimpan koordinat ke database.</p></div>;
}
