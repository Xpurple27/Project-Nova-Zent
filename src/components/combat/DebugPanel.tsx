
"use client";
import type { CombatState } from "@/game/core/types";
import { applyBossIntent,updatePhase } from "@/game/boss/engine";
import { finishRound } from "@/game/combat/engine";
export default function DebugPanel({state,onChange}:{state:CombatState;onChange:(s:CombatState)=>void}){
 if(process.env.NODE_ENV==="production")return null;
 function edit(fn:(s:CombatState)=>void){const s=structuredClone(state);fn(s);onChange(s);}
 return <details className="panel debug-panel"><summary>Development controls · local simulation only</summary><div className="actions"><button className="button small" onClick={()=>edit(s=>{s.boss.hp=Math.floor(s.boss.maxHp*.59);updatePhase(s);})}>Phase 2</button><button className="button small" onClick={()=>edit(s=>{s.boss.hp=Math.floor(s.boss.maxHp*.24);updatePhase(s);})}>Phase 3</button><button className="button small" onClick={()=>edit(s=>{s.boss.rage=100;})}>Rage 100</button><button className="button small" disabled={!!state.pending} onClick={()=>edit(s=>{applyBossIntent(s,{skill:"CHARGE"});finishRound(s);})}>Trigger charge</button><button className="button small" disabled={!!state.pending} onClick={()=>edit(s=>applyBossIntent(s,{skill:"BARRIER"}))}>Trigger barrier</button><button className="button small" onClick={()=>edit(s=>{if(s.boss.core)s.boss.core.hp=0;})}>Destroy core</button>{state.party.map(p=><label key={p.id}>{p.name} HP<input type="number" value={p.hp} min={0} max={p.maxHp} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n))edit(s=>{s.party.find(x=>x.id===p.id)!.hp=Math.round(Math.min(p.maxHp,Math.max(0,n)));});}}/></label>)}</div></details>;
}
