import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {checkRelease} from './check-release.mjs';
import {deploymentConfig,deployEnvironment} from './deployment-config.mjs';

// Called only after release:verify by Workers Builds. Credentials stay in Cloudflare.
const release=checkRelease(['--production']);
const branch=process.env.WORKERS_CI_BRANCH,target=deployEnvironment();
// main deploys only the live Worker; dev deploys only the dev Worker and its own database.
if(branch!==target.branch)throw Error(`The ${target.name} environment deploys only from Cloudflare Workers Builds on ${target.branch}.`);
const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
const {d1DatabaseId}=deploymentConfig();
if(config.name!==target.worker || !config.d1_databases?.some(binding=>binding.binding==='DB' && binding.database_id===d1DatabaseId && binding.database_name===target.database))throw Error(`The ${target.name} Worker/database configuration is missing.`);
const run=(script,args)=>execFileSync(process.execPath,[script,...args],{stdio:'inherit'});
// Failure stops the process; never upload code after a failed migration.
run('node_modules/wrangler/bin/wrangler.js',['d1','migrations','apply','DB','--remote','--config','dist/server/wrangler.json']);
run('node_modules/wrangler/bin/wrangler.js',['deploy','--config','dist/server/wrangler.json','--message',`Release ${release.version}`]);
// Verify the live Worker. The provider sync check runs once DEPLOY_CHECK_SECRET is a build secret;
// until then it warns rather than marking an already-uploaded release as failed.
if(target.name==='production')run('scripts/check-deployment.mjs',['https://spoonedosrs.com','--sync-optional']);
