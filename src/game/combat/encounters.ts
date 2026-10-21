import type {CharacterClass} from '../core/types';import {createCombat} from './engine';import {ENEMIES,type EnemyId} from '../enemies/definitions';
export function createEncounter(classes:CharacterClass[],enemyId:EnemyId,seed:number){
 const s=createCombat(classes,seed);s.enemyId=enemyId;
 if(enemyId!=='abyss-guardian'){const def=ENEMIES[enemyId];s.boss.name=def.name;s.boss.hp=s.boss.maxHp=Math.round(def.baseHp*(1+.6*(classes.length-1)));s.roundBossHpStart=s.boss.hp;}
 // Keep the same locked-roster resonance as the boss: normal encounters last ~2–4 rounds.
 return s;
}
