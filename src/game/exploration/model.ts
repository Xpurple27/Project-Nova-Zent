export const SCENES=['VILLAGE','FOREST_PATH','RUINS_PATH','ANCIENT_RUINS','BOSS_CHAMBER'] as const;
export type SceneId=typeof SCENES[number];
export type Direction='N'|'E'|'S'|'W';
export type Point={x:number;y:number};
export type Rect=Point&{width:number;height:number};
export type InteractionZone=Point&{id:string;label:string;radius:number;kind:'NPC'|'EXIT'|'ENCOUNTER'|'BOSS'};
export type WorldMap={id:SceneId;name:string;width:number;height:number;spawn:Point;ground:number;obstacles:(Rect&{kind:'HOUSE'|'TREE'|'STONE'})[];zones:InteractionZone[]};
const trees=[{x:340,y:180,width:70,height:90,kind:'TREE' as const},{x:430,y:510,width:80,height:90,kind:'TREE' as const},{x:780,y:130,width:75,height:100,kind:'TREE' as const},{x:880,y:540,width:80,height:100,kind:'TREE' as const}];
export const MAPS:Record<SceneId,WorldMap>=Object.fromEntries(SCENES.map((id,index)=>[id,{id,name:['Ember Village','Forest Path','Ruins Path','Ancient Ruins','Seal Chamber'][index],width:1152,height:768,spawn:{x:130,y:384},ground:[0x202e32,0x172e29,0x202d2c,0x282738,0x24202f][index],obstacles:index===0?[{x:310,y:140,width:180,height:130,kind:'HOUSE'},{x:690,y:520,width:160,height:130,kind:'HOUSE'},...trees.slice(2)]:index<3?trees:[{x:350,y:180,width:70,height:130,kind:'STONE'},{x:350,y:500,width:70,height:130,kind:'STONE'},{x:790,y:180,width:70,height:130,kind:'STONE'},{x:790,y:500,width:70,height:130,kind:'STONE'}],zones:[{id:'guide',label:'Baca petunjuk',x:220,y:384,radius:80,kind:'NPC'},{id:'exit',label:['Ke Forest Path','Shadow Hound','Corrupted Shaman','Ke ruang segel','Bangunkan Abyss Guardian'][index],x:1030,y:384,radius:90,kind:index===1||index===2?'ENCOUNTER':index===4?'BOSS':'EXIT'}]}])) as Record<SceneId,WorldMap>;
export const MOVE_SPEED=155,PLAYER_RADIUS=14,NETWORK_MS=100;
export function move(map:WorldMap,position:Point,axis:Point,dtMs:number):Point{
 const length=Math.hypot(axis.x,axis.y),factor=length>1?1/length:1,step=MOVE_SPEED*Math.min(50,Math.max(0,dtMs))/1000;
 const clear=(p:Point)=>p.x>=PLAYER_RADIUS&&p.y>=PLAYER_RADIUS&&p.x<=map.width-PLAYER_RADIUS&&p.y<=map.height-PLAYER_RADIUS&&!map.obstacles.some(r=>p.x+PLAYER_RADIUS>r.x&&p.x-PLAYER_RADIUS<r.x+r.width&&p.y+PLAYER_RADIUS>r.y&&p.y-PLAYER_RADIUS<r.y+r.height);
 let p={...position};const x={...p,x:p.x+axis.x*factor*step};if(clear(x))p=x;const y={...p,y:p.y+axis.y*factor*step};if(clear(y))p=y;return p;
}
export const nearbyZone=(map:WorldMap,p:Point)=>map.zones.find(z=>Math.hypot(z.x-p.x,z.y-p.y)<=z.radius)??null;
export type Motion=Point&{scene:SceneId;sceneToken:string;stream:string;seq:number;direction:Direction;animation:'idle'|'walk';sentAt:number};
export function validMotion(value:unknown,map:WorldMap,sceneToken:string):value is Motion{
 if(!value||typeof value!=='object')return false;const m=value as Motion;
 return m.scene===map.id&&m.sceneToken===sceneToken&&typeof m.stream==='string'&&m.stream.length<=50&&Number.isSafeInteger(m.seq)&&m.seq>=0&&Number.isFinite(m.x)&&Number.isFinite(m.y)&&m.x>=0&&m.y>=0&&m.x<=map.width&&m.y<=map.height&&['N','E','S','W'].includes(m.direction)&&['idle','walk'].includes(m.animation)&&Number.isFinite(m.sentAt);
}
export class RemoteTrack{
 private frames:{value:Motion;at:number}[]=[];private oldStreams=new Set<string>();
 accept(value:Motion,at:number){const last=this.frames.at(-1)?.value;if(last){if(last.stream===value.stream&&value.seq<=last.seq)return false;if(last.stream!==value.stream){if(this.oldStreams.has(value.stream))return false;this.oldStreams.add(last.stream);if(this.oldStreams.size>8)this.oldStreams.delete(this.oldStreams.values().next().value!);this.frames=[];}}
 this.frames.push({value,at});this.frames=this.frames.slice(-8);return true;}
 sample(now:number):Motion|null{if(!this.frames.length||now-this.frames.at(-1)!.at>5000)return null;const at=now-120;let a=this.frames[0],b=a;for(const frame of this.frames){if(frame.at<=at)a=frame;if(frame.at>=at){b=frame;break;}b=frame;}const t=b.at===a.at?1:Math.max(0,Math.min(1,(at-a.at)/(b.at-a.at)));return {...b.value,x:a.value.x+(b.value.x-a.value.x)*t,y:a.value.y+(b.value.y-a.value.y)*t};}
}
