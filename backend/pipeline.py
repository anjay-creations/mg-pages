"""python3 -m backend.pipeline [--loop]: collect, archive, then atomically export."""
import argparse
import fcntl
import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from .database import DEFAULT_DB, connect, configure, ingest, archive, export_snapshot
from .sources import UTC, iso, parse_date, load_source, fetch_json, source_url

ROOT = Path(__file__).resolve().parents[1]
LOG = logging.getLogger("jobs")


def read_config(path):
    sources = json.loads(Path(path).read_text())["sources"]
    identifiers = set()
    for source in sources:
        if not source.get("id") or source["id"] in identifiers or not source.get("name"):
            raise ValueError("Source IDs must be present and unique; names are required")
        source_url(source)
        identifiers.add(source["id"])
    return sources


def error_message(exc):
    # Store operational errors, never response bodies, secrets or full request URLs.
    if isinstance(exc, HTTPError):
        return "Provider returned HTTP " + str(exc.code)
    if isinstance(exc, (URLError, TimeoutError, OSError)):
        return "Provider network request failed; previous listings retained"
    return str(exc)[:180] if isinstance(exc, ValueError) else "Collection failed; see worker logs"


def collect(db, sources, now=None, fetcher=fetch_json):
    now = now or datetime.now(UTC)
    configure(db, sources)
    outcomes = []
    for source in sources:
        if not source.get("enabled", True):
            continue
        prior = db.execute("SELECT last_attempt FROM sources WHERE id=?", (source["id"],)).fetchone()[0]
        # Applies to manual runs and failed attempts too, to avoid hitting provider limits.
        if prior and now - parse_date(prior) < timedelta(hours=6):
            outcomes.append({"source": source["id"], "outcome": "skipped"})
            continue
        with db:
            db.execute("UPDATE sources SET last_attempt=? WHERE id=?", (iso(now), source["id"]))
        count, rejected, error = 0, 0, None
        try:
            jobs, rejected = load_source(source, now, fetcher)
            ingest(db, source, jobs, now, rejected)
            count, outcome = len(jobs), "partial" if rejected else "success"
        except Exception as exc:
            error, outcome = error_message(exc), "failed"
            LOG.warning("%s: %s", source["id"], error)
            with db:
                db.execute("UPDATE sources SET error=? WHERE id=?", (error, source["id"]))
        with db:
            db.execute("""INSERT INTO runs(source_id,started_at,finished_at,outcome,received,rejected,error)
                VALUES(?,?,?,?,?,?,?)""", (source["id"], iso(now), iso(datetime.now(UTC)), outcome, count, rejected, error))
        outcomes.append({"source": source["id"], "outcome": outcome, "received": count, "rejected": rejected})
    archive(db, now)
    return outcomes


def run_once(db_path, config, output):
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    with open(str(db_path) + ".lock", "w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            LOG.info("Another collector is running")
            return []
        db = connect(db_path)
        try:
            outcomes = collect(db, read_config(config))
            export_snapshot(db, output)
            return outcomes
        finally:
            db.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--config", type=Path, default=ROOT / "backend/sources.json")
    parser.add_argument("--output", type=Path, default=ROOT / "data/jobs.json")
    parser.add_argument("--loop", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    while True:
        outcomes = run_once(args.db, args.config, args.output)
        print(json.dumps(outcomes), flush=True)
        if not args.loop:
            # Export and persist healthy older results even when one source fails.
            return 1 if any(o["outcome"] == "failed" for o in outcomes) else 0
        time.sleep(6 * 60 * 60)


if __name__ == "__main__":
    raise SystemExit(main())
