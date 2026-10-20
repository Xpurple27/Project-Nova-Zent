
import "server-only";
import { createClient } from "@supabase/supabase-js";
/** Reserved server boundary. Current lobby and offline QA never use admin credentials. */
export function adminSupabase(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)throw new Error("SERVER_CREDENTIAL_NOT_CONFIGURED");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
