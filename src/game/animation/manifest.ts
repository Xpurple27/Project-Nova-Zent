import type {CharacterClass} from '../core/types';
export const CHARACTER_STATES={
 WARRIOR:['idle','slash','shield','provoke','hurt','ko','lastBastion','recovery'],
 MAGE:['idle','arcaneCast','overchargeCast','frostCast','hurt','ko','meteorCast','recovery'],
 THIEF:['idle','quickStrike','focus','exposeWeakness','dodge','hurt','ko','execution','recovery'],
 HEALER:['idle','holyCast','healingWave','blessing','ward','hurt','ko','divineRecovery','recovery']
} as const;
export const BOSS_STATES=['idle','entrance','claw','spear','wave','roar','armor','barrier','charge','cataclysm','hurt','phase','death'] as const;
export type ActorKind=CharacterClass|'GUARDIAN'|'HOUND'|'SHAMAN';
export type AnimationClip={row:number;frames:number;fps:number;loop:boolean;durationMs:number};
export type SpriteAsset={id:string;source:string;fallback:string;frameWidth:number;frameHeight:number;columns:4;origin:readonly[.5,1];worldHeight:number;license:'CC0-project-original';clips:Record<string,AnimationClip>};
function asset(id:string,states:readonly string[],width:number,height:number):SpriteAsset{
 return {id,source:`/assets/sprites/${id}.svg`,fallback:'/assets/bosses/guardian.svg',frameWidth:width,frameHeight:height,columns:4,origin:[.5,1],worldHeight:64,license:'CC0-project-original',clips:Object.fromEntries(states.map((name,row)=>{const loop=name==='idle'||name.startsWith('walk'),ms=/meteor|execution|Bastion|Recovery|cataclysm/.test(name)?1800:/ko|death/.test(name)?800:600;return [name,{row,frames:4,fps:4/(ms/1000),loop,durationMs:ms}];}))};
}
export const SPRITES:Record<ActorKind,{combat:SpriteAsset;exploration:SpriteAsset}>=Object.fromEntries((['WARRIOR','MAGE','THIEF','HEALER','GUARDIAN','HOUND','SHAMAN'] as ActorKind[]).map(kind=>[kind,{combat:asset(kind.toLowerCase()+'-combat',kind==='GUARDIAN'?BOSS_STATES:kind==='HOUND'||kind==='SHAMAN'?['idle','attack','special','hurt','death']:CHARACTER_STATES[kind],kind==='GUARDIAN'?256:128,kind==='GUARDIAN'?256:160),exploration:asset(kind.toLowerCase()+'-world',['idleS','walkS','idleW','walkW','idleE','walkE','idleN','walkN'],96,128)}])) as Record<ActorKind,{combat:SpriteAsset;exploration:SpriteAsset}>;
export const clipFor=(asset:SpriteAsset,state:string)=>asset.clips[state]??asset.clips.idle??Object.values(asset.clips)[0];
