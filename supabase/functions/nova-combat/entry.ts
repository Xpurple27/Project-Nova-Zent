// @ts-nocheck -- Deno entrypoint is bundled and checked by Deno at deployment.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { execute, parseIntent } from '../../../src/game/multiplayer/server/service';
import {RequestBudget,limitedBody} from '../../../src/game/multiplayer/server/http-guard';
const requestBudget=new RequestBudget();
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
async function rpc(name,args={}){const {data,error}=await db.rpc(name,args);if(error)throw new Error(error.message);return data;}
let bankCache,bankCachedAt=0;
const persistence={
 load:(sessionId,uid,token,requestId,intent)=>rpc('nz_combat_load_v1',{p_session:sessionId,p_uid:uid,p_token:token,p_request:requestId,p_payload:intent}),
 bank:async()=>{if(!bankCache||Date.now()-bankCachedAt>60000){bankCachedAt=Date.now();bankCache=rpc('nz_combat_bank_v1');bankCache.catch(()=>{bankCache=null;});}return await bankCache;},
 commit:c=>rpc('nz_combat_commit_v1',{p_session:c.sessionId,p_expected:c.expected,p_document:c.document,p_public:c.projection,p_due:c.due,p_uid:c.uid,p_request:c.requestId,p_payload:c.payload,p_result:c.result,p_cutoff:c.cutoff})
};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return new Response(JSON.stringify({error:'METHOD_NOT_ALLOWED'}),{status:405,headers:cors});
 let sessionId;
 try{
  const raw=await limitedBody(req);
  const body=JSON.parse(raw);sessionId=body.sessionId;
  if(typeof sessionId!=='string'||!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(sessionId))throw new Error('INVALID_SESSION');
  let uid=null,token=null,intent,requestId=null;
  if(body.worker===true){
   if(typeof body.token!=='string'||body.token.length!==36)throw new Error('INVALID_WORKER_CAPABILITY');
   token=body.token;intent={kind:'PUMP'};
   // load() verifies the short-lived DB capability before returning any state.
  }else{
   const bearer=req.headers.get('Authorization')?.replace(/^Bearer /i,'');
   if(!bearer)throw new Error('UNAUTHENTICATED');
   const {data,error}=await db.auth.getUser(bearer);if(error||!data.user)throw new Error('UNAUTHENTICATED');uid=data.user.id;if(!requestBudget.allow(uid,Date.now()))throw new Error('RATE_LIMITED');
   intent=parseIntent(body.intent);
   if(!['GET','START','PUMP'].includes(intent.kind)){
    if(typeof body.requestId!=='string'||!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(body.requestId))throw new Error('INVALID_REQUEST_ID');requestId=body.requestId;
   }
  }
  const result=await execute(persistence,sessionId,uid,intent,requestId,token);
  console.info(JSON.stringify({event:'combat_command',sessionId,kind:intent.kind,version:result?.version,phase:result?.phase}));
  return new Response(JSON.stringify(body.worker?{ok:true}:result),{headers:cors});
 }catch(e){
  const known=/^(PAYLOAD_TOO_LARGE|INVALID_|STALE_|DEADLINE_|NOT_|UNAUTHENTICATED|ACTION_LOCKED|ANSWER_LOCKED|INACTIVE_|ROOM_|SESSION_|QUESTION_BANK_|ENCOUNTER_|STATE_CONFLICT|IDEMPOTENCY_|RATE_LIMITED|Requires |Character is |Wrong class)/;
  const message=e instanceof Error?e.message:'INTERNAL_ERROR';const safe=known.test(message)?message:'INTERNAL_ERROR';
  console.warn(JSON.stringify({event:'combat_rejected',sessionId,code:safe}));
  return new Response(JSON.stringify({error:safe}),{status:safe==='UNAUTHENTICATED'?401:safe==='RATE_LIMITED'?429:safe==='PAYLOAD_TOO_LARGE'?413:safe==='INTERNAL_ERROR'?500:409,headers:cors});
 }
});
