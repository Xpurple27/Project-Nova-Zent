/** Content tooling contract, contains no production questions or keys. Never import a private data file here. */
export const CATEGORIES=['ARITHMETIC','NUMBER_SENSE','FRACTIONS','RATIO','PERCENTAGE','ALGEBRA','LINEAR_EQUATIONS','FORMULA','SEQUENCES','PATTERN','LOGIC','PROBABILITY','GEOMETRY','MEASUREMENT'] as const;
export type ProductionItem={revision_id:string;logical_question_id:string;revision_number:number;difficulty:'EASY'|'MEDIUM'|'HARD';tags:string[];prompt:string;options_json:{id:string;text:string}[];correct_option_id:string;explanation_json:{explanation:string;expectedSolution:string;family:string;affinity:string[];reviewStatus:string};status:'DRAFT'|'ACTIVE'|'RETIRED';content_version:string;estimated_solve_ms:number;reviewed_by:string};
export function validateQuestionBank(value:unknown,{minimum=120,perDifficulty=40}={}){
 if(!Array.isArray(value)||value.length<minimum||value.length>1000)throw Error('INVALID_BANK_SIZE');
 const items=value as ProductionItem[],ids=new Set<string>(),prompts=new Set<string>(),families=new Map<string,number>(),difficulty:Record<string,number>={},categories:Record<string,number>={},affinity:Record<string,number>={};
 const uuid=/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;
 for(const q of items){
  if(!uuid.test(q.revision_id)||ids.has(q.revision_id)||!q.logical_question_id||!Number.isSafeInteger(q.revision_number)||q.revision_number<1)throw Error('INVALID_ITEM_ID');ids.add(q.revision_id);
  if(!['EASY','MEDIUM','HARD'].includes(q.difficulty)||!q.tags?.length||!(CATEGORIES as readonly string[]).includes(q.tags[0]))throw Error('INVALID_ITEM_CATEGORY');
  if(typeof q.prompt!=='string'||!q.prompt.trim()||q.prompt.length>600)throw Error('INVALID_PROMPT');
  const normalized=q.prompt.trim().replace(/\s+/g,' ').toLowerCase();if(prompts.has(normalized))throw Error('DUPLICATE_PROMPT');prompts.add(normalized);
  if(!Array.isArray(q.options_json)||q.options_json.length!==4||new Set(q.options_json.map(o=>o.id)).size!==4||new Set(q.options_json.map(o=>o.text.trim().toLowerCase())).size!==4||q.options_json.some(o=>!o.id||!o.text.trim()))throw Error('INVALID_OPTIONS');
  if(q.options_json.filter(o=>o.id===q.correct_option_id).length!==1)throw Error('INVALID_KEY');
  const e=q.explanation_json;if(!e?.explanation||!e.expectedSolution||!e.family||e.reviewStatus!=='reviewed'||!e.affinity?.length||!q.reviewed_by||q.content_version!=='production-v1')throw Error('UNREVIEWED_ITEM');
  if(!Number.isFinite(q.estimated_solve_ms)||q.estimated_solve_ms<1000||q.estimated_solve_ms>({EASY:12000,MEDIUM:18000,HARD:25000}[q.difficulty]))throw Error('INVALID_SOLVE_TIME');
  families.set(e.family,(families.get(e.family)??0)+1);difficulty[q.difficulty]=(difficulty[q.difficulty]??0)+1;categories[q.tags[0]]=(categories[q.tags[0]]??0)+1;for(const a of e.affinity)affinity[a]=(affinity[a]??0)+1;
 }
 for(const d of ['EASY','MEDIUM','HARD'])if((difficulty[d]??0)<perDifficulty)throw Error('INSUFFICIENT_DIFFICULTY_COVERAGE');
 if([...families.values()].some(n=>n>3))throw Error('REPETITIVE_TEMPLATE_FAMILY');
 return {count:items.length,difficulty,categories,affinity,uniqueFamilies:families.size,duplicatePrompts:0};
}

/** Validate a private full publication; school level and combat difficulty are independent axes. */
export type SchoolItem=ProductionItem&{school_level:'SD'|'SMP'|'SMA';question_class_id:'WARRIOR'|'MAGE'|'THIEF'|'HEALER'};
export function validateSchoolQuestionBank(value:unknown){
 const report=validateQuestionBank(value,{minimum:720,perDifficulty:240});
 if(report.count!==720)throw Error('INVALID_SCHOOL_BANK_SIZE');
 const coverage:Record<string,number>={};
 for(const q of value as SchoolItem[]){
  const e=q.explanation_json as ProductionItem['explanation_json']&{schoolLevel?:string;primaryClass?:string};
  if(!['SD','SMP','SMA'].includes(q.school_level)||!['WARRIOR','MAGE','THIEF','HEALER'].includes(q.question_class_id)
   ||e.schoolLevel!==q.school_level||e.primaryClass!==q.question_class_id||!e.affinity.includes(q.question_class_id)
   ||!q.tags.includes('SCHOOL_'+q.school_level)||!q.tags.includes('AFFINITY_'+q.question_class_id))throw Error('INVALID_SCHOOL_CLASSIFICATION');
  const key=[q.school_level,q.question_class_id,q.difficulty].join(':');coverage[key]=(coverage[key]??0)+1;
 }
 for(const level of ['SD','SMP','SMA'])for(const cls of ['WARRIOR','MAGE','THIEF','HEALER'])for(const difficulty of ['EASY','MEDIUM','HARD'])
  if(coverage[[level,cls,difficulty].join(':')]!==20)throw Error('INSUFFICIENT_SCHOOL_CLASS_DIFFICULTY_COVERAGE');
 return {...report,coverage};
}
