/** Private publication checks. No production content belongs in this module. */
import type {SchoolItem} from './validation';
import {splitMathText} from './math-markup';

export function validateQuestionQuality(items:SchoolItem[]){
 let distractors=0,mathSpans=0;
 for(const item of items){
  const review=item.explanation_json as SchoolItem['explanation_json']&Record<string,unknown>;
  if(review.qualityVersion!==3||typeof review.conceptFamily!=='string'||!review.conceptFamily.trim())throw Error('MISSING_QUALITY_REVIEW');
  const demand=review.cognitiveDemand as Record<string,unknown>|undefined;
  if(!demand||demand.tier!==item.difficulty||typeof demand.reason!=='string'||demand.reason.trim().length<16
   ||!Number.isInteger(demand.reasoningSteps)||Number(demand.reasoningSteps)<1||Number(demand.reasoningSteps)>5)throw Error('INVALID_DIFFICULTY_RATIONALE');
  const wrong=review.distractors as {optionId:string;misconception:string;valueExpression:string}[]|undefined;
  if(!Array.isArray(wrong)||wrong.length!==3||new Set(wrong.map(d=>d.optionId)).size!==3)throw Error('MISSING_DISTRACTOR_REVIEW');
  for(const distractor of wrong){
   if(!item.options_json.some(o=>o.id===distractor.optionId)||distractor.optionId===item.correct_option_id
    ||typeof distractor.misconception!=='string'||distractor.misconception.trim().length<12
    ||typeof distractor.valueExpression!=='string'||!distractor.valueExpression.trim())throw Error('INVALID_DISTRACTOR_REVIEW');
   distractors++;
  }
  for(const text of [item.prompt,...item.options_json.map(o=>o.text),review.explanation]){
   if(typeof text!=='string')throw Error('INVALID_MATH_TEXT');
   for(const part of splitMathText(text,true)){
    if(part.kind==='math'){
     if(!part.source.trim()||part.source.length>600||/\\(?:href|url|includegraphics|html\w*|def|gdef|let|newcommand)\b/.test(part.source))throw Error('UNSAFE_OR_EMPTY_MATH');
     mathSpans++;
    }else if(/[×÷²³^]|(?<!\\)\$/.test(part.source))throw Error('UNFORMATTED_MATH');
   }
  }
  if(item.options_json.some(o=>{
   const parts=splitMathText(o.text,true);
   return parts.length!==1||parts[0].kind!=='math';
  }))throw Error('INCONSISTENT_OPTION_FORMAT');
 }
 return {qualityVersion:3,items:items.length,reviewedDistractors:distractors,mathSpans};
}
