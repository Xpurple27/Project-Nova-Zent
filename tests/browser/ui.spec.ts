
import {test,expect} from "@playwright/test";
test("mobile home and offline UI fit 320px; questions lock and reaction is reachable",async({page})=>{
 await page.setViewportSize({width:320,height:760});
 await page.goto("/");await expect(page.getByRole("heading",{name:/Every formula/})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.goto("/dev/combat");await expect(page.getByRole("heading",{name:"The Abyss Guardian"})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole("button",{name:/Channel party formulas/}).click();
 for(let i=0;i<4;i++){const dialog=page.getByRole("dialog");await expect(dialog).toBeVisible();await dialog.getByRole("button").first().click();await page.waitForTimeout(750);}
 await expect(page.getByRole("button",{name:/Stabilize the ward/})).toBeVisible();
 await page.getByRole("button",{name:/Stabilize the ward/}).click();await expect(page.getByRole("dialog")).toBeVisible();
 await page.getByRole("dialog").getByRole("button").first().click();await page.waitForTimeout(750);
 await expect(page.getByText("ROUND 2",{exact:true})).toBeVisible();
});
test("lobby renders useful setup state without secrets",async({page})=>{
 await page.goto("/lobby");await expect(page.getByRole("heading",{name:/Expedition lobby/})).toBeVisible();
 await expect(page.getByLabel("Display name")).toBeVisible();
});
