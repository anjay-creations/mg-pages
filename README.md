# AI Gyaan

A career workspace with a Python/SQLite job collection pipeline, job matching, application assistance, interview preparation, and resume building. SQLite WebAssembly is vendored locally for real in-browser SQL practice.

## Run

Requires Python 3.9+ and Node 22+ for tests. The backend uses only Python's standard library.

```bash
npm run jobs:collect  # Fetch enabled sources and persist jobs
npm run dev           # Website + read-only jobs API at http://127.0.0.1:5173
```

For a different port: `python3 -m backend.server --port 5175`. In a second terminal, run `npm run jobs:watch` to keep collecting every six hours while the process remains running. Do not run a local worker and the GitHub collector against a shared database. The local database is `var/jobs.sqlite3`; the public snapshot is `data/jobs.json`. Both are generated and ignored by Git.

## Deploy

GitHub Actions collects jobs and deploys a public snapshot on pushes to `main`, manual dispatch, and a six-hour schedule (`17 */6 * * *`, UTC). Push the changes to the repository's default branch to activate it. No external API keys are needed for the three default sources.

The workflow restores the most recent `job-database` artifact, updates SQLite, uploads a fresh database backup, builds `dist/`, and deploys only public assets. A source failure still publishes preserved results and visible source-health details, then marks the run failed. Artifact restore failures stop the workflow rather than silently discard history. Keep Actions enabled and artifact retention available. Artifacts are rolling seven-day backups containing the complete retained database, not a hosted database service; if all backups expire after a long inactive period, the next run starts fresh. For production with stronger durability, run the same collector on a host with a persistent volume and independent database backups.

The six-hour provider cooldown also applies to manual runs. GitHub schedules are best effort and may be delayed; a run within the cooldown skips fetching that source. See [GitHub's scheduling behaviour](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

In GitHub, set:

```txt
Settings → Pages → Source → GitHub Actions
Custom domain → maigyaan.in
```

## What is implemented

- AI Search chat surface with a recruitment-specialist prompt, top 3 references, and a boundary response for non-career questions.
- Tagging answers into Tagged Gyaan.
- Optional chat saving with a visible 24-hour expiry timer.
- Find Locks accepts pasted resume text or a `.txt` upload, recommends three matching roles, and links directly to each suggested role on LinkedIn, Naukri, and Foundit. PDF/DOC extraction still needs a document-processing backend.
- Daily application keys: each applier gets 20 keys per day, shown in the top navigation.
- Apply interaction: every job search card has a lock symbol; applying inserts the key, rotates the lock 90 degrees, decrements the daily key count, then opens the job search.
- Profile button in the top navigation opens a right-side profile/settings drawer with configuration-ready Google and LinkedIn login entry points.
- Top-brand career page shortcuts for Google, Microsoft, JP Morgan, Morgan Stanley, Wells Fargo, Amazon, and Flipkart.
- Focus section with a flickering candle while the timer runs, an honest completion flow, and a local mind backlog (latest 10 plus archive and deletion).
- Code Practice workspace with a real SQLite WebAssembly database containing customers, orders, order items, and products, plus local Python/PySpark practice subsets and a sandboxed HTML preview.
- Standalone Resume Builder screen for future resume parsing, missing-detail review, ATS drafting, and recruiter keyword guidance.
- Create Locks workflow for hirers/problem owners.

The current AI answer synthesis and reranking are still local prototype logic in `src/app.js`. Replace `runAiSearch` and `rerankSources` with backend API calls when live search, reranking, and LLM providers are connected.

## OAuth configuration

Google and LinkedIn login require registered OAuth applications and server-side callback handling. Set `aigyaan-google-auth-url` and `aigyaan-linkedin-auth-url` in `index.html` to your hosted authentication start routes. The browser app appends a `returnTo` query parameter. Provider secrets and token exchange must not be placed in this static repository.

## Career workspace and application companion

The default screen reads the collected jobs API (or the published Pages snapshot), shows source health, and includes date/source/location/match filters, a JSON importer, missing-skill evidence, saved application stages, and editable cover letters. “Prepare application” selects the actual job requirements; “Prepare CV for this role” carries those requirements and your CV text into the existing builder. Light/dark mode follows the system initially and remembers the selected mode. Interview Studio includes original guides and interactive quizzes for six roles; it does not scrape third-party preparation content.

**Coverage:** The enabled sources in `backend/sources.json` are Remotive, Stripe's Greenhouse career board, and Ashby's own Ashby career board. Add company board slugs to enable more companies using either adapter. These are specific connected sources, not a complete market-wide search. LinkedIn, Naukri, Monster, Foundit, Cutshort, GetSmart and Indeed remain external search shortcuts, not live adapters. Semantic LLM matching and automatic submissions are not implemented. The current deterministic skill percentage is not an ATS score or hiring probability.

Provider references: [Remotive](https://github.com/remotive-com/remote-jobs-api) (24-hour listing delay), [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html), and [Ashby public postings](https://developers.ashbyhq.com/docs/public-job-posting-api). The browser never calls these providers directly or uploads the CV; collection happens once for all visitors.

Custom job feeds can use this schema:

```json
{"jobs":[{"title":"Data Analyst","company":"Example","location":"India","description":"SQL and Python","postedAt":"2026-09-20T08:00:00Z","url":"https://example.com/careers/analyst","source":"Company careers"}]}
```

Only HTTPS job links are accepted. Supplied publication dates must be valid and non-future. Missing publication dates stay unknown and appear only when “Include roles with an unknown posting date” is selected. Such jobs show their first-discovered date explicitly. Invalid entries are omitted; results are sorted newest first. No fake vacancies are seeded. Network failures display an actionable error. CV input supports plain text; PDF/DOCX parsing remains unavailable. Cover letters contain an explicit achievement placeholder for the candidate to complete.

Application Passport stores editable answers in browser localStorage. Personal details are not seeded in public source. Export JSON and import it into the extension, which stores answers in chrome.storage.local. Both provide deletion controls. These stores are device-local, not encrypted vaults or account sync; exports contain the entered personal details.

Download `extension.zip` from Application Passport, unzip, and load the folder via Chrome's `chrome://extensions` → Developer mode → Load unpacked. Alternatively load the repository's `extension/` folder directly. The [Chrome side panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) opens from the toolbar icon. Import the profile, then invoke the extension on the application tab. It uses activeTab access instead of permanent access to every site. One click fills recognised blank native inputs and selects, dispatching input/change events. Optional automatic mode observes new fields on that page. It does not advance, submit, overwrite answers, guess employment history, or fill declarations. Custom widgets, Google Forms custom controls, cross-origin frames and protected pages may require copying from the visible answers. Browser panel placement follows Chrome's side-panel preference.

Run `npm test` for matching, filtering, feed validation and simulated extension-field tests. Chrome integration must also be checked manually on the target application forms. Package extension changes with `zip -j extension.zip extension/*`.


## Collection lifecycle

- Each provider job ID has one durable record. Repeated runs update details and last-seen time without resetting first-seen or moving the original recorded publication date forward.
- Known tracking parameters are removed from URLs while application identifiers are retained. The public feed deduplicates identical canonical URLs across sources. Different URLs are not assumed to represent the same vacancy.
- Jobs older than 30 days are archived, not deleted. Where no posting date exists, the first-seen date controls archive age. Ashby's date is labelled “last published”, reflecting its provider field. Updating a description does not renew a job's age.
- A job absent from two successful complete feed responses becomes `unlisted`, meaning it is no longer listed by that source; this is not a claim that the position was filled. Reappearing jobs are reactivated only if still within the age limit.
- Timeouts, invalid response schemas, incomplete counts and rate limits retain old listings. Partially invalid responses update valid jobs but suspend missing-job checks. Age-based archival still proceeds even during source outages.
- Each source attempt is recorded with outcome, counts, time and a sanitised error. Retries are bounded; rate-limited responses are not immediately retried. The process lock prevents overlapping local collectors and source transactions prevent partial writes.
- Disabled or removed sources disappear from search but retain their database records. CV text, candidate profiles and application stages remain in browser storage, outside the job database. Saved jobs retain a snapshot after leaving the public feed; they are labelled availability-unverified.

## API and configuration

`GET /api/jobs` returns `{version, generatedAt, lastSuccessfulCollection, intervalHours, retentionDays, jobs, sources, recentRuns}`. Optional `q`, `location`, `source`, and `days=1..30` filters are supported; a server-side posting-date filter excludes unknown dates. CV matching runs locally in the browser.

`GET /api/status` returns collection health and active-job counts without descriptions. There is no public collection or write endpoint. The local server exposes only the API and public website assets, never `var/`, `.git/`, source configuration, or other working documents. An optional `aigyaan-jobs-api-url` meta tag can point at a separately hosted read-only API; that host must configure CORS for your website origin. Blank uses the same-origin API and falls back to `data/jobs.json` for GitHub Pages.

Example source entry (replace the board token with a real company board):

```json
{"id":"greenhouse-company","type":"greenhouse","board":"company-token","name":"Company careers","company":"Company","enabled":true}
```

Set `type` to `ashby` and supply its board slug to connect an Ashby company feed. IDs must remain stable to preserve history. Configuration is operator-controlled; arbitrary fetch URLs are not accepted from visitors. New companies appear after the next collection. Provider responses that omit original posting dates are never labelled as newly posted.

## Checks

```bash
npm test              # Node matching/feed/extension tests + Python ingestion and API tests
npm run build         # Stage public files in dist/ after collection
```

Optional real-browser smoke check: start the site on port 5175, then run `node scripts/browser_smoke.mjs`. Set `SITE_URL` or `CHROME_PATH` if needed. It uses a temporary Chrome profile and checks filter results, saved application history across reloads, cover-letter and CV handoff, theme switching and mobile overflow. It does not submit applications.

The generated database and snapshots must not be committed. The production workflow stages only an allowlist into `dist/`, so candidate exports, development notes and SQLite backups are not included in the deployed website.
