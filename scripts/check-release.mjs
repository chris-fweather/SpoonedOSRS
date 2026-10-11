import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export function validateRelease({release,pkg,lock,changelog,notes,migrations,tag,production=false}){
  const version=release.version;
  if(!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(rc|beta)\.[1-9]\d*)?$/.test(version))throw Error('Use a numeric release version, a -beta.N beta or a -rc.N candidate.');
  if(pkg.version!==version || lock.version!==version || lock.packages[''].version!==version)throw Error('Package, lockfile and release versions must match.');
  if(release.channel!==(version.includes('-beta.')?'beta':version.includes('-rc.')?'candidate':'stable'))throw Error('Release channel does not match version.');
  // Betas serve testers on production; candidates are review snapshots that never deploy.
  if(production && release.channel==='candidate')throw Error('Production deployment requires a stable or beta release. This is a candidate.');
  if(tag && tag!==`v${version}`)throw Error('Git tag does not match the release version.');
  if(release.notes!==`releases/${version}.md`)throw Error('Release notes must use the versioned releases path.');
  if(notes.split(/\r?\n/,1)[0]!==`# Spooned OSRS ${version}` || notes.length<300)throw Error('Missing substantive, versioned release notes.');
  if(!changelog.includes(`## ${version} — `))throw Error('Changelog needs an entry for this release.');
  if(migrations.at(-1)!==release.minimumMigration)throw Error('Release schema requirement does not match the latest migration.');
  return release;
}

export function checkRelease(args=process.argv.slice(2)){
  const json=file=>JSON.parse(readFileSync(file,'utf8'));
  const release=json('release.json');
  // Validate path before reading a manifest-controlled file.
  if(release.notes!==`releases/${release.version}.md` || !/^[\w.-]+$/.test(release.version))throw Error('Invalid release notes path.');
  const tagIndex=args.indexOf('--tag');
  if(tagIndex>=0 && !args[tagIndex+1])throw Error('Expected tag after --tag.');
  return validateRelease({release,pkg:json('package.json'),lock:json('package-lock.json'),changelog:readFileSync('CHANGELOG.md','utf8'),notes:readFileSync(release.notes,'utf8'),migrations:readdirSync('drizzle').filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort(),tag:tagIndex<0?undefined:args[tagIndex+1],production:args.includes('--production')});
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const release=checkRelease();console.log(`Release ${release.version}: metadata and schema checks passed (${release.channel}).`);
}
