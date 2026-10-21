import { browserSupabase } from '../../lib/supabase/browser';
import { GAME } from '../config';
import { lobbyCommand } from './client';
import type { CombatSnapshot, Intent } from './protocol';
export async function combatCommand(sessionId:string,intent:Intent,requestId=crypto.randomUUID()):Promise<CombatSnapshot>{
 const client=browserSupabase();const body={sessionId,intent,requestId};
 let response=await client.functions.invoke('nova-combat',{body});
 if(response.error&&(!(response.error.context instanceof Response)||response.error.context.status>=500))response=await client.functions.invoke('nova-combat',{body});
 if(response.error){
  let message=response.error.message;
  if(response.error.context instanceof Response){try{message=(await response.error.context.json()).error??message;}catch{/* Preserve transport error. */}}
  throw new Error(message);
 }
 const data=response.data as CombatSnapshot;
 if(!data||data.schema!==1||data.sessionId!==sessionId||!/^\d+$/.test(data.version)||!Array.isArray(data.party))throw new Error('INVALID_COMBAT_RESPONSE');
 return data;
}
/** Single subscription owner; durable snapshots always win over presentation. */
export function connectCombat(sessionId:string,roomId:string,onSnapshot:(s:CombatSnapshot,rtt:number)=>void,onConnection:(s:string)=>void,onError:(e:unknown)=>void){
 const client=browserSupabase();let alive=true,busy=false,dirty=false;
 const refresh=async()=>{
  if(!alive)return;if(busy){dirty=true;return;}busy=true;
  do{dirty=false;const start=performance.now();try{const s=await combatCommand(sessionId,{kind:'GET'});if(alive){onSnapshot(s,performance.now()-start);onConnection('Online');}}catch(e){if(alive){onConnection('Reconnecting');onError(e);}}}while(alive&&dirty);
  busy=false;
 };
 const heartbeat=async()=>{try{await lobbyCommand('HEARTBEAT',{roomId});}catch(e){if(alive){onConnection('Reconnecting');onError(e);}}};
 const channel=client.channel('nz:combat:'+sessionId).on('postgres_changes',{event:'UPDATE',schema:'public',table:'session_views',filter:'session_id=eq.'+sessionId},()=>{void refresh();}).subscribe(status=>{
  if(!alive)return;if(status==='SUBSCRIBED'){void refresh();}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')onConnection('Reconnecting');
 });
 const interval=setInterval(()=>void refresh(),GAME.pollMs),beat=setInterval(()=>void heartbeat(),GAME.heartbeatMs);
 const focus=()=>{void heartbeat();void refresh();};const offline=()=>onConnection('Disconnected');
 window.addEventListener('online',focus);window.addEventListener('focus',focus);window.addEventListener('offline',offline);
 void heartbeat();void refresh();
 return {refresh,close:()=>{alive=false;clearInterval(interval);clearInterval(beat);window.removeEventListener('online',focus);window.removeEventListener('focus',focus);window.removeEventListener('offline',offline);void client.removeChannel(channel);}};
}
