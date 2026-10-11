import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

export function buildReleaseInfo(){
  const {version,channel}=JSON.parse(readFileSync(new URL('../release.json',import.meta.url),'utf8'));
  let commit=process.env.WORKERS_CI_COMMIT_SHA||process.env.GITHUB_SHA;
  try{commit??=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{commit='local';}
  return {version,channel,buildId:createHash('sha256').update(commit).digest('hex').slice(0,16),builtAt:new Date().toISOString()};
}
