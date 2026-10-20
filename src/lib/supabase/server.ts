
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
export async function serverSupabase(){
 const jar=await cookies();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error("SUPABASE_NOT_CONFIGURED");
 return createServerClient(url,key,{
  cookies:{
   getAll(){return jar.getAll();},
   setAll(values){
    try { for(const {name,value,options} of values)jar.set(name,value,options); }
    catch { /* Current lobby uses tab-scoped browser Auth; Server Components cannot set cookies. */ }
   }
  }
 });
}
