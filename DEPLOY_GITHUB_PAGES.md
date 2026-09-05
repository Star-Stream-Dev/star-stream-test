# Deploying Star Stream to GitHub Pages

1. Push this repo to GitHub (branch `main`).
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Repo **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
4. Push (or run the "Deploy to GitHub Pages" workflow manually). The site goes live at
   `https://<user>.github.io/<repo>/`.

Notes:
- The base path is detected automatically: `/` for a `<user>.github.io` repo or when a
  `public/CNAME` file exists (custom domain), otherwise `/<repo-name>/`.
- Deep links / refreshes (e.g. `/invite/<code>`) work via `404.html`, copied from `index.html`.
- Backend (database, auth, edge functions) keeps running on Lovable Cloud — GitHub Pages
  only hosts the static frontend.
