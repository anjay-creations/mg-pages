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
- Find Locks workflow that opens recent LinkedIn, Naukri, and Foundit searches instead of showing fake jobs.
- Daily application keys: each applier gets 20 keys per day, shown in the top navigation.
- Apply interaction: every job search card has a lock symbol; applying inserts the key, rotates the lock 90 degrees, decrements the daily key count, then opens the job search.
- Profile button in the top navigation opens a right-side profile/settings drawer with Google and LinkedIn login entry points.
- Top-brand career page shortcuts for Google, Microsoft, JP Morgan, Morgan Stanley, Wells Fargo, Amazon, and Flipkart.
- Focus section with a candle image, timer, and honest completion flow that increases the next round by 5 seconds.
- Standalone Resume Builder screen for future resume parsing, missing-detail review, ATS drafting, and recruiter keyword guidance.
- Create Locks workflow for hirers/problem owners.

The current AI answer synthesis and reranking are still local prototype logic in `src/app.js`. Replace `runAiSearch` and `rerankSources` with backend API calls when live search, reranking, and LLM providers are connected.
