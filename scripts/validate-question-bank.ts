/** Read private content from an explicit path; never print questions/keys. */
import {readFile,writeFile} from 'node:fs/promises';
import {validateQuestionBank,validateSchoolQuestionBank} from '../src/game/questions/validation';
async function main(){
const path=process.argv[2];if(!path)throw Error('Usage: node --import tsx scripts/validate-question-bank.ts PRIVATE_JSON [--write-sql=PRIVATE_SQL]');
const items=JSON.parse(await readFile(path,'utf8'));const school=process.argv.includes('--school');console.log(JSON.stringify((school?validateSchoolQuestionBank:validateQuestionBank)(items),null,2));
const output=process.argv.find(s=>s.startsWith('--write-sql='))?.slice(12);
if(output){const data=JSON.stringify(items).replaceAll("'","''");await writeFile(output,"select public."+(school?"nz_question_import_v2":"nz_question_import_v1")+"('"+data+"'::jsonb);\n",{mode:0o600});console.log('Private import SQL prepared. No content printed.');}

}
void main().catch(error=>{console.error(error instanceof Error?error.message:"CONTENT_VALIDATION_FAILED");process.exitCode=1;});
