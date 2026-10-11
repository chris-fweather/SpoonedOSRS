-- Leaderboards show each player's account-type badge, so the board summary keeps the synced account type.
-- The summary triggers are rebuilt from 0017 with accountMode added; existing summaries are backfilled.
DROP TRIGGER IF EXISTS journal_summary_insert;
CREATE TRIGGER journal_summary_insert AFTER INSERT ON journals BEGIN
INSERT INTO journal_summaries(rsn,name,data,pets,log,xp,quest_points,combat) SELECT j.id,
COALESCE(json_extract(j.data,'$.username'),j.id),
json_object('username',json_extract(j.data,'$.username'),
'storageFormat',json_extract(j.data,'$.storageFormat'),
'accountMode',json_extract(j.data,'$.accountMode'),
'revision',j.revision,
'statsSyncedAt',json_extract(j.data,'$.statsSyncedAt'),
'logSyncedAt',json_extract(j.data,'$.logSyncedAt'),
'pets',json(COALESCE((SELECT json_group_array(json_object('id',json_extract(p.value,'$.id'),'name',json_extract(p.value,'$.name'),'obtained',json_extract(p.value,'$.obtained'),'methods',json('[]'))) FROM json_each(j.data,'$.pets') p),'[]')),
'hiscores',json(json_extract(j.data,'$.hiscores')),
'log',CASE WHEN json_type(j.data,'$.log')='object' THEN json_object('obtained',json_extract(j.data,'$.log.obtained'),'total',json_extract(j.data,'$.log.total'),'tabs',json('[]')) ELSE NULL END,
'profile',CASE WHEN json_type(j.data,'$.profile')='object' THEN json_object('syncedAt',json_extract(j.data,'$.profile.syncedAt'),'quests',json(COALESCE((SELECT json_group_array(json_object('state',json_extract(q.value,'$.state'),'points',json_extract(q.value,'$.points'))) FROM json_each(j.data,'$.profile.quests') q),'[]')),'diaries',json(COALESCE((SELECT json_group_array(json_object('tiers',json((SELECT json_group_array(json_object('completed',json_extract(t.value,'$.completed'),'total',json_extract(t.value,'$.total'))) FROM json_each(d.value,'$.tiers') t)))) FROM json_each(j.data,'$.profile.diaries') d),'[]')),'combat',json(COALESCE((SELECT json_group_array(json_object('completed',json_extract(c.value,'$.completed'),'total',json_extract(c.value,'$.total'))) FROM json_each(j.data,'$.profile.combat') c),'[]'))) ELSE NULL END),
(SELECT COUNT(*) FROM json_each(j.data,'$.pets') WHERE json_extract(value,'$.obtained')=1),
json_extract(j.data,'$.log.obtained'),
(SELECT json_extract(value,'$.xp') FROM json_each(j.data,'$.hiscores.skills') WHERE json_extract(value,'$.name')='Overall' LIMIT 1),
(SELECT SUM(CASE WHEN json_extract(value,'$.state')='finished' THEN json_extract(value,'$.points') ELSE 0 END) FROM json_each(j.data,'$.profile.quests')),
(SELECT SUM(json_extract(value,'$.completed')) FROM json_each(j.data,'$.profile.combat')) FROM journals j WHERE json_valid(j.data) AND j.id=NEW.id ON CONFLICT(rsn) DO UPDATE SET name=excluded.name,data=excluded.data,pets=excluded.pets,log=excluded.log,xp=excluded.xp,quest_points=excluded.quest_points,combat=excluded.combat;
END;
DROP TRIGGER IF EXISTS journal_summary_update;
CREATE TRIGGER journal_summary_update AFTER UPDATE OF data,revision ON journals BEGIN
INSERT INTO journal_summaries(rsn,name,data,pets,log,xp,quest_points,combat) SELECT j.id,
COALESCE(json_extract(j.data,'$.username'),j.id),
json_object('username',json_extract(j.data,'$.username'),
'storageFormat',json_extract(j.data,'$.storageFormat'),
'accountMode',json_extract(j.data,'$.accountMode'),
'revision',j.revision,
'statsSyncedAt',json_extract(j.data,'$.statsSyncedAt'),
'logSyncedAt',json_extract(j.data,'$.logSyncedAt'),
'pets',json(COALESCE((SELECT json_group_array(json_object('id',json_extract(p.value,'$.id'),'name',json_extract(p.value,'$.name'),'obtained',json_extract(p.value,'$.obtained'),'methods',json('[]'))) FROM json_each(j.data,'$.pets') p),'[]')),
'hiscores',json(json_extract(j.data,'$.hiscores')),
'log',CASE WHEN json_type(j.data,'$.log')='object' THEN json_object('obtained',json_extract(j.data,'$.log.obtained'),'total',json_extract(j.data,'$.log.total'),'tabs',json('[]')) ELSE NULL END,
'profile',CASE WHEN json_type(j.data,'$.profile')='object' THEN json_object('syncedAt',json_extract(j.data,'$.profile.syncedAt'),'quests',json(COALESCE((SELECT json_group_array(json_object('state',json_extract(q.value,'$.state'),'points',json_extract(q.value,'$.points'))) FROM json_each(j.data,'$.profile.quests') q),'[]')),'diaries',json(COALESCE((SELECT json_group_array(json_object('tiers',json((SELECT json_group_array(json_object('completed',json_extract(t.value,'$.completed'),'total',json_extract(t.value,'$.total'))) FROM json_each(d.value,'$.tiers') t)))) FROM json_each(j.data,'$.profile.diaries') d),'[]')),'combat',json(COALESCE((SELECT json_group_array(json_object('completed',json_extract(c.value,'$.completed'),'total',json_extract(c.value,'$.total'))) FROM json_each(j.data,'$.profile.combat') c),'[]'))) ELSE NULL END),
(SELECT COUNT(*) FROM json_each(j.data,'$.pets') WHERE json_extract(value,'$.obtained')=1),
json_extract(j.data,'$.log.obtained'),
(SELECT json_extract(value,'$.xp') FROM json_each(j.data,'$.hiscores.skills') WHERE json_extract(value,'$.name')='Overall' LIMIT 1),
(SELECT SUM(CASE WHEN json_extract(value,'$.state')='finished' THEN json_extract(value,'$.points') ELSE 0 END) FROM json_each(j.data,'$.profile.quests')),
(SELECT SUM(json_extract(value,'$.completed')) FROM json_each(j.data,'$.profile.combat')) FROM journals j WHERE json_valid(j.data) AND j.id=NEW.id ON CONFLICT(rsn) DO UPDATE SET name=excluded.name,data=excluded.data,pets=excluded.pets,log=excluded.log,xp=excluded.xp,quest_points=excluded.quest_points,combat=excluded.combat;
END;
UPDATE journal_summaries SET data=json_set(data,'$.accountMode',(SELECT json_extract(j.data,'$.accountMode') FROM journals j WHERE j.id=journal_summaries.rsn))
WHERE json_valid(data) AND EXISTS(SELECT 1 FROM journals j WHERE j.id=journal_summaries.rsn AND json_valid(j.data) AND json_extract(j.data,'$.accountMode') IS NOT NULL);
