import {test,expect} from '@playwright/test';
test('Phaser mounts, moves, interacts and disposes on scene/route changes',async({page})=>{
 await page.setViewportSize({width:375,height:760});await page.goto('/dev/exploration');const canvas=page.locator('.world-canvas');await expect(canvas).toHaveAttribute('data-ready','true');await expect(page.locator('canvas')).toHaveCount(1);
 const before=await canvas.getAttribute('data-position');await page.keyboard.down('ArrowRight');await page.waitForTimeout(550);await page.keyboard.up('ArrowRight');await expect(canvas).not.toHaveAttribute('data-position',before!);
 await page.getByRole('button',{name:'Baca petunjuk'}).click();await expect(page.getByRole('status')).toContainText('Delapan Segel');
 await page.getByLabel('Scene',{exact:true}).selectOption('ANCIENT_RUINS');await expect(page.getByRole('region',{name:'Ancient Ruins'})).toBeVisible();await expect(page.locator('.world-controls .interact')).toBeDisabled();await expect(page.locator('canvas')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.goto('/');await expect(page.locator('canvas')).toHaveCount(0);
});

test('two local QA tabs render each other using the same motion contract',async({context})=>{
 const a=await context.newPage(),b=await context.newPage();await a.goto('/dev/exploration');await b.goto('/dev/exploration');
 await expect(a.locator('.world-canvas')).toHaveAttribute('data-ready','true');await expect(b.locator('.world-canvas')).toHaveAttribute('data-ready','true');
 await expect(a.locator('.world-canvas')).toHaveAttribute('data-remote-count','1');await expect(b.locator('.world-canvas')).toHaveAttribute('data-remote-count','1');
 await a.close();await b.close();
});

test('opening dialogue locks controls and QA skip returns a safe unlocked map',async({page})=>{
 await page.goto('/dev/exploration');await page.getByLabel('Preview cutscene').selectOption('opening');await expect(page.getByRole('region',{name:'Dialogue'})).toBeVisible();await expect(page.getByRole('button',{name:'Kanan',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Skip 0/1'}).click();await expect(page.getByRole('button',{name:'Kanan',exact:true})).toBeEnabled();
});
test('reduced-motion sprite path and persistent Heavy/Core telegraphs remain readable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/dev/combat');await expect(page.getByRole('img',{name:/GUARDIAN/})).toBeVisible();await expect(page.locator('[data-raster=GUARDIAN]')).toHaveAttribute('data-motion-static','true');const pose=await page.locator('[data-raster=GUARDIAN]').getAttribute('data-frame');await page.waitForTimeout(300);await expect(page.locator('[data-raster=GUARDIAN]')).toHaveAttribute('data-frame',pose!);
});
test('VFX does not replay duplicate events; Barrier and Core remain visible',async({page})=>{
 await page.goto('/dev/presentation');await page.getByRole('button',{name:'Play next effect'}).click();await expect(page.getByTestId('combat-vfx')).toBeVisible();await page.waitForTimeout(1250);await expect(page.getByTestId('combat-vfx')).toHaveCount(0);await page.getByRole('button',{name:'Replay duplicate event'}).click();await expect(page.getByTestId('combat-vfx')).toHaveCount(0);await expect(page.getByText(/ABYSS BARRIER/)).toBeVisible();await expect(page.getByRole('button',{name:/INFERNAL CORE/})).toBeVisible();await expect(page.getByText('INFERNAL CATACLYSM INCOMING')).toBeVisible();
});
test('boss entrance preview reaches its title without a video asset',async({page})=>{
 await page.goto('/dev/exploration');await page.getByLabel('Preview cutscene').selectOption('boss-entrance');await expect(page.getByRole('button',{name:'Kanan',exact:true})).toBeDisabled();await expect(page.getByText('ABYSS GUARDIAN',{exact:true})).toBeVisible({timeout:11000});await page.getByRole('button',{name:'Skip 0/1'}).click();await expect(page.getByRole('button',{name:'Kanan',exact:true})).toBeEnabled();
});
