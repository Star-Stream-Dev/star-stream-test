

## Self-Hosting Games on SolarNova

### What's Feasible

Yes — you can host **HTML5/JavaScript games** directly on SolarNova. These are games built with plain HTML/JS, Phaser, Construct, GameMaker HTML5 export, etc. The game files (HTML, JS, CSS, assets) would be uploaded to your backend storage and served directly within your app — no external embed needed.

**What won't work:** Games that are only available as external websites (e.g., hosted on `kbhgames.com`) can't be "self-hosted" — those will always need an iframe or link. This approach only works for games where you have the actual game files.

### How It Works

1. **New storage bucket** (`game-files`) for uploading zipped or unzipped HTML5 game bundles
2. **Admin uploads** a game's files (index.html + JS/CSS/assets) via the Game Management panel — either as a ZIP that gets extracted or individual files
3. **New `hosted_games` table** tracks self-hosted games with their storage paths, metadata, thumbnails, and console category
4. **Player component** renders the game by loading the hosted `index.html` from storage in a sandboxed iframe pointed at your own storage URL (not an external site) — or via an inline approach using `srcdoc`
5. **Games grid** gets a new indicator distinguishing "hosted" vs "external" games

### Implementation Steps

1. **Database migration**: Create `game-files` storage bucket and update the `games` table with a `hosted_path` column to optionally point to self-hosted files instead of an external URL
2. **Admin: Game file upload** — Add a file upload section in `GameManagement.tsx` where admins can upload a ZIP of game files. The system extracts and stores them in the `game-files` bucket
3. **Game rendering** — Update `GameEmbed.tsx` to detect hosted games and load them from storage instead of an external URL. The iframe `src` points to your own storage bucket's public URL
4. **Visual indicator** — Show a "Hosted" badge on self-hosted games in the grid so users know these load faster and don't depend on external sites

### Technical Notes

- Games are served from your own storage CDN — fast, reliable, no third-party dependency
- The iframe is still used for rendering (HTML5 games need their own document context) but it points to **your own storage**, not an external website
- ZIP upload + extraction would be handled via a backend function
- Existing external-URL games continue to work unchanged — this is additive

