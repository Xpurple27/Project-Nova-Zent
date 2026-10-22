import type {CombatEvent} from '../core/types';
import {type ActorKind} from './manifest';
import {motionDuration} from './motion';
export const SKILL_ANIMATIONS:Record<string,string>={'warrior.slash':'slash','warrior.shield_wall':'shield','warrior.provoke':'provoke','warrior.last_bastion':'lastBastion','mage.arcane_bolt':'arcaneCast','mage.overcharge':'overchargeCast','mage.frost_seal':'frostCast','mage.meteor':'meteorCast','thief.quick_strike':'quickStrike','thief.focus_stance':'focus','thief.expose_weakness':'exposeWeakness','thief.shadow_execution':'execution','healer.holy_bolt':'holyCast','healer.healing_wave':'healingWave','healer.blessing':'blessing','healer.divine_recovery':'divineRecovery'};
const bossClips:Record<string,string>={CLAW:'claw',SPEAR:'spear',WAVE:'wave',ROAR:'roar',ARMOR:'armor',BARRIER:'barrier',CHARGE:'charge',CATACLYSM:'cataclysm',BITE:'attack',POUNCE:'special',SHADOW_BOLT:'attack',CORRUPT_WAVE:'special',DARK_CHANT:'special'};
export function animationFor(e:CombatEvent,actorId:string,kind:ActorKind):string|null{
 if(e.type==='PLAYER_KO'&&e.targetId===actorId)return 'ko';if(e.type==='PLAYER_REVIVED'&&e.targetId===actorId)return 'recovery';
 if((e.type==='DAMAGE'||e.type==='INCOMING_DAMAGE')&&e.targetId===actorId)return 'hurt';
 if((e.type==='BOSS_DEFEATED'||e.type==='ENEMY_DEFEATED')&&actorId==='boss')return 'death';
 if(e.type==='BOSS_PHASE_CHANGED'&&actorId==='boss')return 'phase';
 if(e.type==='BOSS_ACTION_SELECTED'&&actorId==='boss')return bossClips[e.skillId?.split('.').at(-1)?.toUpperCase()??'']??'idle';
 if(e.type==='ACTION_RESOLVED'&&e.actorId===actorId)return SKILL_ANIMATIONS[e.skillId??'']??'idle';
 if(e.type==='REACTION_RESOLVED'&&e.actorId===actorId){if(e.text.endsWith('FAILED')&&kind!=='WARRIOR')return 'hurt';return kind==='WARRIOR'?'shield':kind==='THIEF'?'dodge':kind==='HEALER'?'ward':'barrier';}
 return null;
}
export class AnimationController{
 state='idle';startedAt=0;until=0;private seq=0;private ko=false;private initialized=false;
 constructor(readonly kind:ActorKind){}
 private begin(state:string,now:number){this.state=state;this.startedAt=now;this.until=now+motionDuration(state);}
 sync(hp:number,now=0){
  if(hp<=0&&!this.ko){const state=this.kind==='GUARDIAN'||this.kind==='HOUND'||this.kind==='SHAMAN'?'death':'ko';this.ko=true;this.begin(state,this.initialized?now:now-motionDuration(state));}
  else if(hp>0&&this.ko){this.ko=false;this.begin('recovery',now);}
  this.initialized=true;
 }
 consume(e:CombatEvent,actorId:string,now:number){if(e.seq<=this.seq)return false;this.seq=e.seq;const state=animationFor(e,actorId,this.kind);if(!state||this.ko&&state!=='recovery')return false;this.begin(state,now);return true;}
 sample(now:number){if(!this.ko&&this.state!=='idle'&&now>=this.until)this.state='idle';return this.state;}
}
