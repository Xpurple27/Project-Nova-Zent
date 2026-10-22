import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const qa=JSON.parse(await readFile('.uat.json','utf8')),full=JSON.parse(await readFile('.uat-result.json','utf8'));
const url='https://bbeymvooubwsbrkeukuu.supabase.co',key='sb_publishable_Y2cVkp1j_Oo55oiTu4rO6w_ge3yPJW6';
const browser=await chromium.launch({headless:true,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
const ctx=await browser.newContext({ignoreHTTPSErrors:true});const page=await ctx.newPage();const checks=[];let room;
const remote=async(i,path,body,method='POST')=>page.evaluate(async({url,key,token,body,method})=>{const r=await fetch(url,{method,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};},{url:url+path,key,token:qa.sessions[i].access_token,body,method});
const rpc=async(command,payload)=>{const r=await remote(0,'/rest/v1/rpc/nz_lobby_v1',{p_command:command,p_payload:payload,p_request_id:crypto.randomUUID()});assert.ok(r.status<300,JSON.stringify(r.body));return r.body;};
const command=async(i,intent,requestId=crypto.randomUUID(),sid=room.sessionId)=>{const r=await remote(i,'/functions/v1/nova-combat',{sessionId:sid,intent,requestId});if(r.status>=300)throw Error(r.body.error);return r.body;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const fence=s=>({turnId:s.turnId,phaseId:s.phaseId,version:s.version});
function solve(prompt){let m;if((m=prompt.match(/memiliki (\d+) kelompok.*masing-masing (\d+)/)))return +m[1]*+m[2];if((m=prompt.match(/HP (\d+) bertambah (\d+)/)))return +m[1]+ +m[2];if((m=prompt.match(/Jika merah (\d+)/)))return +m[1]*1.5;if((m=prompt.match(/Urutan rune: (\d+), (\d+), (\d+)/))){const [a,b,c]=m.slice(1).map(Number);return b===2*a&&c===2*b?2*c:c+b-a;}if((m=prompt.match(/3x \+ (\d+) = (\d+)/)))return (+m[2]- +m[1])/3;if((m=prompt.match(/25% dari (\d+) HP/)))return +m[1]/4;if((m=prompt.match(/membutuhkan (\d+) energi/)))return +m[1]/4*7;if((m=prompt.match(/2\(x \+ (\d+)\) \+ 3x = (\d+)/)))return (+m[2]-2*+m[1])/5;if((m=prompt.match(/Serangan (\d+) mendapat/)))return +m[1];if((m=prompt.match(/saat x = (\d+)/)))return 3*+m[1]*+m[1]-2*+m[1];if(prompt.includes('persen peluang'))return 25;throw Error('Unknown question');}
try{
 const terminal=await Promise.all(qa.sessions.map((_,i)=>command(i,{kind:'PUMP'},crypto.randomUUID(),full.sessionId)));assert.equal(new Set(terminal.map(s=>s.lastEventSeq)).size,1);assert.ok(terminal.every(s=>s.phase==='VICTORY'));checks.push('terminal Victory replays preserve sequence and outcome');
 room=await rpc('CREATE',{nickname:'QA Reliability'});room=await rpc('SELECT_CLASS',{roomId:room.id,classId:'WARRIOR'});room=await rpc('SELECT_SCHOOL',{roomId:room.id,schoolLevel:'SMA'});room=await rpc('SET_READY',{roomId:room.id,ready:true});room=await rpc('START',{roomId:room.id});
 const started=await Promise.all([command(0,{kind:'START'}),command(0,{kind:'START'})]);assert.equal(started[0].turnId,started[1].turnId);checks.push('real concurrent Start returns one turn/session');
 const denied=await remote(0,'/rest/v1/rpc/nz_combat_load_v1',{p_session:room.sessionId,p_uid:qa.sessions[0].user.id});assert.equal(denied.status,403);checks.push('authenticated JWT denied private backend loader');
 const forged=await remote(0,'/rest/v1/session_views?room_id=eq.'+room.id,{snapshot_json:{boss:{hp:0}}},'PATCH');assert.equal(forged.status,403);checks.push('direct HP projection mutation denied');
 await assert.rejects(()=>command(1,{kind:'GET'}),/NOT_A_MEMBER/);checks.push('outsider denied combat snapshot');
 let s=await command(0,{kind:'GET'}),ultTurn=null;const actions=new Set(),answers=new Set();let lastHeartbeat=0;
 for(let step=0;step<500;step++){
  if(Date.now()-lastHeartbeat>10000){await rpc('HEARTBEAT',{roomId:room.id});lastHeartbeat=Date.now();}
  if(step%20===0)console.log('RELIABILITY',s.turn,s.phase,'Ultimate',s.party[0].ultimate);
  if(s.phase==='COMBAT_PLANNING'&&!actions.has(s.turnId)){
   const ultimate=s.party[0].ultimate===100;const intent={kind:'ACTION',...fence(s),skillId:ultimate?'warrior.last_bastion':'warrior.slash',targetId:'boss'};const requestId=crypto.randomUUID();
   const duplicate=await Promise.all([command(0,intent,requestId),command(0,intent,requestId)]);assert.equal(duplicate[0].version,duplicate[1].version);assert.equal(duplicate[0].progress.filter(a=>a.locked).length,1);actions.add(s.turnId);
   if(ultimate){ultTurn=s.turnId;checks.push('concurrent Ultimate requests finalize one action');}
  }
  if(s.assignment&&s.assignment.performance===null&&!answers.has(s.assignment.id)){
   const q=s.assignment;if(q.startsAt>s.serverNow)await sleep(q.startsAt-s.serverNow+50);
   const token=q.options.find(o=>o.text===String(solve(q.prompt)))?.token;assert.ok(token);
   const intent={kind:'ANSWER',...fence(s),assignmentId:q.id,optionToken:token};const requestId=crypto.randomUUID();const result=await Promise.all([command(0,intent,requestId),command(0,intent,requestId)]);assert.equal(result[0].version,result[1].version);assert.equal(result[0].assignment?.performance,result[1].assignment?.performance);answers.add(q.id);
   if(!checks.includes('duplicate finalized answer returns one receipt/grade'))checks.push('duplicate finalized answer returns one receipt/grade');
   await Promise.all([command(0,{kind:'PUMP'}),command(0,{kind:'PUMP'}),command(0,{kind:'GET'})]);
  }
  s=await command(0,{kind:'GET'});
  if(ultTurn&&s.events.some(e=>e.type==='ACTION_RESOLVED'&&e.text.includes('Last Bastion'))){
   const casts=s.events.filter(e=>e.type==='ACTION_RESOLVED'&&e.text.includes('Last Bastion'));assert.equal(casts.length,1);assert.equal(s.party[0].ultimate,0);checks.push('Ultimate executes once and consumes gauge once under competing resolvers');break;
  }
  if(['VICTORY','DEFEAT','ABORTED'].includes(s.phase))throw Error('Encounter ended before Ultimate probe');
  if(step===499)throw Error('Reliability probe stalled');
  await sleep(500);
 }
 await writeFile('.uat-reliability.json',JSON.stringify({roomCode:room.code,roomId:room.id,sessionId:room.sessionId,checks,turn:s.turn,phase:s.phase},null,2));console.log('LIVE RELIABILITY PASS',checks);
}finally{await browser.close();}
