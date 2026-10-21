import type {BossSkill,CombatState} from '../core/types';
export type EnemyId='shadow-hound'|'corrupted-shaman'|'abyss-guardian';
export type EnemyActionDefinition={id:BossSkill;name:string;kind:'SINGLE'|'AOE'|'UTILITY';damage:number;reaction:boolean};
export type EnemyDefinition={id:EnemyId;name:string;baseHp:number;cycle:readonly BossSkill[];actions:readonly EnemyActionDefinition[]};
export const ENEMIES:Record<Exclude<EnemyId,'abyss-guardian'>,EnemyDefinition>={
 'shadow-hound':{id:'shadow-hound',name:'Shadow Hound',baseHp:400,cycle:['BITE','POUNCE'],actions:[{id:'BITE',name:'Bite',kind:'SINGLE',damage:60,reaction:true},{id:'POUNCE',name:'Pounce',kind:'SINGLE',damage:80,reaction:true}]},
 'corrupted-shaman':{id:'corrupted-shaman',name:'Corrupted Shaman',baseHp:600,cycle:['CORRUPT_WAVE','DARK_CHANT','SHADOW_BOLT'],actions:[{id:'SHADOW_BOLT',name:'Shadow Bolt',kind:'SINGLE',damage:70,reaction:true},{id:'CORRUPT_WAVE',name:'Corrupt Wave',kind:'AOE',damage:30,reaction:false},{id:'DARK_CHANT',name:'Dark Chant',kind:'UTILITY',damage:0,reaction:false}]}
};
export function normalEnemy(s:CombatState){return s.enemyId&&s.enemyId!=='abyss-guardian'?ENEMIES[s.enemyId]:null;}
export const normalAction=(s:CombatState,skill:BossSkill)=>normalEnemy(s)?.actions.find(a=>a.id===skill);
