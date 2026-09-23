import json
import tempfile
import threading
import unittest
from datetime import datetime, timedelta
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from backend.database import connect, snapshot, configure, export_snapshot
from backend.pipeline import collect
from backend.server import create_handler
from backend.sources import UTC, canonical_url, load_source, plain_text, iso

NOW = datetime(2026, 9, 20, 12, tzinfo=UTC)
SOURCE = {"id": "remotive", "name": "Remotive", "type": "remotive"}


def job(identifier=1, age=1, **extra):
    return {"id": identifier, "title": "Data Analyst", "company_name": "Test Co", "description": "<p>SQL and Python</p>",
            "url": "https://example.com/jobs/" + str(identifier), "candidate_required_location": "India",
            "publication_date": iso(NOW - timedelta(days=age)), **extra}


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "jobs.sqlite3"
        self.db = connect(self.path)

    def tearDown(self):
        self.db.close()
        self.temp.cleanup()

    def collect(self, rows, now=NOW, sources=None):
        return collect(self.db, sources or [SOURCE], now, lambda url: {"jobs": rows})

    def test_idempotency_preserves_first_seen_and_original_date(self):
        self.collect([job(), job()])
        self.collect([job(title="Senior Analyst", publication_date=iso(NOW))], NOW + timedelta(hours=6))
        rows = self.db.execute("SELECT * FROM jobs").fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["title"], "Senior Analyst")
        self.assertEqual(rows[0]["first_seen"], iso(NOW))
        self.assertEqual(rows[0]["posted_at"], job()["publication_date"])
        self.assertEqual(rows[0]["last_seen"], iso(NOW + timedelta(hours=6)))

    def test_age_archives_without_deleting_and_query_expires_between_runs(self):
        self.collect([job(1, age=31), job(2, age=29)])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM jobs").fetchone()[0], 2)
        self.assertEqual(len(snapshot(self.db, NOW)["jobs"]), 1)
        self.assertEqual(snapshot(self.db, NOW + timedelta(days=2))["jobs"], [])
        self.assertEqual(self.db.execute("SELECT status FROM jobs WHERE external_id='1'").fetchone()[0], "archived")

    def test_failed_source_does_not_mark_jobs_missing(self):
        self.collect([job()])
        def fail(url):
            raise URLError("offline")
        outcome = collect(self.db, [SOURCE], NOW + timedelta(hours=6), fail)
        self.assertEqual(outcome[0]["outcome"], "failed")
        self.assertEqual(self.db.execute("SELECT misses FROM jobs").fetchone()[0], 0)
        self.assertEqual(len(snapshot(self.db, NOW)["jobs"]), 1)
        self.assertIsNotNone(snapshot(self.db, NOW)["sources"][0]["error"])

    def test_two_successful_absences_unlist_and_return_reactivates(self):
        self.collect([job()])
        self.collect([], NOW + timedelta(hours=6))
        self.assertEqual(len(snapshot(self.db, NOW)["jobs"]), 1)
        self.collect([], NOW + timedelta(hours=12))
        self.assertEqual(snapshot(self.db, NOW)["jobs"], [])
        self.collect([job()], NOW + timedelta(hours=18))
        self.assertEqual(len(snapshot(self.db, NOW)["jobs"]), 1)
        self.assertEqual(self.db.execute("SELECT first_seen FROM jobs").fetchone()[0], iso(NOW))

    def test_partial_invalid_feed_never_unlists_and_bad_schema_fails(self):
        self.collect([job()])
        for hour in (6, 12):
            self.collect([job(2), {"invalid": True}], NOW + timedelta(hours=hour))
        self.assertEqual(len(snapshot(self.db, NOW)["jobs"]), 2)
        outcome = collect(self.db, [SOURCE], NOW + timedelta(hours=18), lambda url: {"error": "unavailable"})
        self.assertEqual(outcome[0]["outcome"], "failed")
        self.assertEqual(len(snapshot(self.db, NOW)["jobs"]), 2)

    def test_repeat_manual_runs_respect_provider_cooldown(self):
        self.collect([job()])
        def unexpected(url):
            self.fail("Should not refetch during cooldown")
        self.assertEqual(collect(self.db, [SOURCE], NOW + timedelta(hours=1), unexpected)[0]["outcome"], "skipped")

    def test_duplicate_urls_across_sources_are_deduplicated_in_public_feed(self):
        other = {**SOURCE, "id": "other", "name": "Another feed"}
        self.collect([job(url="https://example.com/jobs/1?utm_source=test")], sources=[SOURCE, other])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM jobs").fetchone()[0], 2)
        self.assertEqual(len(snapshot(self.db, NOW)["jobs"]), 1)

    def test_unknown_date_is_not_faked_and_archives_from_first_seen(self):
        greenhouse = {"id": "company", "name": "Company", "company": "Company", "type": "greenhouse", "board": "company"}
        rows = [{"id": 1, "title": "Engineer", "content": "SQL", "location": {"name": "India"},
                 "absolute_url": "https://example.com/job", "updated_at": iso(NOW)}]
        self.collect(rows, sources=[greenhouse])
        result = snapshot(self.db, NOW)["jobs"][0]
        self.assertIsNone(result["postedAt"])
        self.assertEqual(result["dateBasis"], "first_seen")
        self.collect(rows, NOW + timedelta(days=31), sources=[greenhouse])
        self.assertEqual(snapshot(self.db, NOW + timedelta(days=31))["jobs"], [])

    def test_export_and_database_reopen_keep_state(self):
        self.collect([job()])
        target = Path(self.temp.name) / "data/jobs.json"
        export_snapshot(self.db, target, NOW)
        self.assertEqual(json.loads(target.read_text())["version"], 1)
        self.db.close()
        self.db = connect(self.path)
        self.assertEqual(len(snapshot(self.db, NOW)["jobs"]), 1)
        self.assertFalse(target.with_suffix(".tmp").exists())

    def test_disabled_source_hidden_without_losing_history(self):
        self.collect([job()])
        configure(self.db, [{**SOURCE, "enabled": False}])
        self.assertEqual(snapshot(self.db, NOW)["jobs"], [])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM jobs").fetchone()[0], 1)


class AdapterTests(unittest.TestCase):
    def test_html_tracking_and_identifier_preservation(self):
        self.assertEqual(plain_text('&lt;p&gt;SQL&lt;/p&gt;<script>secret()</script>'), 'SQL')
        self.assertEqual(canonical_url('https://example.com/careers/?gh_jid=12&utm_source=x#part'),
                         'https://example.com/careers?gh_jid=12')
        with self.assertRaises(ValueError):
            canonical_url('javascript:alert(1)')

    def test_ashby_maps_last_published_and_excludes_unlisted(self):
        source = {"id": "ashby", "name": "Company", "company": "Company", "type": "ashby", "board": "demo"}
        row = {"id": "a", "title": "Engineer", "descriptionPlain": "SQL", "jobUrl": "https://example.com/a", "publishedAt": iso(NOW)}
        jobs, rejected = load_source(source, NOW, lambda url: {"jobs": [row, {**row, "id": "b", "isListed": False}]})
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["date_basis"], "last_published")
        self.assertEqual(rejected, 0)

    def test_count_mismatch_and_future_dates_fail(self):
        with self.assertRaises(ValueError):
            load_source(SOURCE, NOW, lambda url: {"jobs": [job()], "meta": {"total": 2}})
        with self.assertRaises(ValueError):
            load_source(SOURCE, NOW, lambda url: {"jobs": [job(age=-1)]})


class ServerTests(unittest.TestCase):
    def test_api_filters_and_private_files_are_not_served(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "jobs.sqlite3"
            db = connect(path)
            collect(db, [SOURCE], datetime.now(UTC), lambda url: {"jobs": [job(publication_date=iso(datetime.now(UTC)))]})
            db.close()
            server = ThreadingHTTPServer(('127.0.0.1', 0), create_handler(path))
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            base = 'http://127.0.0.1:' + str(server.server_port)
            try:
                with urlopen(base + '/api/jobs?q=analyst&location=India&days=7') as response:
                    self.assertEqual(len(json.load(response)['jobs']), 1)
                with urlopen(base + '/api/status') as response:
                    self.assertEqual(json.load(response)['activeJobs'], 1)
                for route, status in [('/api/jobs?days=999', 400), ('/var/jobs.sqlite3', 404),
                                      ('/src/../backend/sources.json', 404), ('/.git/config', 404), ('/README.md', 404)]:
                    with self.assertRaises(HTTPError) as error:
                        urlopen(base + route)
                    self.assertEqual(error.exception.code, status)
            finally:
                server.shutdown()
                server.server_close()
                worker.join()


if __name__ == '__main__':
    unittest.main()
