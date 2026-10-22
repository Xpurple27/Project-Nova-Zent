// Deterministic original vector rigs. Regenerated frames share the live combat pose sampler.
import {mkdir,writeFile} from 'node:fs/promises';
import {SPRITES,GUARDIAN_STORY,type ActorKind,type SpriteAsset} from '../src/game/animation/manifest';
import {rigSymbols,rigBody,type RigDirection} from '../src/game/animation/rig';
import {poseAt} from '../src/game/animation/motion';

async function sheet(kind:ActorKind,a:SpriteAsset,world=false){
 const definitions=world?(['S','N','E','W'] as RigDirection[]).map(d=>rigSymbols(kind,a.id+d,d)).join(''):rigSymbols(kind,a.id);
 let frames='';
 for(const [name,clip] of Object.entries(a.clips))for(let frame=0;frame<clip.frames;frame++){
  const direction=(world?name.at(-1):'E') as RigDirection,prefix=a.id+(world?direction:''),time=clip.loop?frame/clip.frames*clip.durationMs:frame/(clip.frames-1)*clip.durationMs;
  const pose=poseAt(world?name.startsWith('walk')?'walk':'idle':name,time);
  const scale=world?.75:kind==='GUARDIAN'?a.frameHeight/268:a.frameHeight/170,feet=kind==='GUARDIAN'?246:150,cx=kind==='GUARDIAN'?128:64;
  const body=rigBody(kind,prefix,pose,direction);
  frames+=`<g transform="translate(${frame*a.frameWidth} ${clip.row*a.frameHeight})"><g transform="translate(${a.frameWidth/2} ${a.frameHeight-7}) scale(${direction==='W'?-scale:scale} ${scale}) translate(${-cx} ${-feet})">${body}</g></g>`;
 }
 await writeFile('public'+a.source,`<svg xmlns="http://www.w3.org/2000/svg" width="${a.frameWidth*a.columns}" height="${a.frameHeight*Object.keys(a.clips).length}" viewBox="0 0 ${a.frameWidth*a.columns} ${a.frameHeight*Object.keys(a.clips).length}"><title>NOVA ZENITH ${kind} articulated motion sheet — project-original CC0</title>${definitions}${frames}</svg>`);
}
async function main(){
 await mkdir('public/assets/sprites',{recursive:true});
for(const kind of ['WARRIOR','MAGE','THIEF','HEALER','GUARDIAN'] as ActorKind[]){await sheet(kind,SPRITES[kind].exploration,true);await sheet(kind,SPRITES[kind].combat);}
await sheet('GUARDIAN',GUARDIAN_STORY);
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
