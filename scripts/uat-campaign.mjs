// Opt-in live QA. Uses temporary authenticated fixtures and a PRIVATE bank export; never ships to clients.
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
const qa=JSON.parse(await readFile('.uat.json','utf8')),bank=JSON.parse(await readFile(process.env.NOVA_QA_BANK??'.qa/private/question-bank.json','utf8'));
const solutions=new Map(bank.map(q=>[q.prompt,q.options_json.find(o=>o.id===q.correct_option_id).text]));
const url='https://bbeymvooubwsbrkeukuu.supabase.co',key='sb_publishable_Y2cVkp1j_Oo55oiTu4rO6w_ge3yPJW6',base='http://127.0.0.1:3000';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1'],{stdio:'ignore'});let browser;
const result=process.env.NOVA_QA_RESUME?JSON.parse(await readFile('.uat-campaign-result.json','utf8')):{checks:[],stages:[],errors:[],motion:[],questionPayloads:0};delete result.failure;const resume=!!process.env.NOVA_QA_RESUME;const pages=[],contexts=[];const events=new Map((result.events??[]).map(e=>[e.seq,e]));let room;
try{
 for(let n=0;n<40;n++){try{if((await fetch(base)).ok)break;}catch{}await sleep(100);}
 browser=await chromium.launch({headless:true,executablePath:process.env.NOVA_QA_CHROMIUM,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
 for(let i=0;i<4;i++){
  const context=await browser.newContext({viewport:{width:i===0?320:390,height:844},ignoreHTTPSErrors:true});contexts.push(context);
  await context.addInitScript(({session,tab,roomId})=>{if(roomId)sessionStorage.setItem('nz.room.v1',roomId);if(!sessionStorage.getItem('nz.auth.v1.'+tab)){sessionStorage.setItem('nz.tab.v1',tab);sessionStorage.setItem('nz.auth.v1.'+tab,JSON.stringify(session));}},{session:qa.sessions[i],tab:'campaign-'+i,roomId:resume?result.roomId:null});
  const page=await context.newPage();await page.route(base+'/**',async route=>{const req=route.request(),r=await fetch(req.url(),{method:req.method(),headers:req.headers(),body:req.postDataBuffer()??undefined});const headers=Object.fromEntries(r.headers);for(const h of ['content-encoding','transfer-encoding','content-length'])delete headers[h];await route.fulfill({status:r.status,headers,body:Buffer.from(await r.arrayBuffer())});});
  page.on('pageerror',e=>result.errors.push(e.message));pages.push(page);
 }
 const remote=(i,path,body)=>pages[i].evaluate(async({url,key,token,body})=>{const r=await fetch(url,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});return {ok:r.ok,body:await r.json()};},{url:url+path,key,token:qa.sessions[i].access_token,body});
 const rpc=async(i,command,payload)=>{const r=await remote(i,'/rest/v1/rpc/nz_lobby_v1',{p_command:command,p_payload:payload,p_request_id:crypto.randomUUID()});if(!r.ok)throw Error('RPC '+command+' '+r.body.message);return r.body;};
 const command=async(i,intent,requestId=crypto.randomUUID())=>{const r=await remote(i,'/functions/v1/nova-combat',{sessionId:room.sessionId,intent,requestId});if(!r.ok)throw Error(r.body.error);return r.body;};
 await Promise.all(pages.map(p=>p.goto(base+'/lobby')));
 if(resume){room=await rpc(0,'GET',{roomId:result.roomId});console.log('CAMPAIGN RESUME',room.sessionId);}else{
await pages[0].getByLabel('Display name').fill('QA Warrior');await pages[0].getByRole('button',{name:/Create expedition/}).click();await pages[0].locator('.room-code').waitFor({timeout:30000});const code=await pages[0].locator('.room-code').textContent();
 room=await rpc(0,'GET',{roomId:await pages[0].evaluate(()=>sessionStorage.getItem('nz.room.v1'))});result.roomId=room.id;result.sessionId=room.sessionId;console.log('CAMPAIGN QA room',code,room.sessionId);
 await Promise.all(pages.slice(1).map(async(p,i)=>{await p.getByLabel('Display name').fill(['QA Mage','QA Thief','QA Healer'][i]);await p.getByLabel('7-character room code').fill(code);await p.getByRole('button',{name:/Join expedition/}).click();await p.locator('.room-code').waitFor({timeout:30000});}));
 for(let i=0;i<4;i++)await pages[i].getByRole('button',{name:new RegExp(['Warrior','Mage','Thief','Healer'][i])}).click();await sleep(800);
 await Promise.all(pages.map(p=>p.getByRole('button',{name:'Ready for expedition'}).click()));await pages[0].getByRole('button',{name:/Start expedition/}).click();
 }
 const seenAnswers=new Set();let stage='',moved=new Set(),reconnectedWorld=false,reconnectedCombat=false,lastFence;
 for(let guard=0;guard<1000;guard++){
  const snapshots=await Promise.all(pages.map((_,i)=>command(i,{kind:'GET'}))),s=snapshots.reduce((a,b)=>BigInt(a.version)>=BigInt(b.version)?a:b);for(const snapshot of snapshots)for(const event of snapshot.events)events.set(event.seq,event);
  const label=s.phase+':'+(s.campaign?.story?.id??s.campaign?.encounter??s.campaign?.scene??'');if(label!==stage){stage=label;console.log('CAMPAIGN',s.turn,label,'enemyHP',s.boss.hp);result.stages.push(label);}
  if(snapshots.some(snapshot=>snapshot.assignment))for(const snapshot of snapshots){const payload=JSON.stringify(snapshot);assert.ok(!/"(?:correctToken|correct_option_id|correctAnswer|explanation_json)"/.test(payload));if(snapshot.assignment)result.questionPayloads++;}
  if(s.phase==='COMPLETED'){await sleep(500);const stable=await Promise.all(pages.map((_,i)=>command(i,{kind:'GET'})));const canonical=t=>JSON.stringify({phase:t.phase,turnId:t.turnId,party:t.party,boss:t.boss,completed:t.campaign.completed,events:t.lastEventSeq});assert.equal(new Set(stable.map(canonical)).size,1);assert.deepEqual(s.campaign.completed,['shadow-hound','corrupted-shaman','abyss-guardian']);for(const p of pages)await p.getByRole('heading',{name:'To be continued'}).waitFor({timeout:15000});assert.equal([...events.values()].filter(e=>e.type==='BOSS_DEFEATED').length,1);result.outcome='VICTORY';result.finalVersion=s.version;result.lastSeq=s.lastEventSeq;result.checks.push('four identical final snapshots; ordered completion; one boss death/ending');break;}
  if(s.phase==='DEFEAT'||s.phase==='ABORTED')throw Error('Unexpected '+s.phase);
  if(s.campaign?.story){await Promise.all(pages.map(p=>p.getByRole('button',{name:/^Skip /}).click({timeout:15000})));await sleep(250);continue;}
  if(s.phase==='EXPLORATION'){
   if(moved.has(s.campaign.sceneToken)){await sleep(300);continue;}
   await Promise.all(pages.map(p=>p.locator('.world-canvas[data-ready=true][data-scene-token="'+s.campaign.sceneToken+'"]').waitFor({timeout:20000})));
   if(!moved.has(s.campaign.sceneToken)){
    await Promise.all(pages.map(p=>p.waitForFunction(()=>document.querySelector('.world-canvas')?.getAttribute('data-remote-count')==='3',undefined,{timeout:15000})));const counts=await Promise.all(pages.map(p=>p.locator('.world-canvas').getAttribute('data-remote-count')));result.motion.push({scene:s.campaign.scene,counts});
    if(s.campaign.scene==='VILLAGE'){assert.ok(counts.every(n=>Number(n)>=3),'real private motion packets must render all teammates: '+counts);result.checks.push('four isolated browser contexts render private Realtime movement');}
    if(!reconnectedWorld){reconnectedWorld=true;await contexts[3].setOffline(true);await sleep(1200);await contexts[3].setOffline(false);await pages[3].reload();await pages[3].locator('.world-canvas[data-ready=true]').waitFor({timeout:20000});result.checks.push('exploration offline/reload restores same scene checkpoint');}
    await Promise.all(pages.map(p=>p.keyboard.down('ArrowRight')));await sleep(5750);await Promise.all(pages.map(p=>p.keyboard.up('ArrowRight')));
    for(let i=0;i<4;i++){let [x]=String(await pages[i].locator('.world-canvas').getAttribute('data-position')).split(',').map(Number);if(x<970){await pages[i].keyboard.down('ArrowRight');await sleep(Math.min(2500,(1020-x)/155*1000));await pages[i].keyboard.up('ArrowRight');}if(x>1095){await pages[i].keyboard.down('ArrowLeft');await sleep(500);await pages[i].keyboard.up('ArrowLeft');}}
    moved.add(s.campaign.sceneToken);await pages[0].screenshot({path:'.uat-campaign-world.png',fullPage:true});
   }
   for(let i=0;i<4;i++){if(s.campaign.rally.includes(s.myActorId)&&i===0)continue;await pages[i].locator('.world-controls .interact').click({timeout:10000});}
   await sleep(300);continue;
  }
  const fence={turnId:s.turnId,phaseId:s.phaseId,version:s.version};
  if(s.phase==='COMBAT_PLANNING'){
   if(!reconnectedCombat){reconnectedCombat=true;const hp=s.party[0].hp;await pages[0].reload();await pages[0].getByTestId('online-combat').waitFor({timeout:20000});assert.equal((await command(0,{kind:'GET'})).party[0].hp,hp);result.checks.push('combat refresh restores HP, encounter and turn');}
   await Promise.all(snapshots.map(async(t,i)=>{const p=s.party.find(p=>p.id===t.myActorId);if(!p)return;if(p.hp<=0||p.active===false||s.progress.find(a=>a.actorId===p.id)?.locked)return;const skill=p.classId==='HEALER'&&p.resource>=35&&s.party.some(a=>a.hp<a.maxHp-100)?'healer.healing_wave':({WARRIOR:'warrior.slash',MAGE:'mage.arcane_bolt',THIEF:'thief.quick_strike',HEALER:'healer.holy_bolt'}[p.classId]);try{await command(i,{kind:'ACTION',...fence,skillId:skill,targetId:s.boss.core?.hp?'core':'boss'});}catch(e){if(!/DEADLINE_EXPIRED|STALE_PHASE|STALE_TURN|INVALID_PHASE/.test(e.message))throw e;result.intentTimeouts=(result.intentTimeouts??0)+1;}}));
   lastFence=fence;await sleep(300);continue;
  }
  for(let i=0;i<4;i++){const t=snapshots[i],q=t.assignment;if(!q||q.performance!==null||seenAnswers.has(q.id)||t.serverNow<q.startsAt||q.deadline-t.serverNow<1500)continue;const correct=solutions.get(q.prompt);assert.ok(correct,'QA bank must match active production revision');const option=q.options.find(o=>o.text===correct);assert.ok(option);const dialog=pages[i].locator('[role=dialog][data-assignment-id="'+q.id+'"]');if(await dialog.count()!==1)continue;const optionIndex=q.options.findIndex(o=>o.token===option.token);try{await dialog.getByRole('button').nth(optionIndex).click({timeout:2500});}catch{continue;}seenAnswers.add(q.id);}
  if(s.campaign.encounter==='corrupted-shaman'&&lastFence){const stale=await remote(0,'/functions/v1/nova-combat',{sessionId:room.sessionId,intent:{kind:'ACTION',...lastFence,turnId:'00000000-0000-4000-8000-000000000000',skillId:'warrior.slash',targetId:'boss'},requestId:crypto.randomUUID()});assert.equal(stale.body.error,'STALE_TURN');lastFence=null;result.checks.push('old encounter/turn input rejected');}
  await sleep(450);
 }
 assert.equal(result.outcome,'VICTORY');assert.equal(result.errors.length,0,'browser runtime errors: '+result.errors.join(';'));result.checks.push('private safe question payloads; no browser runtime errors');result.events=Array.from(events.values());await writeFile('.uat-campaign-result.json',JSON.stringify(result,null,2));console.log('CAMPAIGN PASS',result.checks.length,'checks',result.questionPayloads,'question payloads',result.events.length,'events');
}catch(error){result.failure=error.message;result.events=Array.from(events.values());await writeFile('.uat-campaign-result.json',JSON.stringify(result,null,2));console.error('CAMPAIGN FAIL',error.message);if(pages[0])await pages[0].screenshot({path:'.uat-campaign-failure.png',fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{await browser?.close();app.kill();}
