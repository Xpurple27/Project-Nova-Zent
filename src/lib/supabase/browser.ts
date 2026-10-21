
"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let client:SupabaseClient|null=null;
let signup:Promise<string>|null=null;
export function browserSupabase():SupabaseClient {
 if(typeof window==="undefined")throw new Error("BROWSER_ONLY");
 if(client)return client;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error("SUPABASE_NOT_CONFIGURED");
 // Unique storage keys also isolate Supabase BroadcastChannel auth events between guest tabs.
 let tabId=window.sessionStorage.getItem("nz.tab.v1");
 if(!tabId){tabId=crypto.randomUUID();window.sessionStorage.setItem("nz.tab.v1",tabId);}
 client=createClient(url,key,{auth:{storage:window.sessionStorage,storageKey:"nz.auth.v1."+tabId,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 return client;
}
/** Restore only: page load must never create an identity without human verification. */
export async function restoreGuest():Promise<string|null> {
 const {data,error}=await browserSupabase().auth.getSession();
 if(error)throw error;
 if(!data.session)window.sessionStorage.removeItem("nz.room.v1");
 return data.session?.user.id??null;
}
export function ensureGuest(captchaToken:string):Promise<string> {
 // Share only an in-flight request. Never cache a user id after the session expires.
 if(signup)return signup;
 signup=(async()=>{
  const existing=await restoreGuest();
  if(existing)return existing;
  if(!captchaToken.trim())throw new Error("CAPTCHA_REQUIRED");
  const signed=await browserSupabase().auth.signInAnonymously({options:{captchaToken}});
  if(signed.error)throw signed.error;
  if(!signed.data.user||!signed.data.session)throw new Error("GUEST_IDENTITY_FAILED");
  return signed.data.user.id;
 })().finally(()=>{signup=null;});
 return signup;
}
