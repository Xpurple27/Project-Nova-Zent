import type {ActorKind} from './manifest';
import {REST,type RigPose} from './motion';
export type RigDirection='S'|'N'|'E'|'W';
const palettes={WARRIOR:{dark:'#213248',mid:'#526c85',light:'#a5bacb',glow:'#8de8f5',cloth:'#26364d'},MAGE:{dark:'#302846',mid:'#756098',light:'#c9b9e4',glow:'#c4a4ff',cloth:'#443756'},THIEF:{dark:'#152e36',mid:'#36545d',light:'#8ba9ae',glow:'#7ce0d3',cloth:'#24464d'},HEALER:{dark:'#53405c',mid:'#b59a61',light:'#eee1ba',glow:'#ffe3a0',cloth:'#e4d9bb'},GUARDIAN:{dark:'#222735',mid:'#504951',light:'#988673',glow:'#ff6886',cloth:'#302c3b'}};
export function rigSymbols(kind:ActorKind,id:string,direction:RigDirection='E'){
 const c=palettes[kind as keyof typeof palettes]??palettes.WARRIOR,boss=kind==='GUARDIAN',back=direction==='N',side=direction==='E'||direction==='W';
 const plate=(d:string,fill=boss||kind==='WARRIOR'?`url(#${id}-metal)`:c.mid)=>`<path d="${d}" fill="${fill}" stroke="#131e2b" stroke-width="1.2" stroke-linejoin="round"/>`;
 const core=`<path d="m0-40 8 13-8 10-8-10Z" fill="${c.glow}"/><path d="m0-34 3 7-3 4-3-4Z" fill="#fff3dc"/>`;
 const torso=boss?plate('M-30-54-41-35-27-5-17 5 18 5 28-8 40-37 28-54 10-61-9-61Z')+`<path d="M-25-49-5-35m-23 0 22 12m-21 1L-7-9M25-49 5-35m23 0L6-23m21 1L7-9" stroke="${c.light}" stroke-width="5" stroke-linecap="round"/>`:
 kind==='WARRIOR'?plate('M-18-48-30-39-21-22-18 0-6 8 8 8 21 0 24-26 29-41 15-49Z')+plate('M-18-44-5-37-10-22-20-24Z',c.light)+plate('M18-44 6-36 10-23 23-27Z',c.light)+`<path d="m0-44-4 20 10 9-7 16" stroke="${c.glow}" stroke-width="2.2" fill="none"/>`+plate('M-19-7 0-2 20-8 18 5 0 10-19 5Z',c.dark):
 kind==='MAGE'?plate('M-16-48-24-28-20 4-27 29-8 19 0 33 9 17 25 28 20-4 23-31 15-49Z',c.cloth)+plate('M-10-45 0-35 10-45 8-9 0 1-8-10Z',c.light)+`<path d="M-18-41-11-18-18 17M18-41 12-18 20 17" fill="none" stroke="#c9ab7a" stroke-width="2"/><path d="m0-24 5 8-5 8-5-8Z" fill="${c.glow}"/>`:
 kind==='THIEF'?plate('M-14-47-23-32-17-12-22 9-4 3 8 10 22 5 17-19 22-34 12-48Z',c.dark)+plate('M-15-40 0-46 15-39 12-15-2-8-15-18Z')+`<path d="m-15-35 25 26m2-29-25 25" stroke="${c.light}" stroke-width="2"/><path d="M-18-45 15-49 25-39 7-32-19-37Z" fill="${c.cloth}" stroke="${c.glow}" stroke-width="1"/>`:
 plate('M-17-48-29-35-22-19-26 25-7 18 0 32 12 17 26 26 20-20 29-38 14-49Z',c.cloth)+plate('M-21-46 0-37 21-46 30-33 15-25 0-32-16-26-30-34Z',c.light)+plate('M-10-31 0-24 11-32 8 7 0 18-9 6Z',c.mid)+`<path d="M-18-16v28M18-16v28" stroke="#d3b66e" stroke-width="2"/><circle cy="-14" r="5" fill="${c.glow}"/>`;
 const skin=kind==='HEALER'?'#b98564':'#d2af95';
 let face=boss?plate('M-13-23 0-32 13-23 9 3 0 15-9 3Z',c.dark)+`<path d="m0-23 1 29" stroke="${c.glow}" stroke-width="2.4"/><path d="m-7-14 5-3m4 0 5 3" stroke="${c.glow}" stroke-width="2"/>`:
 `<path d="M-5 0v10H6V0" fill="${skin}"/><path d="M-10-21-4-28 7-27 12-18 10-5 4 2-5 0-11-9Z" fill="${skin}" stroke="#312d36" stroke-width="1"/>`;
 if(!boss){
  const hair=kind==='MAGE'?'#ddd4e5':kind==='WARRIOR'?'#4c5058':'#252e39';
  face+=kind==='HEALER'?`<path d="M-12-17q-5-19 12-19t14 20l-6-10-15-1Z" fill="#302c38"/><path d="M-11-28q12-14 23 0" stroke="#b69b5c" stroke-width="3" fill="none"/><circle cx="1" cy="-31" r="3" fill="#e7cd88"/>`:
  `<path d="m-12-13-2-12 9-11 14 1 7 12-5 9-2-11-9-2-7 9Z" fill="${hair}"/>`;
  if(kind==='MAGE')face+='<path d="M-10-16q-16 10-10 32" fill="none" stroke="#805fa8" stroke-width="5"/><path d="m-20-3 4 2m-5 5 4 2m-4 4 4 2" stroke="#c9abeb" stroke-width="1.5"/>';
  if(kind==='WARRIOR')face+=`<path d="m-11-28 3 13m9 4 4 7m-11 0 5 4 9-2" stroke="#aaaeb2" stroke-width="1.5" fill="none"/>`;
  if(kind==='THIEF')face+='<path d="m7-31-5 9" stroke="#87cfc6" stroke-width="2.5"/>';
  if(!back)face+=`<path d="${side?'m5-16 4 1m2 2 3 5-4 1':'m-7-15 4-1m7 0 4 1m-8 2-1 5 4 1'}" stroke="#2c303e" stroke-width="1.4" fill="none"/>`;
  else face=`<path d="M-10-25-3-31 9-28 14-14 8 3H-7L-14-12Z" fill="${hair}" stroke="#28303e"/>`;
 }
 const weapon=boss?plate('M-11-5-16 10-12 29-4 39-4 23 2 17 6 37 13 27 17 9 11-5Z',c.mid)+`<path d="M-10 11-6 24m15-14 1 17" stroke="${c.glow}" fill="none" stroke-width="1.8"/>`:
 kind==='WARRIOR'?`<path d="m0-51 5 9-2 36-3 5-3-5v-36Z" fill="#c6d4dd" stroke="#526e86" stroke-width="1.4"/><path d="M-9-3H9M0-3v15" stroke="#c1a777" stroke-width="3"/>`:
 kind==='THIEF'?`<path d="M-3-5 5-3 5 22 11 14 11 29 4 38-4 24Z" fill="#b6d4d4" stroke="#385963"/><path d="M-9-4H9" stroke="#80cabc" stroke-width="3"/>`:
 `<path d="M0-66v85" stroke="#c5ac74" stroke-width="3"/>${kind==='MAGE'?`<path d="m0-79 13 17L0-43l-13-19Z" fill="none" stroke="#c5ac74" stroke-width="2"/><path d="m0-73 6 12-6 10-6-10Z" fill="${c.glow}"/><ellipse cy="-61" rx="19" ry="6" fill="none" stroke="#bca579" stroke-width="1.5"/>`:`<circle cy="-66" r="16" fill="none" stroke="#d3b66e" stroke-width="2.5"/><ellipse cy="-66" rx="21" ry="6" fill="none" stroke="#d3b66e"/><circle cy="-66" r="6" fill="${c.glow}"/>`}`;
 const shield=kind==='WARRIOR'?`<path d="M-16-14 1-22 19-12 16 21 1 38-17 22Z" fill="#344f66" stroke="#a2bac9" stroke-width="2"/><path d="m1-18-7 17 12 10-7 24" fill="none" stroke="${c.glow}" stroke-width="3"/><path d="M-10-9v25l10 13m12-37v26L5 30" stroke="#8ba1af" fill="none"/>`:kind==='THIEF'?`<path d="m-2 6-3-29 9-13 5 14-5 10v18Z" fill="#b6d4d4" stroke="#385963"/><path d="M-8 3H8" stroke="#80cabc" stroke-width="3"/>`:`<path d="M-4-3 3-4 8 0 10 8 5 12-4 8Z" fill="${skin}" stroke="#4e4853"/>`;
 const halo=boss?Array.from({length:8},(_,i)=>{const a=i*Math.PI/4,x=Math.cos(a)*31,y=Math.sin(a)*31-8;return `<g id="${id}-shard-${i}"><path d="M${x-7} ${y-5}l8-5 8 5-2 8-12 1Z" fill="${c.mid}" stroke="${c.light}" stroke-width="1.4"/></g>`;}).join(''):kind==='MAGE'?`<circle cx="-18" cy="-24" r="13" fill="none" stroke="${c.glow}" opacity=".65"/><path d="m-18-36 11 19h-22Z" fill="none" stroke="#c6a974"/>`:kind==='HEALER'?`<ellipse cy="-31" rx="21" ry="6" fill="none" stroke="#d9bf77" stroke-width="2"/>`:'';
 const upper=boss?plate('M-13-6-20 13-14 31 8 33 17 12 12-6Z')+`<path d="m-11 8 12 14 7-15" fill="none" stroke="${c.light}" stroke-width="2"/>`:plate('M-8-3-12 8-8 22 7 24 10 7 7-3Z')+`<path d="M-8 5H8M-6 15H7" stroke="${c.light}" stroke-width="1.3" opacity=".6"/>`;
 const fore=boss?plate('M-12-4-17 12-9 31 12 29 20 8 12-5Z',c.dark)+`<path d="m-10 1 7 11-5 12m18-22 6 16" stroke="${c.glow}" fill="none" stroke-width="2"/>`:plate('M-7-2-9 14-5 25 6 25 9 10 6-3Z',kind==='HEALER'?c.light:c.dark)+`<path d="M-7 5H7m-13 6h11" stroke="${c.mid}" stroke-width="2"/>`;
 const cloak=back||kind!=='THIEF'?`<path d="M-17-47-26-15-29 16-12 12 0 27 12 13 27 20 24-15 16-47Z" fill="${c.cloth}" stroke="#162331" stroke-width="1"/><path d="m-16-37-5 45m25-48 17 49M-2-36v51" stroke="${c.light}" opacity=".25" fill="none"/>`:`<path d="M-15-45-35-35-55-12-40-19-37-6-13-35Z" fill="${c.cloth}" stroke="${c.mid}"/>`;
 return `<defs><linearGradient id="${id}-metal" x2="1" y2="1"><stop stop-color="${c.light}"/><stop offset=".5" stop-color="${c.mid}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient><g id="${id}-torso">${back&&!boss?plate('M-18-48-24-20-16 10 15 10 23-20 17-48Z',c.cloth):torso}</g><g id="${id}-head">${face}</g><g id="${id}-cloak">${cloak}</g><g id="${id}-upper">${upper}</g><g id="${id}-fore">${fore}</g><g id="${id}-weapon">${weapon}</g><g id="${id}-shield">${boss?weapon:shield}</g><g id="${id}-thigh">${plate(boss?'M-11-3-15 11-8 23 10 23 15 8 9-3Z':'M-7-2-9 11-5 22 7 22 9 7 6-2Z',boss?c.mid:c.dark)}</g><g id="${id}-shin">${plate(boss?'M-10-2-14 15-17 24 14 25 13 9 9-3Z':'M-6-2-8 12-10 20 8 21 10 16 7 1Z',boss?c.mid:c.dark)}<path d="M-5 4H6m-13 9H8" stroke="${c.light}" opacity=".5"/></g><g id="${id}-halo">${halo}</g><g id="${id}-core">${boss?core:`<circle cy="-26" r="3" fill="${c.glow}"/>`}</g></defs>`;
}
const n=(value:number)=>Math.round(value*100)/100;
export function boneTransforms(kind:ActorKind,p:RigPose){const boss=kind==='GUARDIAN';return {
 root:`translate(${n((boss?128:64)+p.x*(boss?1.6:1))} ${n((boss?238:148)+p.y*(boss?1.6:1))}) scale(${boss?1.6:1})`,
 body:`translate(0 -40) rotate(${n(p.body)})`,head:`translate(0 ${boss?-68:-59}) rotate(${n(p.head)})`,cloak:`rotate(${n(p.cloak)})`,
 armL:`translate(${boss?-29:-17} ${boss?-51:-42}) rotate(${n(p.armL)})`,elbowL:`translate(0 ${boss?29:22}) rotate(${n(p.elbowL)})`,
 armR:`translate(${boss?29:17} ${boss?-51:-42}) rotate(${n(p.armR)})`,elbowR:`translate(0 ${boss?29:22}) rotate(${n(p.elbowR)})`,
 legL:`translate(${boss?-12:-8} -40) rotate(${n(p.legL)})`,kneeL:`translate(0 20) rotate(${n(p.kneeL)})`,
 legR:`translate(${boss?12:8} -40) rotate(${n(p.legR)})`,kneeR:`translate(0 20) rotate(${n(p.kneeR)})`,halo:`rotate(${n(p.halo)} 0 -8)`};}
export function shardTransform(i:number,spread:number,fall=spread){const a=i*Math.PI/4,x=Math.cos(a)*31,y=Math.sin(a)*31-8;return `translate(${n(Math.cos(a)*spread)} ${n(Math.sin(a)*spread+fall*.3)}) rotate(${n(fall*(i%2?1:-1))} ${n(x)} ${n(y)})`;}
export function rigBody(kind:ActorKind,id:string,pose:RigPose=REST,_direction:RigDirection='E'){
 const t=boneTransforms(kind,pose),boss=kind==='GUARDIAN',use=(part:string)=>`<use href="#${id}-${part}"/>`;
 const bone=(name:keyof typeof t,body:string)=>`<g data-bone="${name}" transform="${t[name]}">${body}</g>`;
 const arm=(side:'L'|'R')=>bone(('arm'+side) as 'armL',use('upper')+bone(('elbow'+side) as 'elbowL',use('fore')+`<g transform="translate(0 ${boss?27:24})">${use(side==='L'?'shield':'weapon')}</g>`));
 const leg=(side:'L'|'R')=>bone(('leg'+side) as 'legL',use('thigh')+bone(('knee'+side) as 'kneeL',use('shin')));
 const halo=boss?Array.from({length:8},(_,i)=>`<g data-shard="${i}" transform="${shardTransform(i,pose.shards)}">${use('shard-'+i)}</g>`).join(''):use('halo');
 const head=bone('head',bone('halo',halo)+use('head'));
 return `<ellipse cx="${boss?128:64}" cy="${boss?246:150}" rx="${boss?70:30}" ry="${boss?9:5}" fill="#07121c" opacity=".45"/><g data-bone="root" transform="${t.root}" opacity="${pose.alpha}">${leg('L')}${leg('R')}${bone('body',bone('cloak',use('cloak'))+arm('L')+use('torso')+`<g data-core="" opacity="${Math.min(1,pose.core)}">${use('core')}</g>`+head+arm('R'))}</g>`;
}
export function rigSvg(kind:ActorKind,id:string,pose:RigPose=REST,direction:RigDirection='E'){
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${kind==='GUARDIAN'?'-20 -8 296 280':'-12 -10 152 174'}" fill="none">${rigSymbols(kind,id,direction)}${rigBody(kind,id,pose,direction)}</svg>`;
}
