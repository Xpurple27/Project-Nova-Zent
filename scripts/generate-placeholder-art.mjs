// Compatibility entry point. Original humanoids now use articulated pose sampling.
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['--import','tsx','scripts/generate-motion-sheets.ts'],{stdio:'inherit'});
