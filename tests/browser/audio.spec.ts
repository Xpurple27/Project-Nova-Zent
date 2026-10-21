import {test,expect} from '@playwright/test';
test('audio requires a gesture; mute and volume persist across refresh',async({page})=>{
 await page.goto('/');await page.getByText('♫ Audio settings',{exact:true}).click();await expect(page.getByRole('button',{name:'Aktifkan audio'})).toBeVisible();
 await page.getByRole('button',{name:'Aktifkan audio'}).click();await expect(page.getByRole('button',{name:'Mute',exact:true})).toBeVisible();
 const master=page.getByRole('slider',{name:'Master volume'});await master.focus();await master.press('Home');for(let i=0;i<4;i++)await master.press('ArrowRight');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('nz.audio.v1')!).master)).toBeCloseTo(.2);
 await page.getByRole('button',{name:'Mute',exact:true}).click();await page.reload();await page.getByText('♫ Audio settings',{exact:true}).click();await expect(page.getByRole('button',{name:'Aktifkan audio'})).toBeVisible();expect(await master.inputValue()).toBe('0.2');
});
test('blocked AudioContext resume produces a useful retry status without crashing',async({page})=>{
 await page.addInitScript(()=>{AudioContext.prototype.resume=()=>Promise.reject(new Error('autoplay blocked'));});await page.goto('/');await page.getByText('♫ Audio settings',{exact:true}).click();await page.getByRole('button',{name:'Aktifkan audio'}).click();await expect(page.getByText('Audio belum tersedia. Ketuk untuk mencoba kembali.')).toBeVisible();
});
