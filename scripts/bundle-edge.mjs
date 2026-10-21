import { build } from 'esbuild';
import { readFile,writeFile } from 'node:fs/promises';
const path='supabase/functions/nova-combat/index.js';
const result=await build({entryPoints:['supabase/functions/nova-combat/entry.ts'],bundle:true,platform:'neutral',format:'esm',target:'es2022',external:['npm:*'],write:false});
const code=result.outputFiles[0].text;
if(process.argv.includes('--check')){if(await readFile(path,'utf8')!==code)throw new Error('Edge bundle drift: run npm run bundle:edge');}
else await writeFile(path,code);
