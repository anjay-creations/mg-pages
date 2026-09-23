"""Restore the latest collector database artifact on the trusted default branch."""
import io
import json
import os
import sqlite3
import zipfile
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, HTTPRedirectHandler, build_opener


class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected and urlsplit(req.full_url).netloc != urlsplit(newurl).netloc:
            redirected.remove_header("Authorization")
        return redirected


def main():
    repository = os.environ["GITHUB_REPOSITORY"]
    token = os.environ["GH_TOKEN"]
    branch = os.environ.get("DEFAULT_BRANCH", "main")
    api = "https://api.github.com/repos/" + repository

    def get(url):
        with build_opener(SafeRedirect()).open(Request(url, headers={"Authorization": "Bearer " + token,
                     "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}), timeout=60) as response:
            return response.read()

    artifacts = json.loads(get(api + "/actions/artifacts?name=job-database&per_page=100"))["artifacts"]
    eligible = sorted((a for a in artifacts if not a["expired"] and
                      a.get("workflow_run", {}).get("head_branch") == branch), key=lambda a: a["id"], reverse=True)
    if not eligible:
        print("No prior database artifact; starting the first collection.")
        return
    artifact_id = eligible[0]["id"]
    payload = get(api + "/actions/artifacts/" + str(artifact_id) + "/zip")
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        info = archive.getinfo("jobs.sqlite3")
        if info.file_size > 500 * 1024 * 1024:
            raise ValueError("Database artifact exceeds size limit")
        path = Path("var/jobs.sqlite3")
        path.parent.mkdir(exist_ok=True)
        path.write_bytes(archive.read(info))
    with sqlite3.connect(str(path)) as db:
        if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("Restored database failed integrity check")
    print("Restored job database artifact", artifact_id)


if __name__ == "__main__":
    main()
