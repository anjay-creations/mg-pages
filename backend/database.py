"""Durable ingestion state and read-only public job snapshots."""
import hashlib
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from .sources import UTC, iso

DEFAULT_DB = Path(__file__).resolve().parents[1] / "var" / "jobs.sqlite3"


def connect(path=DEFAULT_DB):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(str(path), timeout=30)
    db.row_factory = sqlite3.Row
    db.executescript("""
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
        last_attempt TEXT, last_success TEXT, error TEXT, count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id),
        external_id TEXT NOT NULL, title TEXT NOT NULL, company TEXT NOT NULL,
        location TEXT NOT NULL, description TEXT NOT NULL, url TEXT NOT NULL,
        posted_at TEXT, date_basis TEXT NOT NULL, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active', misses INTEGER NOT NULL DEFAULT 0,
        UNIQUE(source_id, external_id)
      );
      CREATE INDEX IF NOT EXISTS jobs_status_date ON jobs(status, posted_at);
      CREATE INDEX IF NOT EXISTS jobs_url ON jobs(url);
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id),
        started_at TEXT NOT NULL, finished_at TEXT NOT NULL, outcome TEXT NOT NULL,
        received INTEGER NOT NULL DEFAULT 0, rejected INTEGER NOT NULL DEFAULT 0, error TEXT
      );
      PRAGMA user_version = 1;
    """)
    return db


def configure(db, sources):
    with db:
        db.execute("UPDATE sources SET enabled=0")
        for source in sources:
            db.execute("""INSERT INTO sources(id,name,enabled) VALUES(?,?,?)
                ON CONFLICT(id) DO UPDATE SET name=excluded.name,enabled=excluded.enabled""",
                       (source["id"], source["name"], int(source.get("enabled", True))))


def ingest(db, source, jobs, now, rejected=0):
    stamp = iso(now)
    # Source transaction: a crash rolls back the entire update, including missing counts.
    with db:
        seen = set()
        for job in jobs:
            external_id = job["external_id"]
            if external_id in seen:
                continue
            seen.add(external_id)
            job_id = hashlib.sha256((source["id"] + ":" + external_id).encode()).hexdigest()[:24]
            db.execute("""INSERT INTO jobs
              (id,source_id,external_id,title,company,location,description,url,posted_at,date_basis,first_seen,last_seen)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(source_id,external_id) DO UPDATE SET
                title=excluded.title,company=excluded.company,location=excluded.location,
                description=excluded.description,url=excluded.url,
                posted_at=CASE WHEN jobs.posted_at IS NULL THEN excluded.posted_at
                  WHEN excluded.posted_at IS NULL THEN jobs.posted_at
                  ELSE MIN(jobs.posted_at,excluded.posted_at) END,
                date_basis=CASE WHEN jobs.posted_at IS NULL THEN excluded.date_basis ELSE jobs.date_basis END,
                last_seen=excluded.last_seen,misses=0,status='active'""",
                       (job_id, source["id"], external_id, job["title"], job["company"], job["location"],
                        job["description"], job["url"], job["posted_at"], job["date_basis"], stamp, stamp))
        if not rejected:
            for row in db.execute("SELECT id,external_id FROM jobs WHERE source_id=?", (source["id"],)).fetchall():
                if row["external_id"] not in seen:
                    db.execute("""UPDATE jobs SET misses=misses+1,
                        status=CASE WHEN misses+1>=2 AND status!='archived' THEN 'unlisted' ELSE status END
                        WHERE id=?""", (row["id"],))
        db.execute("UPDATE sources SET last_success=?,error=?,count=? WHERE id=?",
                   (stamp, (str(rejected) + " invalid rows skipped; missing-job checks paused") if rejected else None,
                    len(seen), source["id"]))


def archive(db, now):
    cutoff = iso(now - timedelta(days=30))
    with db:
        db.execute("UPDATE jobs SET status='archived' WHERE COALESCE(posted_at,first_seen)<?", (cutoff,))


def snapshot(db, now=None):
    now = now or datetime.now(UTC)
    cutoff = iso(now - timedelta(days=30))
    rows = db.execute("""SELECT j.*,s.name AS source_name FROM jobs j JOIN sources s ON s.id=j.source_id
        WHERE s.enabled=1 AND j.status='active' AND COALESCE(j.posted_at,j.first_seen)>=?
        ORDER BY COALESCE(j.posted_at,j.first_seen) DESC,j.last_seen DESC,j.id""", (cutoff,)).fetchall()
    jobs, urls = [], set()
    for row in rows:
        if row["url"] in urls:
            continue
        urls.add(row["url"])
        jobs.append({"id": row["id"], "title": row["title"], "company": row["company"],
                     "location": row["location"], "description": row["description"], "url": row["url"],
                     "postedAt": row["posted_at"], "dateBasis": row["date_basis"],
                     "firstSeenAt": row["first_seen"], "lastSeenAt": row["last_seen"],
                     "source": row["source_name"], "sourceId": row["source_id"], "status": "active"})
    sources = [dict(row) for row in db.execute("SELECT * FROM sources WHERE enabled=1 ORDER BY id")]
    runs = [dict(row) for row in db.execute("SELECT * FROM runs ORDER BY id DESC LIMIT 30")]
    successes = [s["last_success"] for s in sources if s["last_success"]]
    return {"version": 1, "generatedAt": iso(now), "lastSuccessfulCollection": max(successes, default=None),
            "retentionDays": 30, "intervalHours": 6, "jobs": jobs, "sources": sources, "recentRuns": runs}


def export_snapshot(db, destination, now=None):
    path = Path(destination)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(snapshot(db, now), ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)
