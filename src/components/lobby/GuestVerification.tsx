"use client";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useEffect, useRef, useState } from "react";
import { ensureGuest } from "@/lib/supabase/browser";
import { lobbyError } from "@/game/multiplayer/client";

export default function GuestVerification({onAuthenticated}:{onAuthenticated:(id:string)=>void}) {
 const sitekey=process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
 const widget=useRef<HCaptcha>(null),busy=useRef(false);
 const [ready,setReady]=useState(false);
 const [token,setToken]=useState(""),[working,setWorking]=useState(false);
 const [error,setError]=useState(""),[attempt,setAttempt]=useState(0);
 useEffect(()=>{if(ready)return;const timer=setTimeout(()=>setError(old=>old||"hCaptcha belum selesai dimuat. Periksa koneksi, lalu coba kembali atau muat ulang halaman."),15000);return()=>clearTimeout(timer);},[ready,attempt]);
 function invalidate(message:string){setToken("");setError(message);}
 async function signIn(){
  if(busy.current||!token)return;
  busy.current=true;setWorking(true);setError("");
  // Tokens are single-use; consume locally before starting the network request.
  const submittedToken=token;setToken("");
  let id:string|undefined;
  try{id=await ensureGuest(submittedToken);}
  catch(e){setError(lobbyError(e));}
  finally{widget.current?.resetCaptcha();busy.current=false;setWorking(false);}
  if(id)onAuthenticated(id);
 }
 return <section className="panel guest-verification" aria-labelledby="guest-verification-title" aria-busy={working}>
  <p className="eyebrow">ENTER NOVA ZENITH</p>
  <h2 id="guest-verification-title">Verifikasi adventurer</h2>
  <p>Selesaikan hCaptcha untuk membuat identitas guest sebelum Create atau Join expedition.</p>
  {sitekey?<>
   <HCaptcha key={attempt} ref={widget} sitekey={sitekey} size="compact" theme="dark" reCaptchaCompat={false} sentry={false} userJourneys={false}
    onLoad={()=>{setReady(true);setError("");}}
    onVerify={value=>{if(!busy.current){setToken(value);setError("");}}}
    onExpire={()=>invalidate("Verifikasi kedaluwarsa. Silakan selesaikan hCaptcha kembali.")}
    onChalExpired={()=>invalidate("Waktu challenge habis. Silakan coba kembali.")}
    onError={()=>invalidate("hCaptcha tidak dapat dimuat atau diselesaikan. Periksa koneksi lalu coba kembali.")}/>
   <p role="status">{working?"Menyiapkan identitas guest…":token?"Verifikasi siap. Lanjutkan sebagai guest.":"Menunggu verifikasi hCaptcha."}</p>
   <button className="button primary" disabled={!token||working} onClick={()=>void signIn()}>{working?"Signing in…":"Lanjutkan sebagai guest"}</button>
   {error&&<button className="text-button" disabled={working} onClick={()=>{setToken("");setError("");setReady(false);setAttempt(n=>n+1);}}>Muat ulang hCaptcha</button>}
   {error&&!ready&&<button className="text-button" onClick={()=>window.location.reload()}>Muat ulang halaman</button>}
  </>:<p role="alert">Site key hCaptcha belum dikonfigurasi. Isi NEXT_PUBLIC_HCAPTCHA_SITE_KEY sesuai .env.example lalu build ulang.</p>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
