
import type { CombatState, EffectType, StatusEffect } from "../core/types";
export function activeEffect(s:CombatState,type:EffectType,target:string):StatusEffect|undefined {
 return s.effects.find(e=>e.type===type&&e.target===target&&e.from<=s.turn&&e.through>=s.turn);
}
export const magnitude=(s:CombatState,type:EffectType,target:string)=>activeEffect(s,type,target)?.magnitude??0;
export function putEffect(s:CombatState,type:EffectType,source:string,target:string,amount:number,through:number,from=s.turn,negative=false,cleanseable=false):void {
 const old=s.effects.find(e=>e.type===type&&e.target===target);
 if(old){old.magnitude=type==="PROVOKE"?(old.magnitude===1||amount===1?1:4):Math.max(old.magnitude,amount);old.through=Math.max(old.through,through);old.from=Math.min(old.from,from);return;}
 s.effects.push({id:"effect-"+s.effectSeq++,type,source,target,magnitude:amount,from,through,negative,cleanseable});
}
export function consume(s:CombatState,type:EffectType,target:string):void {
 const e=activeEffect(s,type,target);if(e)s.effects=s.effects.filter(x=>x.id!==e.id);
}
export function cleanseOne(s:CombatState,target:string):void {
 const candidates=s.effects.filter(e=>e.target===target&&e.negative&&e.cleanseable&&e.from<=s.turn&&e.through>=s.turn);
 candidates.sort((a,b)=>b.magnitude-a.magnitude||b.through-a.through||a.id.localeCompare(b.id));
 if(candidates[0])s.effects=s.effects.filter(e=>e.id!==candidates[0].id);
}
export function expireEffects(s:CombatState):void {s.effects=s.effects.filter(e=>e.through>s.turn);}
export const outputModifier=(s:CombatState,id:string)=>(1+magnitude(s,"BLESSING","party"))*(1-magnitude(s,"ROAR",id));
