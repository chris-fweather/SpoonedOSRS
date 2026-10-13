// One-time local setup for a fresh clone (`npm run setup`): creates .dev.vars from .env.example with a random
// SESSION_SECRET, then applies every migration to the local D1 database the dev server uses. Safe to run again:
// it never overwrites .dev.vars values you have set, and already-applied migrations are skipped.
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const vars='.dev.vars';
let text=existsSync(vars)?readFileSync(vars,'utf8'):readFileSync('.env.example','utf8');
if(!/^SESSION_SECRET=\S{32,}/m.test(text)){
 const secret=randomBytes(32).toString('base64url');
 text=/^SESSION_SECRET=.*$/m.test(text)?text.replace(/^SESSION_SECRET=.*$/m,'SESSION_SECRET='+secret):text+'\nSESSION_SECRET='+secret+'\n';
 writeFileSync(vars,text);
 console.log('Wrote .dev.vars with a random SESSION_SECRET. Add your own Discord application there to test signing in.');
}else console.log('.dev.vars already has a SESSION_SECRET; left it as it is.');

// The dev server's local database (vite.config.ts keeps this placeholder ID for local runs).
const dir=mkdtempSync(path.join(tmpdir(),'spooned-setup-')),config=path.join(dir,'wrangler.json');
writeFileSync(config,JSON.stringify({name:'spoonedosrs-local',compatibility_date:'2026-05-15',d1_databases:[{binding:'DB',database_name:'spoonedosrs-db',database_id:'00000000-0000-4000-8000-000000000000',migrations_dir:path.resolve('drizzle')}]}));
execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config',config,'--persist-to',path.resolve('.wrangler/state')],{stdio:'inherit',env:{...process.env,CI:'true'}});
console.log('Local database ready. Run `npm run dev`.');
