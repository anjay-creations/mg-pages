# AI Gyaan

A dependency-free prototype for an AI agent workspace focused on recruitment, job search, interview preparation, resume building, tagged learning, focus practice, and hirer lock creation.

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
- Standalone Resume Builder screen for future resume parsing, missing-detail review, ATS drafting, and recruiter keyword guidance.
- Create Locks workflow for hirers/problem owners.

The current AI answer synthesis and reranking are still local prototype logic in `src/app.js`. Replace `runAiSearch` and `rerankSources` with backend API calls when live search, reranking, and LLM providers are connected.

## OAuth configuration

Google and LinkedIn login require registered OAuth applications and server-side callback handling. Set `aigyaan-google-auth-url` and `aigyaan-linkedin-auth-url` in `index.html` to your hosted authentication start routes. The browser app appends a `returnTo` query parameter. Provider secrets and token exchange must not be placed in this static repository.
