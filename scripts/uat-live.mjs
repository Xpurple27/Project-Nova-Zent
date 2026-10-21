// Opt-in real backend UAT. .uat.json contains short-lived synthetic Auth sessions, never committed.
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const url='https://bbeymvooubwsbrkeukuu.supabase.co',key='sb_publishable_Y2cVkp1j_Oo55oiTu4rO6w_ge3yPJW6';
const qa=JSON.parse(await readFile('.uat.json','utf8'));
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3000'],{stdio:['ignore','pipe','pipe']});
app.stdout.on('data',()=>{});app.stderr.on('data',()=>{});
let browser;const pages=[];const errors=[];const result={checks:[],phases:[],events:[],consoleErrors:errors};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 for(let n=0;n<40;n++){try{if((await fetch('http://127.0.0.1:3000')).ok)break;}catch{}await sleep(250);}
 browser=await chromium.launch({headless:true,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
 const contexts=await Promise.all(qa.sessions.map((_,i)=>browser.newContext({viewport:{width:i===0?320:390,height:850},ignoreHTTPSErrors:true})));

 for(let i=0;i<4;i++){
  await contexts[i].addInitScript(({session,tab})=>{sessionStorage.setItem('nz.tab.v1',tab);sessionStorage.setItem('nz.auth.v1.'+tab,JSON.stringify(session));},{session:qa.sessions[i],tab:'qa-'+i});
  const page=await contexts[i].newPage();
  // Remote Supabase uses the environment proxy; bridge only the local build into this browser.
  await page.route('http://127.0.0.1:3000/**',async route=>{const req=route.request();const r=await fetch(req.url(),{method:req.method(),headers:req.headers(),body:req.postDataBuffer()??undefined});const headers=Object.fromEntries(r.headers);delete headers['content-encoding'];delete headers['transfer-encoding'];delete headers['content-length'];await route.fulfill({status:r.status,headers,body:Buffer.from(await r.arrayBuffer())});});
  page.on('pageerror',e=>errors.push(e.message));pages.push(page);
 }
 await Promise.all(pages.map(p=>p.goto('http://127.0.0.1:3000/lobby')));
 console.log('UI probe',await pages[0].title(),pages[0].url(),(await pages[0].locator('body').innerText()).slice(0,600));
 const p0=pages[0];await p0.getByLabel('Display name').fill('QA Warrior');await p0.getByRole('button',{name:/Create expedition/}).click();await p0.locator('.room-code').waitFor({timeout:30000});
 const code=await p0.locator('.room-code').textContent();console.log('UAT room',code);result.roomCode=code;
 await Promise.all(pages.slice(1).map(async(p,i)=>{await p.getByLabel('Display name').fill(['QA Mage','QA Thief','QA Healer'][i]);await p.getByLabel('7-character room code').fill(code);await p.getByRole('button',{name:/Join expedition/}).click();await p.locator('.room-code').waitFor({timeout:30000});}));
 // Concurrent class race: only one of two Mage claims may win.
 await Promise.all(pages.slice(0,2).map(p=>p.getByRole('button',{name:/Mage/}).click().catch(()=>{})));
 await sleep(1500);
 const remote=async(i,path,body)=>pages[i].evaluate(async({url,key,token,body})=>{const r=await fetch(url,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});return {ok:r.ok,body:await r.json()};},{url:url+path,key,token:qa.sessions[i].access_token,body});
 const rpc=async(i,command,payload)=>{const r=await remote(i,'/rest/v1/rpc/nz_lobby_v1',{p_command:command,p_payload:payload,p_request_id:crypto.randomUUID()});if(!r.ok)throw Error('RPC '+command+' '+r.body.message);return r.body;};
 let room=await rpc(0,'GET',{roomId:await p0.evaluate(()=>sessionStorage.getItem('nz.room.v1'))});
 assert.equal(room.players.filter(p=>p.classId==='MAGE').length,1);result.checks.push('concurrent class claim: one Mage');
 // Release the contested class and choose the final unique roster through the UI.
 for(let i=0;i<2;i++)await rpc(i,'SELECT_CLASS',{roomId:room.id,classId:null});
 await sleep(1000);
 const classes=['Warrior','Mage','Thief','Healer'];
 for(let i=0;i<4;i++){await pages[i].getByRole('button',{name:new RegExp(classes[i])}).click();}
 await sleep(1500);
 await Promise.all(pages.map(p=>p.getByRole('button',{name:'Ready for expedition'}).click()));
 await p0.getByRole('button',{name:/Start expedition/}).click();
 await Promise.all(pages.map(p=>p.getByTestId('online-combat').waitFor({timeout:45000})));
 room=await rpc(0,'GET',{roomId:room.id});result.sessionId=room.sessionId;
 const command=async(i,intent,requestId=crypto.randomUUID())=>{const r=await remote(i,'/functions/v1/nova-combat',{sessionId:room.sessionId,intent,requestId});if(!r.ok)throw Error(r.body.error);return r.body;};
 const canonical=s=>JSON.stringify({turn:s.turnId,phase:s.phase,boss:s.boss,party:s.party,effects:s.effects,combo:s.combo,seq:s.lastEventSeq,version:s.version});
 const fence=s=>({turnId:s.turnId,phaseId:s.phaseId,version:s.version});
 const acted=new Set(),answered=new Set(),allEvents=new Map();let last='',disconnected=false,hostDropped=false,afkPlan=false,afkMath=false,oldFence;
 const solve=prompt=>{
  let m;if((m=prompt.match(/memiliki (\d+) kelompok.*masing-masing (\d+)/)))return +m[1]*+m[2];
  if((m=prompt.match(/HP (\d+) bertambah (\d+)/)))return +m[1]+ +m[2];
  if((m=prompt.match(/Jika merah (\d+)/)))return +m[1]*1.5;
  if((m=prompt.match(/Urutan rune: (\d+), (\d+), (\d+)/))){const [a,b,c]=m.slice(1).map(Number);return b===2*a&&c===2*b?2*c:c+(b-a);}
  if((m=prompt.match(/3x \+ (\d+) = (\d+)/)))return (+m[2]- +m[1])/3;
  if((m=prompt.match(/25% dari (\d+) HP/)))return +m[1]/4;
  if((m=prompt.match(/membutuhkan (\d+) energi/)))return +m[1]/4*7;
  if((m=prompt.match(/2\(x \+ (\d+)\) \+ 3x = (\d+)/)))return (+m[2]-2*+m[1])/5;
  if((m=prompt.match(/Serangan (\d+) mendapat/)))return +m[1];
  if((m=prompt.match(/saat x = (\d+)/)))return 3*+m[1]*+m[1]-2*+m[1];
  if(prompt.includes('persen peluang'))return 25;
  throw Error('Unknown pilot formula: '+prompt);
 };
 for(let iteration=0;iteration<900;iteration++){
  const requested=performance.now();const snaps=await Promise.all(pages.map((_,i)=>command(i,{kind:'GET'})));const s=snaps[0];
  if(iteration<3)console.log('Snapshot RTT',Math.round(performance.now()-requested),'remaining',Math.round((s.deadline??0)-s.serverNow));
  for(const ev of s.events)allEvents.set(ev.seq,ev);
  if(new Set(snaps.map(x=>x.version)).size===1){assert.equal(new Set(snaps.map(canonical)).size,1);}
  oldFence??=fence(s);
  const phase=s.turn+':'+s.phase;
  if(phase!==last){console.log('UAT',phase,'HP',s.boss.hp,'rage',s.boss.rage,'version',s.version);result.phases.push({turn:s.turn,phase:s.phase,bossHP:s.boss.hp,rage:s.boss.rage,version:s.version});last=phase;}
  if(['VICTORY','DEFEAT','ABORTED'].includes(s.phase)){
   assert.equal(s.phase,'VICTORY');await sleep(3500);const final=await Promise.all(pages.map((_,i)=>command(i,{kind:'GET'})));assert.equal(new Set(final.map(canonical)).size,1);result.checks.push('four authenticated browser sessions: identical terminal canonical state');
   await Promise.all(pages.map(p=>p.getByRole('heading',{name:'The seal holds.'}).waitFor({timeout:15000})));
   assert.equal(await p0.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);result.checks.push('320px online layout has no page overflow');
   await p0.screenshot({path:'.uat-victory.png',fullPage:true});break;
  }
  if(s.phase==='COMBAT_PLANNING'){
   oldFence??=fence(s);
   await Promise.all(snaps.map(async(snap,i)=>{
    const me=snap.party.find(p=>p.id===snap.myActorId);if(!me||me.hp<=0||snap.progress.find(p=>p.actorId===me.id)?.locked||acted.has(snap.turnId+':'+i))return;
    if(snap.turn===2&&i===2){afkPlan=true;return;}
    const skill=i===0&&me.resource>=30&&snap.turn%3===0?'Shield Wall':i===3&&me.resource>=35&&snap.party.some(p=>p.hp<p.maxHp-100)?'Healing Wave':['Slash','Arcane Bolt','Quick Strike','Holy Bolt'][i];
    await pages[i].getByRole('button',{name:new RegExp(skill)}).click({timeout:6000});
    if(snap.boss.core?.hp>0&&['Slash','Arcane Bolt','Quick Strike','Holy Bolt'].includes(skill))await pages[i].locator('.resolution-controls select').first().selectOption('core',{timeout:2500});
    await sleep(i*100);await pages[i].getByRole('button',{name:'Lock formula'}).click();acted.add(snap.turnId+':'+i);
   }));
   if(!hostDropped&&s.turn===4){hostDropped=true;await contexts[0].setOffline(true);await sleep(2200);await contexts[0].setOffline(false);await p0.reload();result.checks.push('host offline and refresh preserve encounter');}
  }
  if(['MATH_CHALLENGE','DEFENSIVE_REACTION','TEAM_RUNE'].includes(s.phase)){
   await Promise.all(snaps.map(async(snap,i)=>{
    const q=snap.assignment;if(!q||q.performance!==null||answered.has(q.id))return;
    if(snap.turn===3&&i===1&&q.context==='ACTION'){afkMath=true;return;}
    if(q.context==='REACTION'&&!disconnected){
     disconnected=true;const before=q.deadline;await contexts[i].setOffline(true);await sleep(1400);await contexts[i].setOffline(false);await pages[i].reload();const back=await command(i,{kind:'GET'});assert.equal(back.assignment?.id,q.id);assert.equal(back.assignment?.deadline,before);result.checks.push('target disconnect/reconnect restores exact reaction and deadline');
    }
    if(q.startsAt>snap.serverNow)await sleep(q.startsAt-snap.serverNow+100);
    const answer=String(solve(q.prompt));const dialog=pages[i].getByRole('dialog');await dialog.waitFor({timeout:6000});
    const texts=await dialog.getByRole('button').allTextContents();const index=texts.findIndex(t=>t.replace(/^[A-D]/,'').trim()===answer);assert.ok(index>=0,'answer option exists');
    try{await dialog.getByRole('button').nth(index).click({timeout:2500});answered.add(q.id);}catch(e){const current=await command(i,{kind:'GET'});if(current.phaseId===snap.phaseId)throw e;}
   }));
  }
  if(s.turn===2&&oldFence&&!result.checks.includes('stale turn rejects mutation')){
   await assert.rejects(()=>command(0,{kind:'ACTION',...oldFence,skillId:'warrior.slash',targetId:'boss'}),/STALE_TURN/);result.checks.push('stale turn rejects mutation');
  }
  await sleep(550);
  if(iteration===899)throw Error('UAT battle stalled');
 }
 result.events=[...allEvents.values()];assert.ok(afkPlan&&afkMath&&disconnected&&hostDropped);result.checks.push('planning AFK default; math AFK timeout');
 for(const type of ['BARRIER_CREATED','BARRIER_BROKEN','INFERNAL_CORE_SPAWNED','CORE_DESTROYED','CATACLYSM_RESOLVED','BOSS_PHASE_CHANGED','BOSS_DEFEATED','VICTORY'])assert.ok(result.events.some(e=>e.type===type),'event '+type);
 assert.equal(result.events.filter(e=>e.type==='BOSS_DEFEATED').length,1);assert.equal(errors.length,0);console.log('LIVE UAT PASS',result.checks);
 await writeFile('.uat-result.json',JSON.stringify(result,null,2));
}catch(e){console.error('LIVE UAT FAILED',e.message);if(pages[0]){console.log('FAILED DOM',(await pages[0].locator('body').innerText()).slice(0,2000));await pages[0].screenshot({path:'.uat-failure.png',fullPage:true});}result.failure=e.message;await writeFile('.uat-result.json',JSON.stringify(result,null,2));throw e;}
finally{await browser?.close();app.kill();}
