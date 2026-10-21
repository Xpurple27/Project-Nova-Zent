/** Browser-only dynamic import. No auth, database or combat calculations in this renderer. */
import {SPRITES} from '../animation/manifest';
import {StoryCursor,storyFrame} from '../story/runtime';
import type {StoryCommand} from '../story/definitions';
import * as Phaser from 'phaser';
import {MAPS,move,nearbyZone,RemoteTrack,type Direction} from './model';
import type {ExplorationPort} from './bridge';
const colors={WARRIOR:0x92b6d0,MAGE:0xb39aef,THIEF:0x74c4b6,HEALER:0xf3dd9c};
export function mountExploration(parent:HTMLElement,port:ExplorationPort){
 let disposed=false;const tracks=new Map<string,RemoteTrack>();
 class World extends Phaser.Scene{
  private actors=new Map<string,Phaser.GameObjects.Container>();private bossSprite?:Phaser.GameObjects.Sprite;private keys?:Record<string,Phaser.Input.Keyboard.Key>;
  private storyId='';private storyCursor=new StoryCursor();private reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private lastAnimation='';private lastSend=-Infinity;private seq=0;private stream=crypto.randomUUID();private direction:Direction='S';private position={...MAPS[port.view.scene].spawn,y:MAPS[port.view.scene].spawn.y+((port.view.party.find(p=>p.id===port.view.localId)?.seat??0)-1.5)*20};private zoneId='uninitialized';
  preload(){if(port.view.scene==='BOSS_CHAMBER'){const a=SPRITES.GUARDIAN.combat;this.load.spritesheet(a.id,a.source,{frameWidth:a.frameWidth,frameHeight:a.frameHeight});}for(const kind of new Set(port.view.party.map(p=>p.classId))){const asset=SPRITES[kind].exploration;this.load.spritesheet(asset.id,asset.source,{frameWidth:asset.frameWidth,frameHeight:asset.frameHeight});}}
  create(){
   const map=MAPS[port.view.scene];this.cameras.main.setBackgroundColor(map.ground);this.cameras.main.setBounds(0,0,map.width,map.height);
   const g=this.add.graphics();g.fillStyle(0x958166,.22);g.fillRoundedRect(55,325,1040,120,40);g.lineStyle(2,0x749889,.1);for(let x=0;x<map.width;x+=64)g.lineBetween(x,0,x,map.height);
   for(const r of map.obstacles){g.fillStyle(0x0a111a,.4);g.fillEllipse(r.x+r.width/2,r.y+r.height,r.width+25,30);g.fillStyle(r.kind==='HOUSE'?0x4d4d59:r.kind==='TREE'?0x304b43:0x535165);g.fillRoundedRect(r.x,r.y,r.width,r.height,8);g.lineStyle(3,0xa3a5ac,.25);g.strokeRoundedRect(r.x,r.y,r.width,r.height,8);if(r.kind==='HOUSE'){g.fillStyle(0x715060);g.fillTriangle(r.x-10,r.y+10,r.x+r.width/2,r.y-65,r.x+r.width+10,r.y+10);g.fillStyle(0xe6bb75,.8);g.fillRect(r.x+25,r.y+45,25,30);}}
   for(const z of map.zones){g.lineStyle(3,z.kind==='NPC'?0xb59cf1:0x9ae3c9,.65);g.strokeCircle(z.x,z.y,30);this.add.text(z.x,z.y-55,z.kind==='NPC'?'✦':'→',{fontSize:'24px',color:'#d7dfda'}).setOrigin(.5);}
   for(const member of port.view.party){const body=this.add.graphics();body.fillStyle(0x090d18,.4);body.fillEllipse(0,0,32,12);body.fillStyle(colors[member.classId]);body.fillTriangle(-14,-10,0,-52,14,-10);body.fillRoundedRect(-9,-47,18,18,5);body.fillStyle(0xe3c7b4);body.fillCircle(0,-51,5);const label=this.add.text(0,15,member.name,{fontSize:'12px',color:'#eef3ec',backgroundColor:'#161c27'}).setOrigin(.5);if(this.textures.exists(SPRITES[member.classId].exploration.id)){body.setVisible(false);const asset=SPRITES[member.classId].exploration;const sprite=this.add.sprite(0,0,asset.id).setOrigin(.5,1).setScale(.5);for(const [name,clip] of Object.entries(asset.clips)){const key=asset.id+':'+name;if(!this.anims.exists(key))this.anims.create({key,frames:this.anims.generateFrameNumbers(asset.id,{start:clip.row*4,end:clip.row*4+3}),frameRate:clip.fps,repeat:clip.loop?-1:0});}sprite.play(asset.id+':idleS');label.setData('sprite',sprite);}
   const sprite=label.getData('sprite') as Phaser.GameObjects.Sprite|undefined;const actor=this.add.container(map.spawn.x+member.seat*24,map.spawn.y+member.seat*20,[body,...(sprite?[sprite]:[]),label]);this.actors.set(member.id,actor);}
   if(port.view.scene==='BOSS_CHAMBER'&&this.textures.exists(SPRITES.GUARDIAN.combat.id)){const a=SPRITES.GUARDIAN.combat;for(const [name,clip] of Object.entries(a.clips)){const key=a.id+':'+name;if(!this.anims.exists(key))this.anims.create({key,frames:this.anims.generateFrameNumbers(a.id,{start:clip.row*4,end:clip.row*4+3}),frameRate:clip.fps,repeat:clip.loop?-1:0});}this.bossSprite=this.add.sprite(830,415,a.id).setOrigin(.5,1).setScale(.7).setAlpha(.25).setDepth(380);this.bossSprite.play(a.id+':idle');}
   this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string,Phaser.Input.Keyboard.Key>;
   this.input.keyboard?.addCapture(['UP','DOWN','LEFT','RIGHT']);
   const camera=this.cameras.main;camera.startFollow(this.actors.get(port.view.localId)!,true,.12,.12);
   const resize=()=>camera.setZoom(Math.min(1,Math.max(.45,this.scale.width/560),Math.max(.45,this.scale.height/460)));
   resize();this.scale.on('resize',resize);this.events.once('shutdown',()=>this.scale.off('resize',resize));
   parent.dataset.ready='true';
  }
  command(command:StoryCommand,seek=false){
   const camera=this.cameras.main,duration=this.reduced||seek?0:command.durationMs??500;
   if(command.type==='cameraPan'){camera.stopFollow();if(duration)camera.pan(command.x,command.y,duration);else camera.centerOn(command.x,command.y);}
   if(command.type==='cameraZoom')camera.zoomTo(command.zoom,duration);
   if(command.type==='shakeCamera'&&!this.reduced&&!seek)camera.shake(220,command.strength==='heavy'?.008:command.strength==='medium'?.004:.002);
   if(command.type==='fadeOut')camera.setAlpha(1-(command.value??1)*.5);
   if(command.type==='fadeIn')camera.setAlpha(1);
   if(command.type==='moveActor'){
    const member=port.view.party.find(p=>p.classId===command.actor),actor=member?this.actors.get(member.id):undefined;
    if(actor)this.tweens.add({targets:actor,x:command.x,y:command.y,duration});
   }
   if(command.type==='faceDirection'){const member=port.view.party.find(p=>p.classId===command.actor);if(member)this.actors.get(member.id)?.setScale(command.direction==='W'?-1:1,1);}
   if(command.type==='playAnimation'&&command.actor==='boss'&&this.bossSprite){const a=SPRITES.GUARDIAN.combat,key=a.id+':'+(a.clips[command.animation]?command.animation:'idle');this.bossSprite.play(key);this.tweens.add({targets:this.bossSprite,alpha:command.animation==='death'?.1:1,y:command.animation==='entrance'?380:this.bossSprite.y,duration});}
   if(command.type==='playAnimation'){const member=port.view.party.find(p=>p.classId===command.actor),actor=member?this.actors.get(member.id):undefined;if(actor&&!this.reduced)this.tweens.add({targets:actor,alpha:.55,yoyo:true,duration:200});}
   if(command.type==='spawnVfx'&&!seek){const ring=this.add.circle(830,380,50,0xbb768f,.2).setStrokeStyle(3,0xdfb0c0);if(command.cue==='guardian-silhouette'){ring.setRadius(95).setFillStyle(0x08080f,.9);this.add.text(830,340,'ABYSS',{fontSize:'22px',color:'#e7b0b8'}).setOrigin(.5);}this.tweens.add({targets:ring,alpha:0,scale:this.reduced?1:1.4,duration:command.durationMs??700,onComplete:()=>ring.destroy()});}
   if(command.type==='transitionScene')port.onCue?.('event','transition:'+command.scene);
   if(!seek&&(command.type==='playSfx'||command.type==='changeMusic'||command.type==='spawnVfx'||command.type==='triggerEvent'))port.onCue?.(command.type==='playSfx'?'sfx':command.type==='changeMusic'?'music':command.type==='spawnVfx'?'vfx':'event',command.cue);
  }
  update(time:number,dt:number){
   if(disposed)return;const map=MAPS[port.view.scene],local=this.actors.get(port.view.localId);if(!local)return;
   const focused=document.activeElement?.tagName;const keyboard=focused!=='INPUT'&&focused!=='SELECT'&&focused!=='TEXTAREA';
   const down=(a:string,b:string)=>keyboard&&(this.keys?.[a]?.isDown||this.keys?.[b]?.isDown)?1:0;
   const axis=port.view.locked?{x:0,y:0}:{x:port.axis.x+down('D','RIGHT')-down('A','LEFT'),y:port.axis.y+down('S','DOWN')-down('W','UP')};
   const old=this.position;this.position=move(map,this.position,axis,dt);if(!port.view.story)local.setPosition(this.position.x,this.position.y).setDepth(this.position.y);
   const story=port.view.story;if(story){if(this.storyId!==story.state.instanceId){this.storyId=story.state.instanceId;this.storyCursor=new StoryCursor();this.storyCursor.seek(story.state,story.now);for(const command of storyFrame(story.state,story.now).commands)if(['cameraPan','cameraZoom','fadeIn','fadeOut','moveActor','playAnimation','changeMusic'].includes(command.type))this.command(command,true);}for(const command of this.storyCursor.consume(story.state,story.now))this.command(command);}
   const walking=old.x!==this.position.x||old.y!==this.position.y;
   const sprite=local.list.find(obj=>obj instanceof Phaser.GameObjects.Sprite) as Phaser.GameObjects.Sprite|undefined;if(sprite&&!port.view.story){const kind=port.view.party.find(p=>p.id===port.view.localId)!.classId;sprite.play(SPRITES[kind].exploration.id+':'+(walking?'walk':'idle')+this.direction,true);}
   if(walking)this.direction=Math.abs(axis.x)>Math.abs(axis.y)?axis.x>0?'E':'W':axis.y>0?'S':'N';
   if(time-this.lastSend>=100&&(walking||this.lastAnimation!==(walking?'walk':'idle')||time-this.lastSend>=1000)){this.lastAnimation=walking?'walk':'idle';this.lastSend=time;port.onPosition?.(this.position);port.onMotion({...this.position,scene:map.id,sceneToken:port.view.sceneToken,stream:this.stream,seq:this.seq++,sentAt:Date.now(),direction:this.direction,animation:walking?'walk':'idle'});}
   const zone=nearbyZone(map,this.position);if((zone?.id??'')!==this.zoneId){this.zoneId=zone?.id??'';port.onZone(zone);}
   let visibleRemote=0;for(const member of port.view.party){if(member.id===port.view.localId)continue;const m=port.remotes.get(member.id);let track=tracks.get(member.id);if(!track){track=new RemoteTrack();tracks.set(member.id,track);}if(m)track.accept(m,performance.now());const value=track.sample(performance.now()),actor=this.actors.get(member.id);if(actor){actor.setVisible(!!value);if(value){visibleRemote++;actor.setPosition(value.x,value.y).setDepth(value.y);const sprite=actor.list.find(obj=>obj instanceof Phaser.GameObjects.Sprite) as Phaser.GameObjects.Sprite|undefined;sprite?.play(SPRITES[member.classId].exploration.id+':'+value.animation+value.direction,true);}}}parent.dataset.remoteCount=String(visibleRemote);
  }
 }
 const game=new Phaser.Game({type:Phaser.CANVAS,parent,backgroundColor:'#162523',width:parent.clientWidth||640,height:parent.clientHeight||480,scale:{mode:Phaser.Scale.RESIZE},render:{antialias:true},scene:World,audio:{noAudio:true},banner:false});
 return {destroy(){disposed=true;port.axis={x:0,y:0};game.destroy(true);tracks.clear();delete parent.dataset.ready;},get game(){return game;}};
}
