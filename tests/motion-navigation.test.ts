import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REST,MOTIONS,poseAt,motionDuration} from '../src/game/animation/motion';
import {rigSvg,shardTransform} from '../src/game/animation/rig';
import {SPRITES,GUARDIAN_STORY,type ActorKind} from '../src/game/animation/manifest';
import {AnimationController,SKILL_ANIMATIONS,animationFor} from '../src/game/animation/controller';
import {MAPS,move} from '../src/game/exploration/model';
import {routeTo,clearSegment,walkable,bearing} from '../src/game/exploration/navigation';

test('walk is a continuous opposed-limb gait with knee flexion, not an image translation',()=>{
 const a=poseAt('walkE',180),b=poseAt('walkE',540);
 assert.equal(a.legL,-a.legR);assert.equal(b.legL,-b.legR);assert.ok(a.legL*b.legL<0);assert.ok(a.kneeR>20&&b.kneeL>20);
 assert.ok(a.armR>b.armR);assert.equal(a.x,0);assert.ok(Math.abs(a.y)<2);
 const first=poseAt('walk',0),loop=poseAt('walk',720);for(const k of Object.keys(REST) as (keyof typeof REST)[])assert.ok(Math.abs(first[k]-loop[k])<.00001);
 assert.deepEqual(poseAt('walk',180,true),REST);
});
test('all sixteen skills have distinct finite joint poses and bounded authored timelines',()=>{
 const states=Object.values(SKILL_ANIMATIONS);assert.equal(states.length,16);assert.equal(new Set(states).size,16);
 for(const state of states){assert.ok(MOTIONS[state]);assert.ok(motionDuration(state)>=700&&motionDuration(state)<=1500);
  assert.notDeepEqual(poseAt(state,motionDuration(state)*.5),REST);
  for(let t=0;t<2000;t+=40)for(const n of Object.values(poseAt(state,t)))assert.ok(Number.isFinite(n));
  assert.deepEqual(poseAt(state,99999),REST);
 }
});
test('KO holds a fallen body and revive starts at exactly the same joints before standing',()=>{
 const ko=poseAt('ko',1150);assert.ok(ko.body>70&&ko.legL>60&&ko.legR>60);assert.deepEqual(poseAt('ko',20000),ko);
 assert.deepEqual(poseAt('recovery',0),ko);assert.deepEqual(poseAt('recovery',1200),REST);
 const c=new AnimationController('WARRIOR');c.sync(650,100);c.sync(0,300);assert.equal(c.startedAt,300);assert.equal(c.sample(20000),'ko');c.sync(195,21000);assert.equal(c.sample(21200),'recovery');assert.equal(c.sample(23000),'idle');
 const loaded=new AnimationController('MAGE');loaded.sync(0,2000);assert.ok(2000-loaded.startedAt>=motionDuration('ko'));assert.equal(loaded.sample(2000),'ko');
});
test('Guardian death extinguishes core, collapses and scatters halo in both native and exported artwork',()=>{
 const final=poseAt('death',1800);assert.equal(final.core,0);assert.ok(final.body>60&&final.shards>30&&final.alpha<1);assert.deepEqual(poseAt('death',99999),final);
 assert.notEqual(shardTransform(1,0),shardTransform(1,final.shards));const svg=rigSvg('GUARDIAN','test',final);assert.ok(svg.includes('data-core="" opacity="0"'));assert.equal((svg.match(/data-shard=/g)||[]).length,8);
 const c=new AnimationController('GUARDIAN');c.sync(2000,1);c.sync(0,2000);c.sync(0,2500);assert.equal(c.startedAt,2000);assert.equal(c.sample(6000),'death');
});
test('failed dodge/barrier/ward shows impact, while Warrior still partially blocks; duplicate casts never restart',()=>{
 for(const kind of ['THIEF','MAGE','HEALER'] as ActorKind[])assert.equal(animationFor({seq:1,turn:1,type:'REACTION_RESOLVED',actorId:'p',text:'Reaction — FAILED'},'p',kind),'hurt');
 assert.equal(animationFor({seq:1,turn:1,type:'REACTION_RESOLVED',actorId:'p',text:'Reaction — FAILED'},'p','WARRIOR'),'shield');
 const c=new AnimationController('THIEF'),e={seq:5,turn:1,type:'ACTION_RESOLVED',actorId:'p',skillId:'thief.shadow_execution',text:'Execution — PERFECT'};c.sync(100,0);c.consume(e,'p',100);c.consume(e,'p',400);assert.equal(c.startedAt,100);
});
test('painted locomotion/story sheets are manifest-driven, transparent and direction-aware',async()=>{
 const {default:sharp}=await import('sharp');
 for(const kind of ['WARRIOR','MAGE','THIEF','HEALER'] as ActorKind[]){const a=SPRITES[kind].exploration;assert.equal(a.columns,4);assert.equal(a.clips.walkN.frames,4);const file=readFileSync('public'+a.source),metadata=await sharp(file).metadata();assert.equal(metadata.format,'webp');assert.equal(metadata.width,384);assert.equal(metadata.height,1024);assert.ok(metadata.hasAlpha);await sharp(file).resize(192).png().toBuffer();}
 const boss=readFileSync('public'+GUARDIAN_STORY.source);await sharp(boss).resize(192).png().toBuffer();assert.equal(GUARDIAN_STORY.columns,4);assert.ok(!rigSvg('MAGE','north',REST,'N').includes('m5-16 4 1m2 2'));assert.ok(rigSvg('MAGE','east',REST,'E').includes('m5-16 4 1m2 2'));
});
test('all maps provide collision-safe guidance; detours never cut an expanded corner',()=>{
 for(const map of Object.values(MAPS)){
  const exit=map.zones.find(z=>z.id==='exit')!,route=routeTo(map,map.spawn,exit);assert.ok(route.length>=2,map.id);assert.deepEqual(route[0],map.spawn);assert.equal(route.at(-1)!.x,exit.x);assert.equal(route.at(-1)!.y,exit.y);for(let i=1;i<route.length;i++)assert.ok(clearSegment(map,route[i-1],route[i]));
  const obstacle=map.obstacles[0],from={x:obstacle.x-40,y:obstacle.y+obstacle.height/2},to={x:obstacle.x+obstacle.width+40,y:from.y},detour=routeTo(map,from,to);assert.ok(detour.length>2,map.id);for(let i=1;i<detour.length;i++)assert.ok(clearSegment(map,detour[i-1],detour[i]));
  assert.equal(walkable(map,{x:obstacle.x+5,y:obstacle.y+5}),false);assert.deepEqual(routeTo(map,{x:-100,y:-100},exit),[]);
  for(let i=0;i<10;i++){const p=move(map,from,{x:1,y:0},i*10);assert.ok(walkable(map,p));}
 }
 assert.equal(bearing({x:50,y:50},{x:0,y:100}),'Barat daya ↙');
});
