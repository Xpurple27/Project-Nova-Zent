import {test,expect} from '@playwright/test';
for(const width of [320,360,375,390,412,1280])test(`core screens and long formula are usable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});
 for(const path of ['/','/lobby','/dev/exploration','/dev/combat','/dev/presentation']){
  await page.goto(path);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path).toBe(true);
 }
 await page.getByRole('button',{name:'Preview long formula'}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);for(const option of await dialog.getByRole('button').all()){const box=await option.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);}
 await dialog.getByRole('button').nth(1).click();await expect(dialog).toHaveCount(0);
});
