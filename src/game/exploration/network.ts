'use client';
import {browserSupabase} from '@/lib/supabase/browser';
import {MAPS,validMotion,type Motion} from './model';
import type {Explorer} from './bridge';
/** Per-sender private topics bind identity through RLS; payload identity is never trusted. */
export function connectMotion(roomId:string,party:Explorer[],localUserId:string,sceneToken:string,onMotion:(id:string,motion:Motion)=>void,onStatus:(status:string)=>void){
 const client=browserSupabase();let alive=true,ready=false;
 const channels=party.map(member=>client.channel(`nz:motion:${roomId}:${member.userId}`,{config:{private:true,broadcast:{self:false}}}).on('broadcast',{event:'motion'},({payload})=>{
  if(alive&&member.userId!==localUserId&&payload&&payload.scene in MAPS&&validMotion(payload,MAPS[payload.scene as keyof typeof MAPS],sceneToken))onMotion(member.id,payload);
 }).subscribe(status=>{if(!alive)return;if(member.userId===localUserId){ready=status==='SUBSCRIBED';onStatus(ready?'Movement online':'Movement reconnecting');}}));
 const sender=channels[party.findIndex(p=>p.userId===localUserId)];let last=-Infinity;
 return {send:(motion:Motion)=>{const now=performance.now();if(alive&&ready&&sender&&now-last>=100){last=now;void sender.send({type:'broadcast',event:'motion',payload:motion});}},close:()=>{alive=false;for(const channel of channels)void client.removeChannel(channel);}};
}
