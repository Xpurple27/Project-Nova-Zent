import type {CombatEvent} from '../core/types';
import {SPRITES,clipFor,type ActorKind} from './manifest';
const skills:Record<string,string>={'warrior.slash':'slash','warrior.shield_wall':'shield','warrior.provoke':'provoke','warrior.last_bastion':'lastBastion','mage.arcane_bolt':'arcaneCast','mage.overcharge':'overchargeCast','mage.frost_seal':'frostCast','mage.meteor':'meteorCast','thief.quick_strike':'quickStrike','thief.focus_stance':'focus','thief.expose_weakness':'exposeWeakness','thief.shadow_execution':'execution','healer.holy_bolt':'holyCast','healer.healing_wave':'healingWave','healer.blessing':'blessing','healer.divine_recovery':'divineRecovery'};
export function animationFor(e:CombatEvent,actorId:string,kind:ActorKind):string|null{
 if(e.type==='PLAYER_KO'&&e.targetId===actorId)return 'ko';if(e.type==='PLAYER_REVIVED'&&e.targetId===actorId)return 'recovery';
 if((e.type==='DAMAGE'||e.type==='INCOMING_DAMAGE')&&e.targetId===actorId)return 'hurt';
 if((e.type==='BOSS_DEFEATED'||e.type==='ENEMY_DEFEATED')&&actorId==='boss')return 'death';
 if(e.type==='BOSS_PHASE_CHANGED'&&actorId==='boss')return 'phase';
 if(e.type==='BOSS_ACTION_SELECTED'&&actorId==='boss'){const name=e.skillId?.split('.').at(-1)?.toLowerCase();return name??'claw';}
 if(e.type==='ACTION_RESOLVED'&&e.actorId===actorId)return skills[e.skillId??'']??(kind==='MAGE'?'arcaneCast':'idle');
 if(e.type==='REACTION_RESOLVED'&&e.actorId===actorId)return kind==='WARRIOR'?'shield':kind==='THIEF'?'dodge':kind==='HEALER'?'ward':'frostCast';
 return null;
}
export class AnimationController{
 state='idle';private until=0;private seq=0;private ko=false;
 constructor(readonly kind:ActorKind){}
 sync(hp:number,now=0){if(hp<=0){this.ko=true;this.state=this.kind==='GUARDIAN'||this.kind==='HOUND'||this.kind==='SHAMAN'?'death':'ko';}else if(this.ko){this.ko=false;this.state='recovery';this.until=now+600;}}
 consume(e:CombatEvent,actorId:string,now:number){if(e.seq<=this.seq)return false;this.seq=e.seq;const state=animationFor(e,actorId,this.kind);if(!state||this.ko&&state!=='recovery')return false;this.state=state;this.until=now+Math.min(1800,clipFor(SPRITES[this.kind].combat,state).durationMs);return true;}
 sample(now:number){if(!this.ko&&this.until&&now>=this.until)this.state='idle';return this.state;}
}
