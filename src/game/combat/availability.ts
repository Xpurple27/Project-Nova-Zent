import { CHARACTERS } from '../config';
import type { Character,SkillDefinition } from '../core/types';
/** Presentation hint only. The server validates again against the locked state. */
export function unavailableReason(p:Character,skill:SkillDefinition):string|null {
 if(p.hp<=0)return 'Character is KO';
 if(p.active===false)return 'Character is inactive';
 if(p.classId!==skill.classId)return 'Wrong class';
 if(skill.ultimate&&p.ultimate<100)return 'Requires 100 Ultimate';
 if(!skill.ultimate&&p.resource<skill.cost)return 'Requires '+skill.cost+' '+CHARACTERS[p.classId].resourceType;
 return null;
}
