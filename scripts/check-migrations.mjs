import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const files=readdirSync('drizzle').filter(name=>/^\d{4}_.+\.sql$/.test(name)).sort();
const database=new DatabaseSync(':memory:');
try{
  database.exec('PRAGMA foreign_keys=ON');
  for(const [index,file] of files.entries()){
    assert.equal(Number(file.slice(0,4)),index,`Migration order has a gap: ${file}`);
    database.exec('BEGIN');
    try{database.exec(readFileSync('drizzle/'+file,'utf8'));database.exec('COMMIT');}
    catch(error){database.exec('ROLLBACK');throw new Error(`Migration failed: ${file}`,{cause:error});}
    if(file.startsWith('0018_')){
      // Synthetic existing user/journal must survive the pending upgrade set.
      database.prepare('INSERT INTO journals(id,data,revision) VALUES(?,?,?)').run('release test',JSON.stringify({username:'Release Test',pets:[],log:null}),7);
      // A helper whose own row lists more than guides keeps guide-only access once rank defaults exist.
      database.prepare('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)').run('release-helper','Release helper');
      database.prepare("INSERT INTO staff_members(discord_id,role,revision) VALUES(?,'helper','test')").run('release-helper');
      database.prepare('INSERT INTO staff_permissions(discord_id,guides,corrections,planning) VALUES(?,1,1,1)').run('release-helper');
    }
    if(file.startsWith('0023_')){
      // A Group Ironman synced before 0024: the old summary trigger dropped the account type.
      database.prepare('INSERT INTO journals(id,data,revision) VALUES(?,?,?)').run('board gim',JSON.stringify({username:'Board GIM',accountMode:'group_ironman',pets:[],log:null}),1);
    }
  }
  assert.equal(database.prepare('SELECT revision FROM journals WHERE id=?').get('release test')?.revision,7);
  for(const table of ['journal_summaries','staff_cases','account_actions','provider_pacing','provider_responses','staff_role_permissions'])assert.ok(database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table),`Missing ${table}`);
  assert.deepEqual(database.prepare('SELECT role,guides,corrections,planning FROM staff_role_permissions ORDER BY role').all().map(r=>({...r})),[{role:'admin',guides:1,corrections:1,planning:1},{role:'helper',guides:1,corrections:0,planning:0},{role:'moderator',guides:1,corrections:1,planning:1}]);
  assert.deepEqual({...database.prepare('SELECT guides,corrections,planning FROM staff_permissions WHERE discord_id=?').get('release-helper')},{guides:1,corrections:0,planning:0});
  // 0024 backfills the account type into board summaries, and later syncs keep it.
  const summaryMode=rsn=>database.prepare("SELECT json_extract(data,'$.accountMode') AS mode FROM journal_summaries WHERE rsn=?").get(rsn)?.mode??null;
  assert.equal(summaryMode('board gim'),'group_ironman');
  database.prepare('UPDATE journals SET data=?,revision=2 WHERE id=?').run(JSON.stringify({username:'Board GIM',accountMode:'hardcore_group_ironman',pets:[],log:null}),'board gim');
  assert.equal(summaryMode('board gim'),'hardcore_group_ironman');
  assert.equal(summaryMode('release test'),null);
  assert.equal(database.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(),[]);
  console.log(`${files.length} ordered migrations passed; pre-upgrade journal preserved.`);
}finally{database.close();}
