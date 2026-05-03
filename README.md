# PC Builder

Single-page app for spec'ing custom PC builds with strict compatibility checks.
Inventory is stored in **Supabase Postgres** — edits made anywhere (local dev, GitHub Pages, another browser) all hit the same database.

## Architecture

```
Browser (React + Vite)
      │
      ▼  HTTPS
Supabase (Postgres + RLS)
      │
      ▼ table: components { id, category, data jsonb }
```

`src/data/database.json` is **only** the bundled seed used on first run when the table is empty.

## Run locally

```bash
npm install
cp .env.example .env.local        # then fill in your Supabase values
npm run dev
```

## One-time Supabase setup

See "Setup" below.

## Deploy to GitHub Pages

1. Push to a GitHub repo.
2. Add repo secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Enable Pages → Source: GitHub Actions.
4. The workflow in `.github/workflows/deploy.yml` deploys on every push to `main`.

## Setup (Supabase + GitHub Pages)

See the chat instructions for the step-by-step.
