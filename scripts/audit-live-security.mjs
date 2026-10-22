// Opt-in probe with temporary QA fixtures only. Never embeds privileged credentials.
import{chromium}from'@playwright/test';
import{readFile,writeFile}from'node:fs/promises';import assert from'node:assert/strict';
const qa=JSON.parse(await readFile('.uat.json','utf8')),base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,checks=[];let room;
const browser=await chromium.launch({headless:true,executablePath:process.env.NOVA_QA_CHROMIUM,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});const page=await browser.newPage({ignoreHTTPSErrors:true});
async function request(i,path,body,method='POST'){return page.evaluate(async({url,key,token,body,method})=>{const r=await fetch(url,{method,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});return{status:r.status,data:await r.json()};},{url:base+path,key,token:qa.sessions[i].access_token,body,method});}
async function rpc(i,command,payload,id=crypto.randomUUID()){return request(i,'/rest/v1/rpc/nz_lobby_v1',{p_command:command,p_payload:payload,p_request_id:id});}
const ok=r=>{assert.ok(r.status<300,JSON.stringify(r.data));return r.data;};
try{room=ok(await rpc(0,'CREATE',{nickname:'QA security'}));
await Promise.all([1,2,3].map(i=>rpc(i,'JOIN',{code:room.code,nickname:'QA security '+i}).then(ok)));
assert.equal((await rpc(4,'JOIN',{code:room.code,nickname:'QA capacity'})).data.message,'ROOM_FULL');checks.push('fifth join denied');
const claim=await Promise.all([rpc(0,'SELECT_CLASS',{roomId:room.id,classId:'MAGE'}),rpc(1,'SELECT_CLASS',{roomId:room.id,classId:'MAGE'})]);assert.equal(claim.filter(r=>r.status<300).length,1);checks.push('simultaneous class claim has one winner');
for(let i=0;i<4;i++)ok(await rpc(i,'SELECT_CLASS',{roomId:room.id,classId:['WARRIOR','MAGE','THIEF','HEALER'][i]}));
for(let i=0;i<4;i++)ok(await rpc(i,'SELECT_SCHOOL',{roomId:room.id,schoolLevel:['SD','SMP','SMA','SD'][i]}));
for(let i=0;i<4;i++)ok(await rpc(i,'SET_READY',{roomId:room.id,ready:true}));
const id=crypto.randomUUID(),starts=await Promise.all([rpc(0,'START',{roomId:room.id},id),rpc(0,'START',{roomId:room.id},id)]);starts.forEach(ok);assert.equal(starts[0].data.sessionId,starts[1].data.sessionId);checks.push('duplicate concurrent Start returns one session');
for(const[path,body,method]of[
 ['/rest/v1/session_views?session_id=eq.'+room.sessionId,{snapshot_json:{boss:{hp:0,rage:0},phase:'VICTORY'}},'PATCH'],
 ['/rest/v1/room_players?room_id=eq.'+room.id,{class_id:'HEALER',ready:true},'PATCH'],
 ['/rest/v1/rpc/nz_combat_commit_v1',{p_session:room.sessionId,p_expected:'0',p_document:{},p_public:{},p_due:0},'POST'],
 ['/rest/v1/rpc/nz_combat_bank_v1',{},'POST'],
 ['/rest/v1/rpc/nz_question_import_v1',{p_items:[]},'POST']]){const r=await request(0,path,body,method);assert.equal(r.status,403,path);checks.push('client denied '+path.split('?')[0]);}
const outsider=await request(4,'/functions/v1/nova-combat',{sessionId:room.sessionId,intent:{kind:'GET'},requestId:crypto.randomUUID()});assert.equal(outsider.data.error,'NOT_A_MEMBER');checks.push('outsider snapshot denied');
const projection=await request(4,'/rest/v1/session_views?session_id=eq.'+room.sessionId,undefined,'GET');assert.deepEqual(projection.data,[]);checks.push('outsider RLS projection is empty');
await writeFile('.qa/live-security.json',JSON.stringify({roomId:room.id,sessionId:room.sessionId,checks},null,2));console.log('SECURITY PASS '+checks.length+' checks; session '+room.sessionId);

}finally{await browser.close();}
