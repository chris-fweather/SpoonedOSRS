// Feature checks against the production build in workerd: staff tools, moderation, guides, privacy,
// accounts, commendations, pet records, share images and public discovery. Each check gets its own
// Worker and empty database (scripts/worker-harness.mjs), so they run in parallel and leave nothing
// behind. Run after `npm run build`; `npm run test:integration -- staff` runs only matching checks.
import {spawn} from 'node:child_process';

const checks=['staff-roles','staff-profile','staff-workspace','staff-guides','moderation-cases','discord-preferences','profile-privacy','account-menu',
 'guest-commendations','pet-records','launch-controls','discovery-accounts','share-previews'];
const filter=process.argv.slice(2),selected=checks.filter(name=>!filter.length||filter.some(f=>name.includes(f)));
if(!selected.length)throw Error(`No check matches ${filter.join(' ')}. Checks: ${checks.join(', ')}`);

function run(name){
 return new Promise(resolve=>{
  const started=Date.now(),child=spawn(process.execPath,['--import','./scripts/register-tests.mjs',`scripts/check-${name}.mjs`],{stdio:['ignore','pipe','pipe']});
  let output='';
  for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output+=chunk;});
  // A hung Worker must fail the run rather than stall CI.
  const timer=setTimeout(()=>{output+='\nTimed out after 180 seconds.';child.kill('SIGKILL');},180_000);
  child.on('close',code=>{clearTimeout(timer);resolve({name,code,output,seconds:((Date.now()-started)/1000).toFixed(1)});});
 });
}

const queue=[...selected],results=[];
await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{
 while(queue.length){
  const result=await run(queue.shift());results.push(result);
  // workerd prints connection teardown noise on shutdown; it is not part of a check's result.
  const lines=result.output.split('\n').filter(line=>line.trim()&&!/^(kj::|stack: )|workerd@/.test(line));
  if(result.code===0)console.log(`✔ ${result.name} (${result.seconds}s) ${lines.findLast(line=>/PASS/.test(line))?.replace(/^PASS:?\s*/,'')??''}`);
  else console.error(`✖ ${result.name} (${result.seconds}s)\n${lines.slice(-40).join('\n')}\n`);
 }
}));
const failed=results.filter(r=>r.code!==0);
console.log(`${results.length-failed.length}/${results.length} feature checks passed.`);
process.exit(failed.length?1:0);
