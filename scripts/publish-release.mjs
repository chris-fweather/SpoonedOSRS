import {execFileSync} from 'node:child_process';
import {checkRelease} from './check-release.mjs';

const tag=process.env.GITHUB_REF_NAME;
if(!tag)throw Error('Run this from the release tag workflow.');
const release=checkRelease(['--tag',tag]);
// Stable and beta releases are deployed from main; verify the live Worker before publishing notes.
if(release.channel!=='candidate'){
 execFileSync('git',['merge-base','--is-ancestor','HEAD','origin/main'],{stdio:'inherit'});
 execFileSync(process.execPath,['scripts/check-deployment.mjs'],{stdio:'inherit'});
}
// A repeated run must not overwrite published notes or replace an existing release.
try{execFileSync('gh',['release','view',tag],{stdio:'ignore'});console.log('Release already exists; left unchanged.');}
catch{
 execFileSync('gh',['release','create',tag,'--verify-tag','--title',`Spooned OSRS ${release.version}`,'--notes-file',release.notes,...(release.channel!=='stable'?['--prerelease','--latest=false']:[])],{stdio:'inherit'});
}
