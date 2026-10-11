# Release operations

## Release identity

`release.json`, the root package version and lockfile must agree. Each version
has a document in `releases/` and an entry in `CHANGELOG.md`. There are three
channels: `-rc.N` candidates are review snapshots that never deploy; `-beta.N`
betas deploy to production for testers; plain versions are stable. Promote to
`0.1.0` only after the launch criteria are met. Use patch versions for compatible fixes
and minor versions for compatible features. Record compatibility changes
explicitly, especially while the project is pre-1.0.

A version is a source snapshot; it is not a promise that every optional service
is active. Do not reuse a published tag, overwrite release notes after a
material change, or force-push a release tag. Publish a new version instead.

## Local and pull-request checks

Use Node 24 and the committed lockfile:

```sh
npm ci --include=dev --include=optional
npm run release:verify
```

The command validates version/notes/schema consistency, TypeScript, unit tests,
the migration chain and the production build. PRs run the same command in
GitHub Actions without production secrets. Actions are pinned to verified
revisions. Mobile/browser and permission integration checks must also be
recorded in the PR where relevant.

Both Actions verification jobs set `NODE_OPTIONS=--max-old-space-size=4096`.
A cold check of the generated game-data catalogues uses about 2.9 GB; the
runner's default roughly 2 GB Node heap can abort before tests run. TypeScript
build caches stay local and ignored, so fresh clones do not inherit a
developer's incremental state. This setting changes memory capacity, not checks.

## Cloudflare connection

Production deploys from `main` through Cloudflare Workers Builds, targeting the
`spoonedosrs` Worker. There is one deployment path: do not connect a second
Worker or add a GitHub deploy workflow.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run release:verify` |
| Deploy command | `npm run release:deploy` |
| Build variables | `NODE_VERSION=24`, plus the deployment identifiers listed in [development.md](development.md#deployment) |
| Non-production builds | Disabled until an isolated staging Worker and database exist |

The deploy script refuses candidate versions and branches other than the
Cloudflare `main` build; stable and beta versions deploy. It applies pending D1 migrations before uploading the
Worker. A failed migration stops deployment. The build token therefore needs
permission for D1 migrations as well as Worker deployment. Keep tokens in
Cloudflare; GitHub does not need a Cloudflare credential for this workflow.

There is no manual deploy script. Emergency manual deployment is a maintainer
action, not the official release path; perform equivalent checks and record the reason.

`main` is protected: changes land through pull requests with a passing Verify check.
Cloudflare's build command repeats the same checks before every deploy.

## Publish a stable version

1. Complete the launch criteria below. Prepare a release PR with the new
   version, notes, changelog and schema requirement.
2. Run `npm run release:verify`, review the actual diff, and merge the approved
   source to `main`. This starts the single Cloudflare build/deploy path.
3. Verify Cloudflare reports success. The deploy command already runs
   `scripts/check-deployment.mjs`; to repeat it from that exact source revision, run
   `DEPLOY_CHECK_SECRET=… node scripts/check-deployment.mjs https://spoonedosrs.com`.
   Besides version and route checks it calls the signed `/api/health/sync`, which
   fetches and parses every provider through the live sync code without saving.
   A runtime fault fails at once; busy or untracked providers are retried, and at
   least one must return data. Confirm private/public profiles and key staff
   actions separately.
4. Create an annotated `v<version>` tag on the deployed commit and push the tag.
   The Release notes workflow validates the source again, verifies the live
   version/build and publishes the corresponding GitHub Release notes.
5. Record the Cloudflare deployment ID and database migration boundary in the
   release record. Do not attach database exports, `.dev.vars`, internal
   build bundles or operational logs to a release.

Candidate tags publish GitHub prereleases after verification, without deploying
production. A failed publication can be rerun; an existing release is left
unchanged. If a stable tag runs before Cloudflare finishes, wait for deployment
and rerun the workflow. GitHub release publication itself does not deploy code.

## Public source releases

Development happens in a private repository. Each approved version is published
to [chris-fweather/spoonedosrs](https://github.com/chris-fweather/spoonedosrs) as
one commit, with its notes from `releases/` as the GitHub Release.

## Recovery

Before deployment, record the current Worker deployment/version and confirm the
database's recovery facilities. Additive migrations are left in place if code
deployment fails. Correct the failure and redeploy, or roll back the Worker to
the previous known compatible version through Cloudflare's deployment history.
Verify it against the migrated schema first.

Worker rollback does not undo D1 changes. Destructive data changes require a
separate restore/forward-fix decision; restoring a database can discard newer
user activity. Do not automate database rollback alongside code rollback.

If a problem affects imports, use `SYNC_PAUSED` while leaving saved profiles
available. Do not load-test upstream services during incident diagnosis.


## First stable launch criteria

- Review the candidate diff and existing dependency/security findings; record
  fixes or explicit, scoped risk decisions.
- Exercise account claims, privacy, role boundaries, transfers and journal
  revision conflicts against isolated staging data.
- Check desktop/mobile interactions and perform a representative staging load
  test. Do not infer launch capacity from unit tests or a single HTTP timing.
- Verify production migration permissions, build commands and recovery plan.
- Resolve relevant upstream API/model and donation-related permission questions.
- Review published privacy/terms wording against actual stored data and contact
  routes. Optional Discord services remain inactive until configured and tested.

The source is public under the MIT licence (see `LICENSE` and `docs/third-party-content.md` for
third-party artwork and data). Never commit production identifiers, player data
or secrets; deployment identifiers are Workers Builds variables.
