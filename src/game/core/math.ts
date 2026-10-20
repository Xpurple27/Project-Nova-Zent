
import { GAME } from "../config";
import type { MathPerformance } from "./types";
export function finite(n:number):number { if(!Number.isFinite(n)) throw new Error("NON_FINITE_NUMBER"); return n; }
export function roundHalfUp(n:number):number { finite(n); if(n<0 || n>Number.MAX_SAFE_INTEGER) throw new Error("UNSAFE_EFFECT"); const whole=Math.floor(n);const result=whole+(n-whole>=.5?1:0);if(!Number.isSafeInteger(result))throw new Error("UNSAFE_EFFECT");return result; }
export function clamp(n:number,min:number,max:number):number { finite(n);finite(min);finite(max);if(min>max)throw new Error("INVALID_BOUNDS");return Math.min(max,Math.max(min,n)); }
export const clampHp = (hp:number,maxHp:number) => roundHalfUp(clamp(hp,0,maxHp));
export const clampResource = (n:number) => roundHalfUp(clamp(n,0,GAME.resourceMax));
export const percent = (n:number,total:number) => total<=0 ? 0 : clamp(n/total*100,0,100);
export const composeModifiers = (...mods:number[]) => mods.reduce((a,b)=>a*finite(b),1);
export const resistanceModifier = (r:number) => 1-clamp(r,0,1);
export const performanceMultiplier = (p:MathPerformance) => GAME.performance[p];
export function gradeAnswer(correct:boolean,elapsedMs:number,availableMs:number):MathPerformance {
  finite(availableMs);finite(elapsedMs);
  if(availableMs<=0 || elapsedMs<0) throw new Error("INVALID_TIMER");
  return correct && elapsedMs<availableMs ? elapsedMs<=availableMs*.5 ? "PERFECT" : "SUCCESS" : "FAILED";
}
export function weightedIndex(weights:number[],random:number):number {
  if(!Number.isFinite(random)||!weights.length || weights.some(w=>w<0 || !Number.isFinite(w)) || random<0 || random>=1) throw new Error("INVALID_WEIGHTS");
  const sum=weights.reduce((a,b)=>a+b,0);if(sum<=0)throw new Error("NO_TARGET");
  let cursor=random*sum;for(let i=0;i<weights.length;i++){cursor-=weights[i];if(cursor<0)return i;}return weights.length-1;
}
