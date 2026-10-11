import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

// Expand paths in Node so Windows, Linux and CI run the same set of tests.
const tests=readdirSync('lib').filter(name=>name.endsWith('.test.ts')).sort().map(name=>'lib/'+name);
const scriptTests=readdirSync('scripts').filter(name=>name.endsWith('.test.mjs')).sort().map(name=>'scripts/'+name);
if(tests.length===0)throw Error('No unit tests found.');
const result=spawnSync(process.execPath,['--import','./scripts/register-tests.mjs','--test',...tests,...scriptTests],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
