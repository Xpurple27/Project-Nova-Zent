/** Read private content from an explicit path; never print questions/keys. */
import {readFile,writeFile} from 'node:fs/promises';
import {validateQuestionBank,validateSchoolQuestionBank} from '../src/game/questions/validation';
import type {SchoolItem} from '../src/game/questions/validation';
import {validateQuestionQuality} from '../src/game/questions/quality';
import {splitMathText} from '../src/game/questions/math-markup';
import {renderToString} from 'katex';
async function main(){
const path=process.argv[2];if(!path)throw Error('Usage: node --import tsx scripts/validate-question-bank.ts PRIVATE_JSON [--write-sql=PRIVATE_SQL]');
const items=JSON.parse(await readFile(path,'utf8'));const school=process.argv.includes('--school');
const report=(school?validateSchoolQuestionBank:validateQuestionBank)(items);
const quality=process.argv.includes('--quality')?validateQuestionQuality(items as SchoolItem[]):undefined;
let renderedMathSpans=0;
for(const item of items as SchoolItem[])for(const text of [item.prompt,...item.options_json.map(o=>o.text),item.explanation_json.explanation])
 for(const part of splitMathText(text,true))if(part.kind==='math'){
  renderToString(part.source,{displayMode:part.display,throwOnError:true,strict:'error',trust:false,maxExpand:100,maxSize:10});renderedMathSpans++;
 }
console.log(JSON.stringify({...report,...(quality?{quality}:{}),renderedMathSpans},null,2));
const output=process.argv.find(s=>s.startsWith('--write-sql='))?.slice(12);
if(output){const data=JSON.stringify(items).replaceAll("'","''");await writeFile(output,"select public."+(school?"nz_question_import_v2":"nz_question_import_v1")+"('"+data+"'::jsonb);\n",{mode:0o600});console.error('Private import SQL prepared. No content printed.');}

}
void main().catch(error=>{console.error(error instanceof Error?error.message:"CONTENT_VALIDATION_FAILED");process.exitCode=1;});
