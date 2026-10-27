import {test,expect,type Page} from '@playwright/test';
import {startAuthority,publicSnapshot} from '../../src/game/multiplayer/server/authority';
import type {SafeAssignment,Intent} from '../../src/game/multiplayer/protocol';

const userId='b04c5d0e-50ba-4ad6-a1a5-4c88981ce374',roomId='00000000-0000-4000-8000-000000000001',sessionId='00000000-0000-4000-8000-000000000002',playerId='00000000-0000-4000-8000-000000000003';
async function setup(page:Page,content:Partial<SafeAssignment>={}){
 await page.addInitScript(({userId,roomId})=>{
  sessionStorage.setItem('nz.tab.v1','math-qa');sessionStorage.setItem('nz.room.v1',roomId);
  sessionStorage.setItem('nz.auth.v1.math-qa',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.'+btoa(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+3600}))+'.test',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:userId,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}}));
 },{userId,roomId});
 const now=Date.now(),members=[{id:playerId,userId,classId:'MAGE' as const,schoolLevel:'SMA' as const,nickname:'Formula QA',seat:0,lastSeen:now}];
 const state=startAuthority(sessionId,roomId,members,1,{now,members,bank:[],id:()=>crypto.randomUUID()});state.phase='MATH_CHALLENGE';state.deadline=now+25000;
 const assignment:SafeAssignment={id:'synthetic-math-layout',actorId:playerId,context:'ACTION',difficulty:'HARD',schoolLevel:'SMA',
  prompt:'Hitung $\\frac{3}{4}+2^3$. Gunakan urutan operasi.',options:['$\\frac{35}{4}$','$\\frac{11}{4}$','$\\frac{27}{4}$','$\\frac{67}{8}$'].map((text,i)=>({token:'opaque-'+i,text})),startsAt:now-1000,deadline:now+24000,performance:null,...content};
 const received:Intent[]=[];
 await page.route('**/cdn.jsdelivr.net/**',route=>route.abort());
 await page.route('**/rest/v1/rpc/nz_lobby_v1',route=>route.fulfill({json:{id:roomId,sessionId,code:'X7K4P2Q',version:'1',state:'MATH_CHALLENGE',coordinatorId:playerId,expiresAt:new Date(now+3600000).toISOString(),serverNow:new Date().toISOString(),players:members.map(m=>({...m,ready:true,status:'ACTIVE',lastSeenAt:new Date(now).toISOString()}))}}));
 await page.route('**/functions/v1/nova-combat',route=>{
  const intent=route.request().postDataJSON().intent as Intent;
  if(intent.kind==='ANSWER')received.push(intent);
  const snapshot=publicSnapshot(state,'1',Date.now(),userId,members);snapshot.assignment=assignment;
  return route.fulfill({json:snapshot});
 });
 return {assignment,received};
}

for(const width of [320,360,375,390,412,1280])test(`safe question/option TeX renders without CDN and remains usable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});const {received}=await setup(page);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/lobby');const panel=page.getByRole('dialog');await expect(panel).toBeVisible();
 await expect(panel.locator('.katex')).toHaveCount(5);await expect(panel.locator('math')).toHaveCount(5);await expect(panel.locator('.katex-error')).toHaveCount(0);
 expect(await panel.locator('.formula-prompt').innerText()).not.toContain('$');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await panel.evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
 for(const option of await panel.getByRole('button').all()){const box=await option.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);}
 await panel.getByRole('button').nth(2).click();await expect.poll(()=>received.length).toBe(1);
 const request=received[0];expect(request.kind).toBe('ANSWER');expect(Object.keys(request).sort()).toEqual(['assignmentId','kind','optionToken','phaseId','turnId','version'].sort());
 expect('optionToken' in request&&request.optionToken).toBe('opaque-2');
 expect(errors).toEqual([]);await page.screenshot({path:`.qa/question-audit/math-${width}.png`,fullPage:true});
});

test('a restored question keeps the server deadline and retries retain the same opaque assignment/token',async({page})=>{
 const {assignment,received}=await setup(page);await page.goto('/lobby');const dialog=page.getByRole('dialog');await expect(dialog.locator('.katex')).toHaveCount(5);
 const before=await dialog.getByLabel('Time remaining').innerText();await page.reload();await expect(dialog.locator('.katex')).toHaveCount(5);
 const after=await dialog.getByLabel('Time remaining').innerText();expect(parseInt(after)).toBeLessThanOrEqual(parseInt(before));
 await dialog.getByRole('button').first().dblclick();await expect.poll(()=>received.length).toBeGreaterThan(0);expect(received.every(i=>i.kind==='ANSWER'&&i.assignmentId===assignment.id&&i.optionToken==='opaque-0')).toBe(true);
});
