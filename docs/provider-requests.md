# Upstream reads, caching and limits

Checked 6 October 2026. These controls require migration `0021_provider_controls.sql`.

The tracker GETs existing snapshots. It does not POST a request to make Temple,
RuneProfile or Wise Old Man refresh a player from the game. Read requests still
consume their API quotas. Quotas apply across our app, not once per player.

| Provider | Published guidance | Our minimum interval | Our response cache |
| --- | --- | --- | --- |
| TempleOSRS | FAQ recommends at most 5/min for auto-updaters; read quota needs confirmation | 12.5 seconds (under 5/min) | 5 minutes |
| RuneProfile | 30/min anonymous, 120/min standard key, 600/min partner | 2.1 seconds (under 30/min) | 1 minute |
| Wise Old Man | 20/min without key, 100/min with key; space requests | 3.1 seconds (under 20/min) | 5 minutes |
| Official Hiscores | No verified numeric entitlement | 1.1 seconds (our own conservative ceiling) | 1 minute |
| RuneProfile legacy models | No verified third-party allowance; confirm support | Shares RuneProfile's interval | 1 hour |

References:
- https://templeosrs.com/faq.php and https://templeosrs.com/api_doc.php
- https://api.runeprofile.com/v1/docs (documentation is also in their public repository's apps/api/src/public/v1/index.ts)
- https://docs.wiseoldman.net/api

Cache durations beyond RuneProfile's documented one-minute upstream cache are
our freshness choices, not claims about provider requirements. No key-based
quota increases are enabled. An agreed integration/key is required before raising them.

## Implementation

- D1's atomic provider slot is shared across Worker instances and regions. No
  fixed-window boundary bursts, IP rotation or per-player quota multiplication.
- Only allowlisted public GET endpoints are accepted. Mutation endpoints,
  caller credentials and redirects are rejected. All requests identify Spooned
  and its public Discord contact in User-Agent.
- Cache lookup happens before consuming an upstream slot or daily allowance.
  A short D1 lease prevents duplicate concurrent fetches for the same URL.
  Busy requests return Retry-After instead of opening a long server queue.
- HTTP 429 and 503 trigger a shared provider cooldown; Retry-After seconds and
  dates are honored. RateLimit-Remaining: 0 also sets cooldown, using
  RateLimit-Reset when no Retry-After is supplied. No immediate automatic retry.
- Successful JSON and GLB results are capped at 1.8 MB. No cookies, private or
  no-store responses are persisted. 404s are cached for one minute. Malformed
  payloads and other errors aren't cached as valid profiles.
- Cache keys are HMACs of URLs. Cached payloads are public upstream data only;
  saved account privacy checks remain in the existing profile routes. There is
  no public raw-cache endpoint. Expired cache rows are deleted on subsequent
  outbound fetches. At rest, expired rows can remain until this cleanup runs.
- Existing 60-second per-player sync cooldown and 10,000 outbound/day cap
  remain. Cache hits do not use the outbound/day cap. SYNC_PAUSED stops misses
  but permits fresh cache reads. A cache hit is not labelled as a new upstream
  fetch internally (X-Source-Fetched-At preserves the fetch time).

The model endpoint is paced/cached now; that is not permission to reuse it.
Confirm API/model reuse, attribution and donation-supported operation with the
maintainers before wider launch. These changes are local until migrated and deployed.

## Verification

`node --loader ./lib/test-register.mjs --test lib/provider-client.test.ts`
executes the production SQL against disposable SQLite databases, with separate
client instances and mocked upstreams. No requests hit real providers in tests.
