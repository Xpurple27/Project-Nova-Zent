/** Original code-native scenery; decorative geometry never adds collision or progression. */
import * as Phaser from 'phaser';
import type {WorldMap,SceneId} from './model';
import type {StoryId} from '../story/definitions';
import {cinematicFrame} from '../story/presentation';
export const SCENE_IDENTITY:Record<SceneId,{landmark:string;accent:number;dark:number}>={
 VILLAGE:{landmark:'Obelisk of Eight Seals',accent:0xb7d9d3,dark:0x293c44},
 FOREST_PATH:{landmark:'Fractured Root Meridian',accent:0x80c6b1,dark:0x183932},
 RUINS_PATH:{landmark:'Corrupted Formula Aqueduct',accent:0xb3a0d4,dark:0x282b3d},
 ANCIENT_RUINS:{landmark:'Octagonal Zenith Gate',accent:0xd1be8e,dark:0x282a40},
 BOSS_CHAMBER:{landmark:'The Broken Seal Engine',accent:0xd38a94,dark:0x201b30}
};
function seal(g:Phaser.GameObjects.Graphics,x:number,y:number,r:number,color:number,alpha=.5){
 g.lineStyle(2,color,alpha);g.strokeEllipse(x,y,r*2,r);g.strokeEllipse(x,y,r*1.55,r*.78);
 const points=Array.from({length:9},(_,i)=>new Phaser.Math.Vector2(x+Math.cos(i*Math.PI/4)*r,y+Math.sin(i*Math.PI/4)*r*.5));g.strokePoints(points);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;g.fillStyle(color,alpha);g.fillCircle(x+Math.cos(a)*r,y+Math.sin(a)*r*.5,3);}
}
export function createScenery(scene:Phaser.Scene,map:WorldMap){
 const identity=SCENE_IDENTITY[map.id],g=scene.add.graphics().setDepth(-20);
 g.fillStyle(identity.dark);g.fillRect(0,0,map.width,map.height);
 // Quiet repeating ground facets, then a readable eastward route.
 for(let x=0;x<map.width;x+=64)for(let y=0;y<map.height;y+=64){g.lineStyle(1,identity.accent,.025);g.strokeTriangle(x,y+32,x+32,y,x+64,y+32);}
 g.fillStyle(0x060c19,.22);g.fillEllipse(580,420,1110,255);g.fillStyle(0x8a8069,.17);g.fillRoundedRect(45,334,1060,105,40);
 g.lineStyle(1,identity.accent,.22);g.lineBetween(70,345,1080,345);g.lineBetween(70,425,1080,425);
 for(let x=110;x<1070;x+=80){g.lineStyle(2,identity.accent,.25);g.strokeTriangle(x,379,x+13,385,x,391);g.lineBetween(x-22,377,x-22,393);}
 for(const r of map.obstacles){
  const cx=r.x+r.width/2;g.fillStyle(0x040a13,.4);g.fillEllipse(cx,r.y+r.height,r.width+30,30);
  if(r.kind==='HOUSE'){
   g.fillStyle(0x43505c);g.fillRoundedRect(r.x,r.y,r.width,r.height,5);g.lineStyle(3,0xc6b186,.4);g.strokeRect(r.x+6,r.y+8,r.width-12,r.height-12);
   g.fillStyle(0x293347);g.fillTriangle(r.x-12,r.y+12,cx,r.y-65,r.x+r.width+12,r.y+12);g.lineStyle(3,0x8ea1af,.7);g.lineBetween(r.x-12,r.y+12,cx,r.y-65);g.lineBetween(cx,r.y-65,r.x+r.width+12,r.y+12);
   g.fillStyle(0xd4b47d,.9);g.fillCircle(cx,r.y+60,18);g.lineStyle(4,0x253242);g.strokeTriangle(cx,r.y+42,cx+16,r.y+68,cx-16,r.y+68);g.fillStyle(0x182433);g.fillRect(r.x+18,r.y+80,25,50);
   g.lineStyle(2,identity.accent,.6);g.lineBetween(cx,r.y-30,cx,r.y-8);g.strokeCircle(cx,r.y-18,12);
  }else if(r.kind==='TREE'){
   g.fillStyle(0x454146);g.fillRect(cx-7,r.y+18,14,r.height-20);g.lineStyle(4,0x383846);g.lineBetween(cx,r.y+45,r.x+8,r.y+20);g.lineBetween(cx,r.y+40,r.x+r.width-5,r.y+5);
   g.fillStyle(map.id==='RUINS_PATH'?0x384052:0x244d47);g.fillTriangle(r.x-18,r.y+45,cx,r.y-55,r.x+r.width+18,r.y+45);g.fillTriangle(r.x-8,r.y+12,cx,r.y-75,r.x+r.width+8,r.y+12);
   g.lineStyle(2,identity.accent,.4);g.lineBetween(cx,r.y-35,cx,r.y+60);g.lineBetween(cx,r.y+5,cx+20,r.y-10);
  }else{
   g.fillStyle(0x424052);g.fillRect(r.x,r.y,r.width,r.height);g.fillStyle(0x656172);g.fillTriangle(r.x-8,r.y,r.x+r.width/2,r.y-30,r.x+r.width+8,r.y);g.lineStyle(2,identity.accent,.5);g.strokeRect(r.x+9,r.y+12,r.width-18,r.height-24);
   for(let y=r.y+27;y<r.y+r.height-10;y+=30){g.strokeTriangle(cx,y-8,cx+11,y+10,cx-11,y+10);g.lineBetween(cx-15,y+16,cx+15,y+16);}
  }
 }
 const focal=scene.add.graphics().setDepth(-10);
 if(map.id==='VILLAGE'){
  seal(g,560,300,150,identity.accent,.38);focal.fillStyle(0x1c2538);focal.fillTriangle(530,308,560,130,590,308);focal.lineStyle(3,0xa4c4d4,.7);focal.strokeTriangle(530,308,560,130,590,308);focal.lineStyle(3,0x9ce3e1,.9);focal.lineBetween(560,160,548,235);focal.lineBetween(548,235,572,262);focal.lineBetween(572,262,560,300);focal.fillStyle(0xb9f3e3);focal.fillCircle(560,193,5);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=560+Math.cos(a)*130,y=280+Math.sin(a)*65;focal.lineStyle(2,identity.accent,.65);focal.strokeRect(x-5,y-9,10,18);}
 }else if(map.id==='FOREST_PATH'||map.id==='RUINS_PATH'){
  seal(g,600,268,110,identity.accent,.4);focal.fillStyle(0x414353);focal.fillTriangle(560,285,596,192,634,285);focal.lineStyle(3,0xc58aab,.65);focal.lineBetween(596,215,583,245);focal.lineBetween(583,245,612,275);
  for(let i=0;i<7;i++){const x=640+i*52,y=300+Math.sin(i*1.3)*17;g.lineStyle(2,0xaf7594,.3);g.strokeTriangle(x,y,x+12,y+16,x-5,y+23);}
  if(map.id==='RUINS_PATH'){g.lineStyle(8,0x6a6075,.6);g.strokeEllipse(650,240,500,170);g.lineStyle(2,0x9c80ba,.6);g.strokeEllipse(650,240,470,145);}
 }else{
  seal(g,820,390,map.id==='BOSS_CHAMBER'?230:185,identity.accent,.42);
  // Concentric mathematical gateway: central opening is kept clear for the existing exit.
  for(let i=0;i<3;i++){focal.lineStyle(8-i*2,identity.accent,.45-i*.1);focal.strokePoints(Array.from({length:9},(_,j)=>new Phaser.Math.Vector2(990+Math.cos(j*Math.PI/4)*(100+i*20),345+Math.sin(j*Math.PI/4)*(175+i*20))));}
  focal.fillStyle(0x080e20,.6);focal.fillEllipse(990,350,135,260);focal.lineStyle(2,identity.accent,.5);focal.strokeTriangle(990,260,1030,330,950,330);
  if(map.id==='BOSS_CHAMBER'){g.lineStyle(3,0xc6677f,.45);for(let i=0;i<8;i++){const a=i*Math.PI/4;g.lineBetween(820+Math.cos(a)*35,390+Math.sin(a)*18,820+Math.cos(a)*230,390+Math.sin(a)*110);}g.fillStyle(0x0c0c20,.4);g.fillEllipse(820,335,400,110);}
 }
 const cracks=scene.add.graphics().setDepth(2);cracks.lineStyle(4,0xe46c92,.9);cracks.lineBetween(560,195,545,265);cracks.lineBetween(545,265,588,308);cracks.lineBetween(588,308,675,340);cracks.lineBetween(588,308,475,355);cracks.lineStyle(15,0xb54b82,.12);cracks.lineBetween(560,195,675,340);cracks.setAlpha(0);
 const keeper=scene.add.container(575,350).setDepth(350),npc=scene.add.graphics();npc.fillStyle(0xdbc29e);npc.fillCircle(0,-37,7);npc.fillStyle(0x9984b6);npc.fillTriangle(-15,0,0,-32,15,0);npc.lineStyle(2,0xe1d29b);npc.strokeTriangle(-15,0,0,-32,15,0);keeper.add(npc);keeper.setVisible(map.id==='VILLAGE');
 const tether=scene.add.graphics().setDepth(351);tether.lineStyle(2,0xe88ba4,.8);tether.strokeCircle(0,-20,24);tether.strokeTriangle(0,-50,20,-10,-20,-10);keeper.add(tether);tether.setAlpha(0);
 const remnant=scene.add.graphics().setDepth(349);seal(remnant,575,350,36,0xf1d394,.8);remnant.setVisible(false);
 const echoes=scene.add.graphics().setDepth(340);for(let i=0;i<7;i++){const angle=i*Math.PI*2/7;seal(echoes,820+Math.cos(angle)*120,310+Math.sin(angle)*60,12,0xe0cba2,.85);}echoes.setVisible(false);
 const banner=scene.add.text(560,80,identity.landmark.toUpperCase(),{fontSize:'14px',color:'#cbbf9f',letterSpacing:3}).setOrigin(.5).setDepth(-1);
 return {update(story?:{id:StoryId;elapsed:number}){
  echoes.setVisible(story?.id==='ending'&&story.elapsed>=2500);
  if(!story){keeper.setVisible(false);keeper.setPosition(575,350);remnant.setVisible(map.id==='VILLAGE');tether.setAlpha(0);cracks.setAlpha(map.id==='VILLAGE'?.35:0);banner.setAlpha(.8);return;}
  const frame=cinematicFrame(story.id,story.elapsed);banner.setAlpha(.3);cracks.setAlpha(frame.corruption);keeper.setVisible(story.id==='opening'&&frame.abduction<1);keeper.setPosition(575+frame.abduction*390,350-frame.abduction*80);tether.setAlpha(frame.abduction>0?1:0);remnant.setVisible(story.id==='opening'&&frame.abduction>=1||story.id==='ending');
 },identity};
}
