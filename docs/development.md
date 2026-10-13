# Development

How to run Spooned OSRS on your own machine, check a change, and how the live site is deployed.

## Run it locally

Use Node.js 24 (see `.node-version`).

```sh
npm ci
cp .env.example .dev.vars   # then fill in your own values
npm run dev
```

The dev server prints its URL (usually `http://127.0.0.1:5173`). Local D1 data lives in the ignored `.wrangler/state/`.

To sign in locally, create your own Discord application and put its secrets in **`.dev.vars`** (never in source):

| Setting | What it is |
| --- | --- |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Your Discord application. Register `/api/auth/discord/callback` on your local host as a redirect URL. |
| `SESSION_SECRET` | Any random string of at least 32 characters |

[.env.example](../.env.example) lists every setting.

## Checks

```sh
npm run release:verify     # release metadata, TypeScript, unit tests, migrations, production build
npm run test:beta          # Discord sign-in, search, claiming and sync against the built Worker
npm run test:integration   # staff, moderation, guides, privacy and account features
npm run test:integration -- staff   # only the checks whose name matches
```

The beta and integration suites run the production bundle in the Workers runtime (`scripts/worker-harness.mjs`):

- each check gets its own empty in-memory D1 with every migration applied;
- Discord and the game-data providers are mocked;
- no secrets, network access or dev server are needed.

CI runs all three on every pull request.

## Making a change

- Keep each change focused, and add or update tests:
  - calculations and validation: unit tests in `lib/`;
  - API, permissions or privacy behaviour: a fixture check in `scripts/check-*.mjs`.
- Read [design-principles.md](design-principles.md) before changing anything players see, and attach before/after screenshots at desktop and phone widths.
- Add a line under `## Unreleased` in `CHANGELOG.md` if players will notice the change.
- Database changes need a new migration in `drizzle/`, plus a test for the backfill and for later writes.
- Use synthetic fixtures only. Never commit real player exports, Discord IDs, cookies, database snapshots or `.dev.vars`.

## Project layout

| Path | What's there |
| --- | --- |
| `app/` | Pages, components, styles and API routes |
| `lib/` | Calculations, validation, permissions, storage, and their unit tests |
| `build/` | The Worker entry point |
| `drizzle/` | Ordered database migrations |
| `scripts/` | Integration checks, the Worker test harness, data preparation and deployment helpers |
| `public/` | Artwork, icons, fonts and 3D models served to the browser |
| `artwork/` | Source art: the icon pack and the Discord emoji set |
| `discord-bot/` | The optional Discord role bridge |
| `releases/` | Notes for each version |
| `docs/` | Architecture, calculations, design principles and operations |

## Deployment

`main` deploys to spoonedosrs.com through Cloudflare Workers Builds:

- **Build command:** `npm run release:verify`
- **Deploy command:** `npm run release:deploy`. This applies pending D1 migrations, uploads the Worker, then checks the live site with `scripts/check-deployment.mjs`.

A failed migration stops the deploy. [releases.md](releases.md) covers versions, rollback and recovery.

Deployment identifiers are Workers Builds variables. They aren't secrets, but keeping them out of source means a copy of this code never points at our database, Discord server or owners:

| Build variable | What it is |
| --- | --- |
| `D1_DATABASE_ID` | Production D1 database |
| `DISCORD_CLIENT_ID` | Discord application (OAuth client) ID |
| `DISCORD_GUILD_ID` | Discord server for bot commands and role sync |
| `DISCORD_PUBLIC_KEY` | Discord application public key (interaction signatures) |
| `OWNER_DISCORD_IDS` | Comma-separated owner Discord user IDs; the first is canonical |

Secrets are Worker secrets (`npx wrangler secret put NAME`): `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `DEPLOY_CHECK_SECRET` and the optional `DISCORD_ROLE_SYNC_SECRET`.

Guide image uploads use an R2 bucket bound as `UPLOADS` (`spoonedosrs-uploads`, dev `spoonedosrs-dev-uploads`). `vite.config.ts` binds it only where `UPLOAD_BUCKETS_CREATED` says the bucket exists; without it the editor offers image links only. `lib/guide-upload-rules.ts` caps each file at 3 MB, each person at 25 images (40 MB) a day and all uploads at 1 GB, checked before anything is stored, and accepts only PNG, JPEG, GIF and WebP (read from the file itself).

To run your own copy, create your own Worker, D1 database and Discord application, and set these values for them. Never run migrations or deploys against ours.
