# AI Gyaan

A static AI agent workspace focused on recruitment, job search, interview preparation, resume building, tagged learning, focus practice, and hirer lock creation. SQLite WebAssembly is vendored locally for real in-browser SQL practice.

## Run

```bash
npm run dev
```

Open `http://localhost:5173`, or use the active fallback server at `http://127.0.0.1:5174` if port `5173` is occupied.

## Deploy

GitHub Actions deploys this static site to GitHub Pages on every push to `main`.

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

The default screen now includes a Remotive public-feed search, a dated JSON feed importer, CV keyword coverage and missing-skill evidence, posting-age and match filters, platform search shortcuts, an editable cover-letter draft, and links to the existing CV builder. Light/dark mode follows the system initially and remembers the selected mode. Interview Studio includes original guides and interactive quizzes for six roles; it does not scrape third-party preparation content.

**Coverage:** Remotive is the only connected live feed. Its public listings are delayed by 24 hours and cached here for six hours, following its [API documentation](https://github.com/remotive-com/remote-jobs-api). LinkedIn, Naukri, Monster, Foundit, Cutshort, GetSmart and Indeed are external search shortcuts, not live adapters. Comprehensive cross-board discovery, semantic LLM matching and automatic submissions are not implemented. Production aggregation requires provider-authorized API/feed integrations and a hosted backend. The current deterministic skill percentage is not an ATS score or hiring probability. Custom job feeds can use this schema:

```json
{"jobs":[{"title":"Data Analyst","company":"Example","location":"India","description":"SQL and Python","postedAt":"2026-09-20T08:00:00Z","url":"https://example.com/careers/analyst","source":"Company careers"}]}
```

Only HTTPS job links and valid, non-future publication dates are accepted. Invalid entries are omitted; results are sorted newest first. No fake vacancies are seeded. Network failures display an actionable error. CV input supports plain text; PDF/DOCX parsing remains unavailable. Cover letters contain an explicit achievement placeholder for the candidate to complete.

Application Passport stores editable answers in browser localStorage. Personal details are not seeded in public source. Export JSON and import it into the extension, which stores answers in chrome.storage.local. Both provide deletion controls. These stores are device-local, not encrypted vaults or account sync; exports contain the entered personal details.

Download `extension.zip` from Application Passport, unzip, and load the folder via Chrome's `chrome://extensions` → Developer mode → Load unpacked. Alternatively load the repository's `extension/` folder directly. The [Chrome side panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) opens from the toolbar icon. Import the profile, then invoke the extension on the application tab. It uses activeTab access instead of permanent access to every site. One click fills recognised blank native inputs and selects, dispatching input/change events. Optional automatic mode observes new fields on that page. It does not advance, submit, overwrite answers, guess employment history, or fill declarations. Custom widgets, Google Forms custom controls, cross-origin frames and protected pages may require copying from the visible answers. Browser panel placement follows Chrome's side-panel preference.

Run `npm test` for matching, filtering, feed validation and simulated extension-field tests. Chrome integration must also be checked manually on the target application forms. Package extension changes with `zip -j extension.zip extension/*`.
