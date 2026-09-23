"""Read public job feeds; never scrape logged-in job boards or application data."""
import html
import json
import re
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit, quote
from urllib.request import Request, urlopen

UTC = timezone.utc
MAX_BYTES = 30 * 1024 * 1024


def iso(value):
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_date(value):
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)
    except ValueError:
        return None


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.hidden += 1
        if tag in ("p", "br", "li", "div", "h1", "h2", "h3"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def plain_text(value):
    parser = PlainText()
    parser.feed(html.unescape(html.unescape(str(value or ""))))
    return re.sub(r"[ \t]+", " ", "".join(parser.parts)).strip()[:50000]


def canonical_url(value):
    try:
        url = urlsplit(str(value))
        if url.scheme != "https" or not url.hostname or url.username or url.password:
            raise ValueError("Expected a public HTTPS job URL")
        # Preserve job identifiers (including gh_jid); remove only known tracking fields.
        query = [(k, v) for k, v in parse_qsl(url.query, keep_blank_values=True)
                 if not k.lower().startswith("utm_") and k.lower() not in ("source", "ref", "referrer")]
        return urlunsplit(("https", url.netloc.lower(), url.path.rstrip("/") or "/", urlencode(sorted(query)), ""))
    except (ValueError, TypeError) as exc:
        raise ValueError("Invalid job URL") from exc


def fetch_json(url):
    for attempt in range(3):
        try:
            request = Request(url, headers={"User-Agent": "AI-Gyaan-Job-Pipeline/1.0", "Accept": "application/json"})
            with urlopen(request, timeout=30) as response:
                raw = response.read(MAX_BYTES + 1)
                if len(raw) > MAX_BYTES:
                    raise ValueError("Feed exceeded the size limit")
                return json.loads(raw)
        except HTTPError as exc:
            if exc.code == 429 or exc.code < 500 or attempt == 2:
                raise
        except (URLError, TimeoutError):
            if attempt == 2:
                raise
        time.sleep(2 ** attempt)


def source_url(source):
    kind = source["type"]
    if kind == "remotive":
        return "https://remotive.com/api/remote-jobs"
    board = source.get("board", "")
    if not re.fullmatch(r"[A-Za-z0-9_-]+", board):
        raise ValueError("A valid company board slug is required")
    if kind == "greenhouse":
        return "https://boards-api.greenhouse.io/v1/boards/" + quote(board) + "/jobs?content=true"
    if kind == "ashby":
        return "https://api.ashbyhq.com/posting-api/job-board/" + quote(board)
    raise ValueError("Unsupported source type")


def load_source(source, now, fetcher=fetch_json):
    payload = fetcher(source_url(source))
    if not isinstance(payload, dict) or not isinstance(payload.get("jobs"), list):
        raise ValueError("Feed did not contain a complete jobs array")
    rows = payload["jobs"]
    total = payload.get("meta", {}).get("total", len(rows))
    if total != len(rows):
        raise ValueError("Incomplete feed: job count does not match")
    jobs, rejected = [], 0
    for row in rows:
        try:
            if not isinstance(row, dict):
                raise ValueError("Invalid job")
            kind = source["type"]
            if kind == "remotive":
                title, company, location = row.get("title"), row.get("company_name"), row.get("candidate_required_location")
                url, description, posted = row.get("url"), row.get("description"), row.get("publication_date")
                basis = "published"
            elif kind == "greenhouse":
                title, company = row.get("title"), source.get("company")
                location = (row.get("location") or {}).get("name", "")
                url, description, posted = row.get("absolute_url"), row.get("content"), row.get("first_published")
                basis = "published"
            else:
                if row.get("isListed") is False:
                    continue
                title, company, location = row.get("title"), source.get("company"), row.get("location")
                url = row.get("jobUrl") or row.get("applyUrl")
                description = row.get("descriptionPlain") or row.get("descriptionHtml")
                posted, basis = row.get("publishedAt"), "last_published"
            posted_at = parse_date(posted)
            if posted and (posted_at is None or posted_at > now):
                raise ValueError("Invalid publication date")
            if not title or not company or not description:
                raise ValueError("Incomplete job")
            url = canonical_url(url)
            external_id = str(row.get("id") or url)
            jobs.append({"external_id": external_id, "title": plain_text(title), "company": plain_text(company),
                         "location": plain_text(location), "url": url, "description": plain_text(description),
                         "posted_at": iso(posted_at) if posted_at else None,
                         "date_basis": basis if posted_at else "first_seen"})
        except (ValueError, AttributeError, TypeError):
            rejected += 1
    if rows and not jobs:
        raise ValueError("No valid jobs in a non-empty feed")
    # A partially invalid response can update known jobs, but must not close missing jobs.
    return jobs, rejected
