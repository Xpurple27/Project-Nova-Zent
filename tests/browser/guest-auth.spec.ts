import {test,expect,type Page} from "@playwright/test";

// Test doubles exist only in the browser test process, never in application code.
async function mockCaptcha(page:Page){
 await page.addInitScript(()=>{
  let token="",callbacks:Record<string,()=>void>={};
  const api={
   render:(element:HTMLElement,options:Record<string,()=>void>)=>{
    callbacks=options;element.textContent="hCaptcha test widget";
    element.style.width="164px";element.style.height="144px";return "test-widget";
   },
   reset:()=>{token="";},remove:()=>{},getResponse:()=>token,getRespKey:()=>"test-key"
  };
  Object.assign(window,{hcaptcha:api});
  window.addEventListener("test-captcha",event=>{
   const detail=(event as CustomEvent<{kind:string;token:string}>).detail;
   token=detail.token;callbacks[detail.kind]?.();
  });
 });
}
async function captcha(page:Page,kind="callback",token="test-token"){
 await page.evaluate(({kind,token})=>window.dispatchEvent(new CustomEvent("test-captcha",{detail:{kind,token}})),{kind,token});
}
const user={id:"b04c5d0e-50ba-4ad6-a1a5-4c88981ce374",aud:"authenticated",role:"authenticated",is_anonymous:true,app_metadata:{},user_metadata:{},created_at:"2026-10-21T00:00:00Z"};
function session(){
 const payload=Buffer.from(JSON.stringify({sub:user.id,role:"authenticated",exp:Math.floor(Date.now()/1000)+3600})).toString("base64url");
 return {access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:"test-refresh",token_type:"bearer",expires_in:3600,user};
}

test("new guest sends one verified token; refresh restores identity without another captcha",async({page})=>{
 await mockCaptcha(page);let signups=0;
 await page.route("**/auth/v1/signup",async route=>{
  signups++;expect(route.request().postDataJSON().gotrue_meta_security.captcha_token).toBe("fresh-token");
  await new Promise(resolve=>setTimeout(resolve,150));
  await route.fulfill({json:session()});
 });
 await page.route("**/auth/v1/user",route=>route.fulfill({json:user}));
 await page.setViewportSize({width:320,height:760});await page.goto("/lobby");
 await expect(page.getByText("hCaptcha test widget")).toBeVisible();
 const login=page.getByRole("button",{name:"Lanjutkan sebagai guest"});
 await expect(login).toBeDisabled();expect(signups).toBe(0);
 await expect(page.getByRole("button",{name:/Create expedition/})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await captcha(page,"callback","fresh-token");await expect(login).toBeEnabled();
 // Two DOM clicks in one task exercise the synchronous in-flight guard.
 await login.evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
 await expect(page.getByRole("button",{name:/Create expedition/})).toBeEnabled();
 expect(signups).toBe(1);
 await page.reload();await expect(page.getByRole("button",{name:/Create expedition/})).toBeEnabled();
 await expect(page.getByText("hCaptcha test widget")).toHaveCount(0);expect(signups).toBe(1);
 expect(await page.evaluate(()=>Object.values(sessionStorage).some(value=>value.includes("fresh-token")))).toBe(false);
});

test("expiry and widget failure invalidate token and allow re-verification",async({page})=>{
 await mockCaptcha(page);await page.goto("/lobby");await expect(page.getByText("hCaptcha test widget")).toBeVisible();
 const login=page.getByRole("button",{name:"Lanjutkan sebagai guest"});
 await captcha(page);await expect(login).toBeEnabled();
 await captcha(page,"expired-callback");await expect(login).toBeDisabled();
 await expect(page.getByRole("region",{name:"Verifikasi adventurer"}).getByRole("alert")).toContainText("kedaluwarsa");
 await captcha(page);await captcha(page,"error-callback");await expect(login).toBeDisabled();
 await expect(page.getByRole("region",{name:"Verifikasi adventurer"}).getByRole("alert")).toContainText("Periksa koneksi");
 await page.getByRole("button",{name:"Muat ulang hCaptcha"}).click();
 await captcha(page);await expect(login).toBeEnabled();
});

test("rejected Auth consumes token and retry requires a fresh verification",async({page})=>{
 await mockCaptcha(page);let signups=0;
 await page.route("**/auth/v1/signup",route=>{
  signups++;
  if(signups===1)return route.fulfill({status:400,headers:{"x-supabase-api-version":"2024-01-01","access-control-expose-headers":"x-supabase-api-version"},json:{code:"captcha_failed",msg:"captcha verification failed"}});
  expect(route.request().postDataJSON().gotrue_meta_security.captcha_token).toBe("replacement-token");
  return route.fulfill({json:session()});
 });
 await page.goto("/lobby");await expect(page.getByText("hCaptcha test widget")).toBeVisible();
 const login=page.getByRole("button",{name:"Lanjutkan sebagai guest"});
 await captcha(page);await login.click();
 await expect(page.getByRole("region",{name:"Verifikasi adventurer"}).getByRole("alert")).toContainText("verifikasi ulang");await expect(login).toBeDisabled();
 expect(signups).toBe(1);
 await captcha(page,"callback","replacement-token");await login.click();
 await expect(page.getByRole("button",{name:/Create expedition/})).toBeEnabled();expect(signups).toBe(2);
});

test('stalled hCaptcha SDK offers a bounded retry instead of waiting forever',async({page})=>{
 await page.addInitScript(()=>{const original=window.setTimeout.bind(window);window.setTimeout=((handler:TimerHandler,delay?:number,...args:unknown[])=>original(handler,delay===15000?100:delay,...args)) as typeof window.setTimeout;});
 await page.route('**://js.hcaptcha.com/**',r=>r.fulfill({contentType:'application/javascript',body:'/* SDK never calls its ready callback */'}));
 await page.goto('/lobby');const region=page.getByRole('region',{name:'Verifikasi adventurer'});await expect(region.getByRole('alert')).toContainText('belum selesai dimuat');await expect(region.getByRole('button',{name:'Muat ulang halaman',exact:true})).toBeVisible();await expect(region.getByRole('button',{name:'Lanjutkan sebagai guest'})).toBeDisabled();
});

test('revoked refresh token offers verification and discards the stale room pointer',async({page})=>{
 const stored={...session(),expires_at:1};
 await page.addInitScript(stored=>{sessionStorage.setItem('nz.tab.v1','expired');sessionStorage.setItem('nz.auth.v1.expired',JSON.stringify(stored));sessionStorage.setItem('nz.room.v1','00000000-0000-4000-8000-000000000001');},stored);
 await page.route('**/auth/v1/token?grant_type=refresh_token',r=>r.fulfill({status:400,headers:{'x-supabase-api-version':'2024-01-01'},json:{code:'refresh_token_not_found',msg:'Invalid Refresh Token'}}));
 await page.goto('/lobby');await expect(page.getByRole('region',{name:'Verifikasi adventurer'})).toBeVisible();expect(await page.evaluate(()=>sessionStorage.getItem('nz.room.v1'))).toBeNull();
});
