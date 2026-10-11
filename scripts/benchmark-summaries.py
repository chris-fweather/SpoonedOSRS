"""Disposable synthetic SQLite benchmark; never connects to the live site or providers."""
import json
import sqlite3
import statistics
import tempfile
import time
from pathlib import Path

with tempfile.TemporaryDirectory(prefix='spooned-summary-') as scratch:
    db = sqlite3.connect(Path(scratch) / 'benchmark.sqlite')
    db.execute('CREATE TABLE journals(id TEXT PRIMARY KEY,data TEXT NOT NULL,revision INTEGER NOT NULL)')
    for i in range(5000):
        journal = {
            'username': f'Test{i:05}', 'revision': 0,
            'statsSyncedAt': '2026-10-06T00:00:00Z', 'logSyncedAt': '2026-10-06T00:00:00Z',
            'pets': [{'id': str(p), 'name': f'Pet{p}', 'obtained': p < i % 72, 'methods': []} for p in range(71)],
            'hiscores': {'skills': [{'name': 'Overall', 'level': 100, 'xp': i * 1000, 'rank': i + 1}], 'activities': []},
            'log': {'obtained': i % 1718, 'total': 1717, 'tabs': [{'name': 'Synthetic', 'pages': [{'name': 'Test', 'items': [{'id': n, 'name': f'Item{n}', 'obtained': n < i % 1718, 'quantity': 1} for n in range(1717)]}]}]},
        }
        db.execute('INSERT INTO journals VALUES(?,?,0)', (journal['username'].lower(), json.dumps(journal)))
    db.commit()
    started = time.perf_counter()
    db.executescript(Path('drizzle/0017_launch_summaries.sql').read_text().split('-- A one-row version')[0])
    backfill = time.perf_counter() - started
    raw_bytes = db.execute('SELECT SUM(length(data)) FROM journals').fetchone()[0]
    summary_bytes = db.execute('SELECT SUM(length(data)) FROM journal_summaries').fetchone()[0]
    timings = []
    for _ in range(30):
        started = time.perf_counter()
        rows = db.execute('SELECT rsn,log FROM journal_summaries ORDER BY log DESC,rsn LIMIT 10').fetchall()
        timings.append((time.perf_counter() - started) * 1000)
        assert len(rows) == 10
    # Verify the same outer UPSERT used by saveJournal refreshes the derived row.
    data = json.loads(db.execute('SELECT data FROM journals WHERE id=?', ('test00000',)).fetchone()[0])
    data['log']['obtained'] = 1700
    db.execute('INSERT INTO journals VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=journals.revision+1 WHERE journals.revision=?', ('test00000', json.dumps(data), 0))
    assert db.execute('SELECT log FROM journal_summaries WHERE rsn=?', ('test00000',)).fetchone()[0] == 1700
    print(json.dumps({'syntheticJournals': 5000, 'rawBytes': raw_bytes, 'summaryBytes': summary_bytes, 'reductionPercent': round(100 * (1 - summary_bytes / raw_bytes), 1), 'backfillSeconds': round(backfill, 2), 'indexedPageP50Ms': round(statistics.median(timings), 3), 'indexedPageP95Ms': round(sorted(timings)[28], 3), 'queryPlan': db.execute('EXPLAIN QUERY PLAN SELECT rsn,log FROM journal_summaries ORDER BY log DESC,rsn LIMIT 10').fetchall(), 'scope': 'Local SQLite index microbenchmark only, not D1 capacity or end-to-end latency.'}, indent=2))
