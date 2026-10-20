
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
export async function serverSupabase(){
 const jar=await cookies();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error("SUPABASE_NOT_CONFIGURED");
 return createServerClient(url,key,{cookies:{getAll:()=>jar.getAll(),setAll:(values)=>{try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server components cannot write cookies; current lobby uses tab-scoped browser Auth. */}}});
}
