import{test,expect}from'@playwright/test';
test('touch movement, rotation and a missing sprite preserve a usable world',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/assets/chibi/warrior-world.webp',r=>r.abort());await page.goto('/dev/exploration');const canvas=page.locator('.world-canvas[data-ready=true]');await canvas.waitFor();
 const before=Number((await canvas.getAttribute('data-position'))?.split(',')[0]);await page.getByRole('button',{name:'Kanan',exact:true}).scrollIntoViewIfNeeded();const button=await page.getByRole('button',{name:'Kanan',exact:true}).boundingBox();const cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button!.x+button!.width/2,y:button!.y+button!.height/2}]});await page.waitForTimeout(600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);
 expect(Number((await canvas.getAttribute('data-position'))?.split(',')[0])).toBeGreaterThan(before+20);
 await page.setViewportSize({width:844,height:390});await expect(canvas).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.setViewportSize({width:390,height:844});await expect(page.getByRole('button',{name:'Kanan',exact:true})).toBeVisible();expect(errors).toEqual([]);await context.close();
});
