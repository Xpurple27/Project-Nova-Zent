import {mkdir,writeFile} from 'node:fs/promises';
import {MAPS} from '../src/game/exploration/model';
const themes={VILLAGE:['#293b39','#597064','#b7a27c','#dfc497'],FOREST_PATH:['#102b2b','#315c4e','#63765c','#95b09a'],RUINS_PATH:['#222c38','#414d51','#7b7a7c','#b7a0bd'],ANCIENT_RUINS:['#222536','#49475c','#938977','#ddc591'],BOSS_CHAMBER:['#171c2d','#393044','#86606a','#da929c']};
async function main(){
 await mkdir('public/assets/environment',{recursive:true});
 for(const map of Object.values(MAPS)){
  const [dark,mid,stone,light]=themes[map.id];let terrain='';
  // Stable arithmetic placement, with no runtime RNG or additional collision geometry.
  for(let i=0;i<200;i++){const x=(i*149+37)%1152,y=(i*223+51)%768;if(y>320&&y<445)continue;
   const r=3+i%5;terrain+=`<ellipse cx="${x}" cy="${y}" rx="${r*3}" ry="${r}" fill="${i%3===0?light:mid}" opacity="${i%3===0?.08:.4}"/><path d="M${x-5} ${y}q-5-9-9-8m9 8q1-12 7-13m-7 13 8-5" fill="none" stroke="${light}" stroke-width="1" opacity=".1"/>`;
  }
  let road='';for(let i=0;i<44;i++){const x=65+i*24,y=355+(i%3)*25;road+=`<path d="M${x} ${y}l17-2 6 15-20 4Z" fill="${stone}" opacity="${.12+(i%4)*.03}" stroke="${light}" stroke-width=".7"/>`;}
  const ruin=map.id==='ANCIENT_RUINS'||map.id==='BOSS_CHAMBER';let lines='';if(ruin)for(let x=0;x<1152;x+=96)for(let y=0;y<768;y+=64)lines+=`<path d="M${x} ${y+64}v-64h96m-48 64V${y}" fill="none" stroke="${light}" opacity=".055"/>`;
  await writeFile(`public/assets/environment/${map.id.toLowerCase()}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="1152" height="768" viewBox="0 0 1152 768"><title>NOVA ZENITH ${map.name} original layered ground</title><defs><radialGradient id="ground"><stop stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient><radialGradient id="light"><stop stop-color="${light}" stop-opacity=".13"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></radialGradient><linearGradient id="road" x2="0" y2="1"><stop stop-color="${dark}"/><stop offset=".5" stop-color="${stone}" stop-opacity=".4"/><stop offset="1" stop-color="${dark}"/></linearGradient><radialGradient id="vignette"><stop offset=".5" stop-color="#080f1b" stop-opacity="0"/><stop offset="1" stop-color="#080f1b" stop-opacity=".6"/></radialGradient></defs><rect width="1152" height="768" fill="url(#ground)"/>${lines}${terrain}<path d="M30 384Q280 367 560 384T1120 384" fill="none" stroke="#07131d" stroke-opacity=".22" stroke-width="155"/><path d="M30 384Q280 367 560 384T1120 384" fill="none" stroke="url(#road)" stroke-width="123"/>${road}<ellipse cx="${ruin?820:560}" cy="${ruin?350:280}" rx="400" ry="280" fill="url(#light)"/><rect width="1152" height="768" fill="url(#vignette)"/></svg>`);
 }
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
