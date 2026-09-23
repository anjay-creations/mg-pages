"""Local website and read-only jobs API. Collection runs separately."""
import argparse
import json
import mimetypes
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qs
from .database import DEFAULT_DB, connect, snapshot
from .sources import UTC, parse_date

ROOT = Path(__file__).resolve().parents[1]


def create_handler(db_path=DEFAULT_DB, root=ROOT):
    class Handler(BaseHTTPRequestHandler):
        def send_body(self, status, body, mime):
            self.send_response(status)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)

        def do_HEAD(self):
            self.do_GET()

        def do_GET(self):
            request = urlsplit(self.path)
            path = unquote(request.path)
            if path in ("/api/jobs", "/api/status"):
                db = connect(db_path)
                try:
                    data = snapshot(db)
                finally:
                    db.close()
                if path == "/api/status":
                    data["activeJobs"] = len(data.pop("jobs"))
                else:
                    query = parse_qs(request.query)
                    def value(key):
                        return query.get(key, [""])[0]
                    if value("days"):
                        try:
                            days = int(value("days"))
                            if not 1 <= days <= 30:
                                raise ValueError()
                        except ValueError:
                            self.send_body(400, b'{"error":"days must be between 1 and 30"}', "application/json")
                            return
                        cutoff = datetime.now(UTC) - timedelta(days=days)
                        data["jobs"] = [j for j in data["jobs"] if j["postedAt"] and parse_date(j["postedAt"]) >= cutoff]
                    for key, fields in (("q", ("title", "description")), ("location", ("location",)), ("source", ("sourceId",))):
                        term = value(key).lower()
                        if term:
                            data["jobs"] = [j for j in data["jobs"] if term in " ".join(j[f] for f in fields).lower()]
                self.send_body(200, json.dumps(data, ensure_ascii=False).encode(), "application/json; charset=utf-8")
                return
            # Explicit public asset allowlist: never expose SQLite, config, git or personal files.
            relative = path.lstrip("/") or "index.html"
            if relative not in ("index.html", "CNAME", "extension.zip", "data/jobs.json") and not relative.startswith("src/"):
                self.send_error(404)
                return
            candidate = (root / relative).resolve()
            if root not in candidate.parents or not candidate.is_file():
                self.send_error(404)
                return
            if relative.startswith("src/") and (root / "src").resolve() not in candidate.parents:
                self.send_error(404)
                return
            mime = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
            if candidate.suffix in (".js", ".mjs"):
                mime = "text/javascript"
            self.send_body(200, candidate.read_bytes(), mime)

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5173)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), create_handler(args.db))
    print("Website and jobs API: http://%s:%s" % (args.host, args.port), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
