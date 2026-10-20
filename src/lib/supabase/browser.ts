
"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let client:SupabaseClient|null=null;
let identity:Promise<string>|null=null;
export function browserSupabase():SupabaseClient {
 if(typeof window==="undefined")throw new Error("BROWSER_ONLY");
 if(client)return client;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error("SUPABASE_NOT_CONFIGURED");
 // Tab-scoped credentials allow separate guest players in independently opened tabs.
 client=createClient(url,key,{auth:{storage:window.sessionStorage,storageKey:"nz.auth.v1",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 return client;
}
export function ensureGuest():Promise<string> {
 if(identity)return identity;
 identity=(async()=>{const c=browserSupabase();const {data,error}=await c.auth.getSession();if(error)throw error;if(data.session)return data.session.user.id;
 const signed=await c.auth.signInAnonymously();if(signed.error)throw signed.error;if(!signed.data.user)throw new Error("GUEST_IDENTITY_FAILED");return signed.data.user.id;})();
 identity.catch(()=>{identity=null;});return identity;
}
