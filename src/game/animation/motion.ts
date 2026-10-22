import type {ActorKind} from './manifest';
/** Presentation-only joint angles in degrees; no HP, damage, clocks or gameplay RNG. */
export type RigPose={x:number;y:number;body:number;head:number;armL:number;elbowL:number;armR:number;elbowR:number;legL:number;kneeL:number;legR:number;kneeR:number;cloak:number;alpha:number;core:number;halo:number;shards:number};
export const REST:RigPose={x:0,y:0,body:0,head:0,armL:8,elbowL:-8,armR:-8,elbowR:8,legL:0,kneeL:0,legR:0,kneeR:0,cloak:0,alpha:1,core:1,halo:0,shards:0};
type Key={at:number;pose:Partial<RigPose>};
type Motion={duration:number;keys:Key[];hold?:boolean};
const key=(at:number,pose:Partial<RigPose>):Key=>({at,pose});
const action=(wind:Partial<RigPose>,hit:Partial<RigPose>,duration=900):Motion=>({duration,keys:[key(0,REST),key(.28,wind),key(.5,hit),key(.72,{...hit,x:(hit.x??0)*.5}),key(1,REST)]});
export const MOTIONS:Record<string,Motion>={
 slash:action({body:-12,armR:-135,elbowR:-30,armL:25,legR:15},{x:16,body:18,armR:70,elbowR:-12,legL:-20,kneeR:20,cloak:-18}),
 shield:action({body:-5,armL:-45,elbowL:-80,kneeL:15,kneeR:15},{y:4,body:-9,armL:-70,elbowL:-55,armR:-25,kneeL:25,kneeR:25}),
 provoke:action({head:-8,armR:-110,elbowR:-30},{x:5,head:-12,armR:-155,elbowR:-20,armL:-20,body:8}),
 lastBastion:action({y:8,body:15,armL:-30,elbowL:-80,kneeL:35,kneeR:35},{y:3,body:-4,armL:-80,elbowL:-35,armR:-140,elbowR:5,core:1.8},1200),
 arcaneCast:action({body:-10,armL:-40,elbowL:-65,armR:15,head:-5},{body:9,armL:-85,elbowL:-20,armR:-40,elbowR:-25,x:4,core:1.5}),
 overchargeCast:action({body:-18,armL:-135,elbowL:35,armR:110,elbowR:30,core:2},{x:8,body:22,armL:-80,elbowL:-5,armR:-55,elbowR:-20,legL:-18,kneeR:20,core:2.5},1100),
 frostCast:action({body:6,armR:25,elbowR:45,armL:-25,elbowL:-80},{y:5,body:12,armL:-100,elbowL:-5,armR:30,elbowR:25,kneeL:20,kneeR:15,core:1.3}),
 meteorCast:action({y:-3,body:-15,head:-16,armL:-160,elbowL:-10,armR:150,elbowR:-150,core:2},{y:7,body:24,armL:-60,elbowL:-20,armR:-50,elbowR:25,kneeL:30,kneeR:30,core:3},1400),
 quickStrike:action({x:-8,y:3,body:-12,armR:-90,elbowR:-70,legL:20,kneeR:20},{x:24,y:3,body:20,armR:-75,elbowR:0,armL:80,legL:-30,kneeR:35,cloak:-30},760),
 focus:action({armL:-60,elbowL:-65,armR:60,elbowR:65,head:8},{y:3,armL:-42,elbowL:-95,armR:42,elbowR:95,body:-3,kneeL:20,kneeR:20,core:1.5}),
 exposeWeakness:action({y:9,body:20,armL:35,armR:-45,elbowR:-80,kneeL:45,kneeR:35},{x:19,y:7,body:30,armL:-90,elbowL:0,armR:-60,elbowR:0,legL:-25,kneeR:40,cloak:-25}),
 dodge:{duration:1000,keys:[key(0,REST),key(.24,{x:-24,y:8,body:-28,head:15,armL:55,armR:35,legL:32,kneeL:40,legR:-35,kneeR:20,alpha:.65}),key(.6,{x:-30,y:5,body:-20,armL:35,armR:50,cloak:35}),key(1,REST)]},
 execution:{duration:1400,keys:[key(0,REST),key(.18,{x:-12,y:7,body:-20,armL:60,armR:-80,alpha:.15}),key(.34,{x:26,alpha:.15}),key(.46,{x:24,body:24,armL:-110,elbowL:0,armR:100,elbowR:0,alpha:1,cloak:-40}),key(.65,{x:14,body:-12,armL:65,elbowL:-10,armR:-100,elbowR:0,alpha:1}),key(1,REST)]},
 holyCast:action({body:-6,armL:-40,elbowL:-80,armR:12},{armL:-92,elbowL:-5,armR:-22,elbowR:-15,body:7,core:1.4}),
 healingWave:action({y:10,body:12,armR:25,elbowR:30,kneeL:40,kneeR:40},{y:5,body:5,armL:-125,elbowL:15,armR:-15,elbowR:-5,kneeL:25,kneeR:25,core:2},1100),
 blessing:action({armR:85,elbowR:50,armL:-55,elbowL:-55,head:-12},{y:-3,armR:155,elbowR:-155,armL:-115,elbowL:-15,head:-10,core:1.8}),
 ward:action({armL:-45,elbowL:-75,armR:25,elbowR:35},{body:-8,armL:-85,elbowL:-10,armR:65,elbowR:55,kneeL:20,kneeR:20,core:2}),
 divineRecovery:action({y:6,body:-10,armL:-90,elbowL:-60,armR:90,elbowR:60,head:-15},{y:-7,body:0,armL:-155,elbowL:-5,armR:155,elbowR:-155,head:-18,core:2.5},1400),
 hurt:{duration:500,keys:[key(0,REST),key(.22,{x:-7,y:3,body:-19,head:15,armL:25,armR:-35,kneeL:20}),key(.6,{x:-3,body:-8}),key(1,REST)]},
 ko:{duration:1150,hold:true,keys:[key(0,REST),key(.3,{y:14,body:22,head:20,armL:15,armR:20,legL:-24,kneeL:65,legR:25,kneeR:65}),key(.68,{x:5,y:12,body:65,head:15,armL:30,armR:-10,legL:-15,kneeL:80,legR:18,kneeR:80}),key(1,{x:-23,y:25,body:78,head:15,armL:15,elbowL:15,armR:5,elbowR:15,legL:72,kneeL:12,legR:88,kneeR:3,core:.2})]},
 recovery:{duration:1200,keys:[key(0,{x:-23,y:25,body:78,head:15,armL:15,elbowL:15,armR:5,elbowR:15,legL:72,kneeL:12,legR:88,kneeR:3,core:.2}),key(.38,{y:15,body:30,armL:-45,elbowL:-10,armR:25,legL:-20,kneeL:60,kneeR:60,core:1.5}),key(.72,{y:6,body:8,armL:-65,elbowL:-35,armR:20,kneeL:25,kneeR:25,core:2}),key(1,REST)]},
 entrance:action({y:20,body:20,head:15,armL:25,armR:-25,kneeL:30,kneeR:30,core:.2},{y:0,body:-5,armL:-45,armR:45,head:-8,core:2,halo:12},1500),
 claw:action({body:-15,armL:20,armR:-120,elbowR:-45},{x:-8,body:18,armR:70,elbowR:-15,armL:-25,core:1.4}),
 spear:action({body:-15,armR:70,elbowR:100,armL:-20},{x:-12,body:22,armR:85,elbowR:0,armL:25,legL:-20,kneeR:25,core:1.5}),
 wave:action({body:-12,armL:-105,armR:105,core:1.8},{y:5,body:18,armL:-65,elbowL:-15,armR:65,elbowR:15,kneeL:20,kneeR:20,core:2}),
 roar:action({body:12,head:12,armL:-20,armR:20},{body:-18,head:-25,armL:-75,armR:75,core:2.5,halo:15}),
 armor:action({armL:-50,elbowL:-90,armR:50,elbowR:90,body:8},{y:2,armL:-35,elbowL:-110,armR:35,elbowR:110,core:.6,halo:-10}),
 barrier:action({armL:-20,elbowL:-55,armR:20,elbowR:55},{y:-2,armL:-100,elbowL:5,armR:100,elbowR:-5,core:2,halo:18}),
 charge:action({y:6,body:8,armL:-40,elbowL:-90,armR:40,elbowR:90},{y:2,body:-12,head:-12,armL:-55,elbowL:-65,armR:55,elbowR:65,core:3,halo:35},1200),
 cataclysm:action({y:-3,body:-20,head:-18,armL:-165,elbowL:0,armR:165,elbowR:0,core:3,halo:35},{y:14,body:32,head:18,armL:-20,armR:20,elbowL:-15,elbowR:15,kneeL:45,kneeR:45,core:2,shards:5},1500),
 phase:action({body:10,head:10,armL:-30,armR:30,core:2},{body:-13,head:-20,armL:-110,armR:110,core:3,halo:30,shards:10},1200),
 death:{duration:1800,hold:true,keys:[key(0,REST),key(.2,{body:-12,head:-20,armL:-35,armR:35,core:3,halo:22,shards:4}),key(.48,{y:12,body:20,head:20,armL:35,armR:-35,legL:-20,kneeL:55,legR:20,kneeR:55,core:.2,shards:13}),key(.78,{x:4,y:22,body:58,head:25,armL:40,elbowL:45,armR:-25,elbowR:55,kneeL:65,kneeR:65,core:0,halo:45,shards:27}),key(1,{x:-25,y:25,body:68,head:35,armL:35,elbowL:40,armR:-25,elbowR:65,legL:70,kneeL:15,legR:85,kneeR:5,core:0,halo:65,shards:38,alpha:.6})]}
};
const ease=(n:number)=>n*n*(3-2*n);
export function poseAt(state:string,elapsedMs:number,reduced=false):RigPose{
 if(state.startsWith('walk')){
  const angle=elapsedMs/720*Math.PI*2,s=Math.sin(angle),c=Math.cos(angle);if(reduced)return {...REST};
  return {...REST,y:-Math.abs(c)*1.7,body:s*2,head:-s,armL:-s*24+8,armR:s*24-8,elbowL:-12-Math.max(0,-s)*18,elbowR:12+Math.max(0,s)*18,legL:s*25,kneeL:Math.max(0,-s)*38,legR:-s*25,kneeR:Math.max(0,s)*38,cloak:-s*8};
 }
 const motion=MOTIONS[state];if(!motion)return {...REST,...(!reduced?{y:Math.sin(elapsedMs/1700)*.7,head:Math.sin(elapsedMs/2300)*1.2,cloak:Math.sin(elapsedMs/1400)*2}:{} )};
 const t=reduced?(motion.hold?1:.5):Math.max(0,Math.min(1,elapsedMs/motion.duration));let before=motion.keys[0],after=motion.keys.at(-1)!;
 for(let i=1;i<motion.keys.length;i++)if(t<=motion.keys[i].at){before=motion.keys[i-1];after=motion.keys[i];break;}
 const a={...REST,...before.pose},b={...REST,...after.pose},n=ease((t-before.at)/(after.at-before.at||1));
 if(n===0)return a;if(n===1)return b;
 return Object.fromEntries(Object.keys(REST).map(k=>[k,a[k as keyof RigPose]+(b[k as keyof RigPose]-a[k as keyof RigPose])*n])) as RigPose;
}
export const motionDuration=(state:string)=>state.startsWith('walk')?720:MOTIONS[state]?.duration??1800;
export const isTerminalMotion=(state:string)=>!!MOTIONS[state]?.hold;
export function locomotionState(direction:string,moving:boolean){return (moving?'walk':'idle')+direction;}
export const hasRig=(kind:ActorKind)=>kind!=='HOUND'&&kind!=='SHAMAN';
