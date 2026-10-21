import {test,expect,type Page} from '@playwright/test';
import {startAuthority,publicSnapshot} from '../../src/game/multiplayer/server/authority';
const uid='b04c5d0e-50ba-4ad6-a1a5-4c88981ce374',roomId='00000000-0000-4000-8000-000000000001',sessionId='00000000-0000-4000-8000-000000000002';
async function fixture(page:Page,completed:boolean){
 const now=Date.now(),members=[{id:crypto.randomUUID(),userId:uid,classId:'WARRIOR' as const,nickname:'QA',seat:0,lastSeen:now}];
 const d=startAuthority(sessionId,roomId,members,1,{now,members,bank:[],id:()=>crypto.randomUUID()},completed);
 if(completed){d.phase='COMPLETED';delete d.campaign!.story;d.campaign!.completed=['shadow-hound','corrupted-shaman','abyss-guardian'];}
 const snapshot=publicSnapshot(d,'3',now,uid,members);
 const room={id:roomId,sessionId,version:'3',code:'X7K4P2Q',state:completed?'COMPLETED':'COMBAT_PLANNING',players:members.map(m=>({...m,classId:m.classId,ready:true,status:'ACTIVE'}))};
 await page.addInitScript(({uid,roomId})=>{if(!sessionStorage.getItem('fixture-initialized')){sessionStorage.setItem('fixture-initialized','1');sessionStorage.setItem('nz.room.v1',roomId);sessionStorage.setItem('nz.tab.v1','recovery');sessionStorage.setItem('nz.auth.v1.recovery',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.'+btoa(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600}))+'.test',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:uid,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}}));}},{uid,roomId});
 await page.route('**/rest/v1/rpc/nz_lobby_v1',r=>r.fulfill({json:room}));
 await page.route('**/functions/v1/nova-combat',r=>r.fulfill({json:snapshot}));
 await page.goto('/lobby');
}
test('completed expedition returns home and permits a fresh room without losing guest identity',async({page})=>{
 await fixture(page,true);await page.getByRole('heading',{name:'To be continued'}).waitFor();await page.getByRole('link',{name:'Return home'}).click();
 expect(await page.evaluate(()=>sessionStorage.getItem('nz.room.v1'))).toBeNull();
 await page.goto('/lobby');await expect(page.getByRole('button',{name:/Create expedition/})).toBeEnabled();
});
test('successful permanent leave exits the old combat and permits another expedition',async({page})=>{
 await fixture(page,false);await page.getByTestId('online-combat').waitFor();await page.getByRole('button',{name:'Leave this encounter permanently'}).click();
 await expect(page).toHaveURL(/\/$/);expect(await page.evaluate(()=>sessionStorage.getItem('nz.room.v1'))).toBeNull();
});
test('corrupt stored auth recovers to verification without a crash',async({page})=>{
 await page.addInitScript(()=>{sessionStorage.setItem('nz.tab.v1','corrupt');sessionStorage.setItem('nz.auth.v1.corrupt','{broken');});
 await page.goto('/lobby');await expect(page.getByRole('region',{name:'Verifikasi adventurer'})).toBeVisible();
});
