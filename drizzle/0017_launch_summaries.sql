-- Slim derived records; triggers keep every write path and administrative update consistent.
CREATE TABLE journal_summaries (rsn TEXT PRIMARY KEY,name TEXT NOT NULL,data TEXT NOT NULL,pets INTEGER NOT NULL DEFAULT 0,log INTEGER,xp INTEGER,quest_points INTEGER,combat INTEGER);
CREATE INDEX journal_summaries_pets ON journal_summaries(pets DESC,rsn);
CREATE INDEX journal_summaries_log ON journal_summaries(log DESC,rsn);
CREATE INDEX journal_summaries_xp ON journal_summaries(xp DESC,rsn);
CREATE INDEX journal_summaries_quests ON journal_summaries(quest_points DESC,rsn);
CREATE INDEX journal_summaries_combat ON journal_summaries(combat DESC,rsn);
INSERT INTO journal_summaries(rsn,name,data,pets,log,xp,quest_points,combat) SELECT j.id,
COALESCE(json_extract(j.data,'$.username'),j.id),
json_object('username',json_extract(j.data,'$.username'),
'storageFormat',json_extract(j.data,'$.storageFormat'),
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
(SELECT SUM(json_extract(value,'$.completed')) FROM json_each(j.data,'$.profile.combat')) FROM journals j WHERE json_valid(j.data);
CREATE TRIGGER journal_summary_insert AFTER INSERT ON journals BEGIN
INSERT INTO journal_summaries(rsn,name,data,pets,log,xp,quest_points,combat) SELECT j.id,
COALESCE(json_extract(j.data,'$.username'),j.id),
json_object('username',json_extract(j.data,'$.username'),
'storageFormat',json_extract(j.data,'$.storageFormat'),
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
CREATE TRIGGER journal_summary_update AFTER UPDATE OF data,revision ON journals BEGIN
INSERT INTO journal_summaries(rsn,name,data,pets,log,xp,quest_points,combat) SELECT j.id,
COALESCE(json_extract(j.data,'$.username'),j.id),
json_object('username',json_extract(j.data,'$.username'),
'storageFormat',json_extract(j.data,'$.storageFormat'),
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
CREATE TRIGGER journal_summary_delete AFTER DELETE ON journals BEGIN DELETE FROM journal_summaries WHERE rsn=OLD.id; END;
CREATE TABLE request_budgets (id TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL);
CREATE INDEX request_budgets_window ON request_budgets(window);
CREATE TABLE sync_locks (rsn TEXT PRIMARY KEY,token TEXT NOT NULL,expires INTEGER NOT NULL,next_allowed INTEGER NOT NULL);

-- A one-row version lets each cached public response recheck privacy before reuse.
CREATE TABLE board_revision(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL);
INSERT INTO board_revision VALUES(1,0);
CREATE TRIGGER board_version_journal_summaries_insert AFTER INSERT ON journal_summaries BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_journal_summaries_update AFTER UPDATE ON journal_summaries BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_journal_summaries_delete AFTER DELETE ON journal_summaries BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_claimed_names_insert AFTER INSERT ON claimed_names BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_claimed_names_update AFTER UPDATE ON claimed_names BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_claimed_names_delete AFTER DELETE ON claimed_names BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_visibility_insert AFTER INSERT ON profile_visibility BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_visibility_update AFTER UPDATE ON profile_visibility BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_visibility_delete AFTER DELETE ON profile_visibility BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_options_insert AFTER INSERT ON profile_options BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_options_update AFTER UPDATE ON profile_options BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_options_delete AFTER DELETE ON profile_options BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_presentation_insert AFTER INSERT ON profile_presentation BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_presentation_update AFTER UPDATE ON profile_presentation BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_presentation_delete AFTER DELETE ON profile_presentation BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_users_insert AFTER INSERT ON users BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_users_update AFTER UPDATE ON users BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_users_delete AFTER DELETE ON users BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_supporter_totals_insert AFTER INSERT ON supporter_totals BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_supporter_totals_update AFTER UPDATE ON supporter_totals BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_supporter_totals_delete AFTER DELETE ON supporter_totals BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_supporter_totals_insert AFTER INSERT ON profile_supporter_totals BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_supporter_totals_update AFTER UPDATE ON profile_supporter_totals BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_supporter_totals_delete AFTER DELETE ON profile_supporter_totals BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_staff_members_insert AFTER INSERT ON staff_members BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_staff_members_update AFTER UPDATE ON staff_members BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_staff_members_delete AFTER DELETE ON staff_members BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_link_owners_insert AFTER INSERT ON profile_link_owners BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_link_owners_update AFTER UPDATE ON profile_link_owners BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_link_owners_delete AFTER DELETE ON profile_link_owners BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_appearance_insert AFTER INSERT ON profile_appearance BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_appearance_update AFTER UPDATE ON profile_appearance BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_appearance_delete AFTER DELETE ON profile_appearance BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
