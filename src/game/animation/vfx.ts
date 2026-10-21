import type {CombatEvent} from '../core/types';
export type VfxCue={id:number;style:'steel'|'arcane'|'frost'|'shadow'|'divine'|'abyss';shape:'slash'|'orb'|'seal'|'wave'|'shield'|'meteor';strength:'small'|'medium'|'heavy';label:string;durationMs:number};
export function vfxFor(e:CombatEvent):VfxCue|null{
 const key=e.skillId??'';let style:VfxCue['style']='abyss',shape:VfxCue['shape']='orb',strength:VfxCue['strength']='small';
 if(key.startsWith('warrior.')){style='steel';shape=/shield|bastion/.test(key)?'shield':'slash';}
 else if(key.startsWith('mage.')){style=/frost/.test(key)?'frost':'arcane';shape=/meteor/.test(key)?'meteor':/frost/.test(key)?'seal':'orb';}
 else if(key.startsWith('thief.')){style='shadow';shape=/focus|weakness/.test(key)?'seal':'slash';}
 else if(key.startsWith('healer.')){style='divine';shape=/heal|recovery/.test(key)?'wave':/blessing/.test(key)?'seal':'orb';}
 else if(e.type==='HEAL'||e.type==='PLAYER_REVIVED'){style='divine';shape='wave';}
 else if(e.type==='BLOCKED'){style='steel';shape='shield';}
 else if(/BARRIER/.test(e.type)){style='abyss';shape='shield';}
 else if(/CATACLYSM|PHASE_CHANGED/.test(e.type)){shape='wave';strength='heavy';}
 else if(/HEAVY|CORE/.test(e.type)){shape='seal';strength='medium';}
 else if(!['DAMAGE','INCOMING_DAMAGE','CRITICAL_HIT','TEAM_COMBO','COMBO','BOSS_ACTION_SELECTED'].includes(e.type))return null;
 if(/meteor|execution|bastion|recovery|CATACLYSM/i.test(key+' '+e.type))strength='heavy';
 if(/WAVE|ROAR/.test(key))shape='wave';if(/ARMOR|BARRIER/.test(key))shape='shield';
 return {id:e.seq,style,shape,strength,label:e.text,durationMs:strength==='heavy'?1100:650};
}
export class VfxCursor{private last=0;consume(e:CombatEvent){if(e.seq<=this.last)return null;this.last=e.seq;return vfxFor(e);}}
