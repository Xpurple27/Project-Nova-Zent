
"use client";
import { useCallback,useEffect,useState } from "react";
import HeroArt from "../presentation/HeroArt";
import {HERO_IDENTITY} from "@/game/animation/identity";
import GuestVerification from "./GuestVerification";
import OnlineCombat from "../combat/OnlineCombat";
import { CHARACTERS, GAME } from "@/game/config";
import { CLASSES, type RoomState } from "@/game/core/types";
import { browserSupabase,restoreGuest } from "@/lib/supabase/browser";
import { lobbyCommand,lobbyError,normalizeRoomCode,validRoomCode,type LobbyCommand } from "@/game/multiplayer/client";
export default function Lobby(){
 const [uid,setUid]=useState(""),[room,setRoom]=useState<RoomState|null>(null);
 const [nickname,setNickname]=useState("Adventurer"),[code,setCode]=useState("");
 const [error,setError]=useState(""),[working,setWorking]=useState(false),[connection,setConnection]=useState("Connecting");
 const [online,setOnline]=useState<string[]>([]);
 const apply=useCallback((next:RoomState)=>setRoom(old=>!old||old.id!==next.id||BigInt(next.version)>=BigInt(old.version)?next:old),[]);
 useEffect(()=>{
  let mounted=true;
  restoreGuest().then(async id=>{
   if(!mounted)return;
   if(!id){setConnection("Verification required");return;}
   setUid(id);setConnection("Online");
   const saved=sessionStorage.getItem("nz.room.v1");
   if(saved){try{const r=await lobbyCommand("HEARTBEAT",{roomId:saved});if(mounted)apply(r);}catch(e){if(mounted){setError(lobbyError(e));sessionStorage.removeItem("nz.room.v1");}}}
  }).catch(e=>{if(mounted){setError(lobbyError(e));setConnection("Unavailable");}});
  return ()=>{mounted=false;};
 },[apply]);
 const roomId=room?.id;
 const started=!!room&&!["LOBBY","CHARACTER_SELECT","READY"].includes(room.state);
 useEffect(()=>{
  if(!roomId||!uid||started)return;
  const c=browserSupabase();let active=true,busy=false;
  const refresh=async()=>{if(busy||!active)return;busy=true;try{const r=await lobbyCommand("GET",{roomId});if(active)apply(r);}catch(e){if(active){setConnection("Reconnecting");setError(lobbyError(e));}}finally{busy=false;}};
  const heartbeat=async()=>{try{const r=await lobbyCommand("HEARTBEAT",{roomId});if(active){apply(r);setConnection("Online");}}catch{if(active)setConnection("Reconnecting");}};
  const changes=c.channel("nz:projection:"+roomId).on("postgres_changes",{event:"UPDATE",schema:"public",table:"session_views",filter:"room_id=eq."+roomId},()=>{void refresh();}).subscribe();
  const presence=c.channel("nz:room:"+roomId+":presence",{config:{private:true,presence:{key:uid}}})
   .on("presence",{event:"sync"},()=>{if(active)setOnline(Object.keys(presence.presenceState()));})
   .subscribe(status=>{if(status==="SUBSCRIBED"){void presence.track({online:true});}else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){if(active)setConnection("Reconnecting");}});
  const poll=setInterval(()=>{void refresh();},GAME.pollMs),beat=setInterval(()=>{void heartbeat();},GAME.heartbeatMs);
  const focus=()=>{void heartbeat();void refresh();};
  window.addEventListener("online",focus);window.addEventListener("focus",focus);
  const offline=()=>setConnection("Disconnected");window.addEventListener("offline",offline);
  void refresh();
  return ()=>{active=false;clearInterval(poll);clearInterval(beat);window.removeEventListener("online",focus);window.removeEventListener("focus",focus);window.removeEventListener("offline",offline);void c.removeChannel(changes);void c.removeChannel(presence);};
 },[roomId,uid,apply,started]);
 async function send(command:LobbyCommand,payload:Record<string,unknown>={}){
  if(working)return;setWorking(true);setError("");
  try{
   const next=await lobbyCommand(command,{...(room?{roomId:room.id}:{}),...payload});
   if(command==="LEAVE"){sessionStorage.removeItem("nz.room.v1");setRoom(null);setOnline([]);}
   else{sessionStorage.setItem("nz.room.v1",next.id);apply(next);}
  }catch(e){setError(lobbyError(e));if(room)try{apply(await lobbyCommand("GET",{roomId:room.id}));}catch{/* Keep original failure. */}}
  finally{setWorking(false);}
 }
 const me=room?.players.find(p=>p.userId===uid),coordinator=me?.id===room?.coordinatorId;
 if(started&&room)return <OnlineCombat key={room.sessionId} sessionId={room.sessionId} roomId={room.id}/>;
 return <div className="lobby-page"><div className="page-heading"><div><p className="eyebrow">GATHER YOUR PARTY</p><h1>Expedition lobby<span className="accent">.</span></h1><p>Empat class unik. Satu party. Bangun kekuatan bersama.</p></div><span className="connection"><span className="status-dot"/>{connection}</span></div>
 {error&&<div role="alert" className="notice error">{error}</div>}
 {!uid&&connection==="Verification required"&&<GuestVerification onAuthenticated={id=>{setUid(id);setConnection("Online");setError("");}}/>}
 {!room?<div className="entry-grid"><section className="panel"><p className="eyebrow">YOUR IDENTITY</p><h2>The adventurer behind the formula</h2><label htmlFor="nickname">Display name</label><input id="nickname" maxLength={20} minLength={2} value={nickname} onChange={e=>setNickname(e.target.value)} autoComplete="nickname"/><p className="muted">Identitas tersimpan pada tab ini. Refresh tab untuk reconnect. Tab baru yang dibuka terpisah dapat menjadi pemain berbeda.</p><button className="button primary" disabled={!uid||working||nickname.trim().length<2} onClick={()=>void send("CREATE",{nickname:nickname.trim()})}>Create expedition <span>+</span></button></section><section className="panel join-panel"><p className="eyebrow">AN INVITATION AWAITS</p><h2>Join a party</h2><label htmlFor="room-code">7-character room code</label><input id="room-code" className="code-input" maxLength={7} placeholder="X7K4P2Q" value={code} onChange={e=>setCode(normalizeRoomCode(e.target.value))} autoCapitalize="characters" autoComplete="off"/><button className="button secondary" disabled={!uid||working||!validRoomCode(code)||nickname.trim().length<2} onClick={()=>void send("JOIN",{code,nickname:nickname.trim()})}>Join expedition <span>↗</span></button><p className="muted">Room yang sudah dimulai hanya menerima reconnect anggota yang sama.</p></section></div>:
 <><section className="room-strip panel"><div><p className="eyebrow">EXPEDITION CODE</p><strong className="room-code">{room.code}</strong></div><button className="button small secondary" onClick={()=>{void navigator.clipboard.writeText(room.code).catch(()=>setError("Salin kode room yang terlihat di layar."));}}>Copy code</button><span className="muted">{room.players.length}/4 adventurers · {room.state.replaceAll("_"," ")}</span>{!started&&<button className="text-button" disabled={working} onClick={()=>void send("LEAVE")}>Leave room</button>}</section>
 <div className="party-grid">{Array.from({length:4},(_,seat)=>{const p=room.players.find(p=>p.seat===seat);return <article className={"panel player-slot "+(p?.userId===uid?"local-slot":"")} key={seat}>{p?<><div className="slot-top"><span className="eyebrow">SLOT {seat+1}{p.userId===uid?" · YOU":""}</span><span className={p.status==="INACTIVE"?"muted":"teal"}>{p.status==="INACTIVE"?"Inactive":online.includes(p.userId)||p.userId===uid?"● Online":"◌ Reconnecting"}</span></div><div className="slot-emblem">{p.classId?<HeroArt kind={p.classId} portrait/>:<span className="muted">Pilih class</span>}</div><h3>{p.nickname}</h3><p>{p.classId?CHARACTERS[p.classId].name:"Choosing a path…"}</p><div className="slot-footer"><span className={p.ready?"ready-badge":"muted"}>{p.ready?"✓ READY":"Not ready"}</span>{p.id===room.coordinatorId&&<span className="muted">Coordinator</span>}</div>{coordinator&&p.status==="INACTIVE"&&!started&&<button className="text-button" disabled={working} onClick={()=>void send("REMOVE_INACTIVE",{playerId:p.id})}>Release inactive slot</button>}</>:<><p className="eyebrow">SLOT {seat+1}</p><div className="slot-emblem muted">+</div><h3 className="muted">Awaiting adventurer</h3><p className="muted">Share your room code.</p></>}</article>;})}</div>
 {<section className="panel selection-panel"><div className="section-title"><div><p className="eyebrow">YOUR PATH</p><h2>Choose a class</h2></div><p>Perubahan class membatalkan Ready seluruh party.</p></div><div className="class-picks">{CLASSES.map(id=>{const c=CHARACTERS[id],owner=room.players.find(p=>p.classId===id),taken=!!owner&&owner.id!==me?.id;return <button key={id} className={"class-pick "+(me?.classId===id?"selected":"")} disabled={working||taken} onClick={()=>void send("SELECT_CLASS",{classId:id})} style={{"--class-color":c.color} as React.CSSProperties} aria-pressed={me?.classId===id}><HeroArt kind={id}/><span className="pick-copy"><strong>{c.name}</strong><span className="hero-title">{HERO_IDENTITY[id].title}</span><span className="hero-role">{HERO_IDENTITY[id].role}</span><small>{taken?"Taken by "+owner?.nickname:c.maxHp+" HP · "+c.resourceType}</small><span className="hero-style">{HERO_IDENTITY[id].style}</span></span></button>;})}</div><div className="ready-actions"><button className="button secondary" disabled={working||!me?.classId} onClick={()=>void send("SET_READY",{ready:!me?.ready})}>{me?.ready?"Cancel ready":"Ready for expedition"}</button>{coordinator&&<button className="button primary" disabled={working||room.state!=="READY"} onClick={()=>void send("START")}>Start expedition <span>↗</span></button>}<p className="muted">Pemain 1–4 didukung. Coordinator mengirim intent; server memvalidasi seluruh roster.</p></div></section>}</>}
 </div>;
}
