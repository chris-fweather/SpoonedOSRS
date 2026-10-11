# Discord role bridge

Small standalone Node process for any always-on host. The website stays on Cloudflare. The existing HTTP slash commands keep working independently.

## Behaviour

- `guildMemberAdd` prioritises a new member and reads their latest website entitlements.
- Website staff role is keyed by Discord identity, across linked RuneScape names. Only the matching staff tier is assigned. Map the Supporter entitlement to the server's Sponsor role if that is its display name.
- Verified server-side donation records or a granted supporter entitlement qualify. Selecting a cosmetic title in the browser never grants authority. Donation amounts are not returned to the bot.
- Polls the website in pages of 100 with a delay, at least 60 seconds between complete passes. Changed records are queued. Initial/recovery backlogs take longer than ordinary updates; there is no fixed instant-sync promise.
- Startup and six-hour member audits catch stale managed roles after downtime. A single reconciliation loop and discord.js REST rate-limit handling prevent uncontrolled writes. Failed requests retry after a minute; website errors never mean revoke everyone.
- Removes only roles explicitly present in the configured map. Other roles stay untouched. Changing/removing a mapping requires a deliberate cleanup of the old role first.
- Optional nickname sync uses a member-selected linked name. It affects this server only. Opting out stops changes and leaves their current nickname alone; Discord hierarchy can prevent nickname changes.
- Accolade roles are not yet enabled. Add future eligibility rules on the website, with privacy/opt-in rules and tests, before expanding the bridge's allowlist. Never derive staff roles from achievements or donations.

## Setup

1. Install Node 22.13+ on your existing server. Use a dedicated unprivileged service user.
2. Run `npm ci` in this directory. Copy `.env.example` to `.env` and fill it on the server; do not commit or paste secrets into chat.
3. In the Discord application, enable **Server Members Intent** and obtain the **bot token**. This is different from the OAuth client secret. No message-content or presence intent is used.
4. Create/reuse the desired server roles and put their numeric IDs in `DISCORD_ROLE_MAP`. Supported keys: `helper`, `moderator`, `admin`, `owner`, `supporter`. Roles must be distinct, unmanaged and below the bot's highest role. The supporter role must have no server permission bits; channel visibility can be configured separately. Keep a manual server-owner recovery role outside the map.
5. Give the bot **Manage Roles**, and **Manage Nicknames** only if enabling nickname sync. Do not give Administrator. Review mapped staff-role permissions explicitly; the bridge does not create roles or edit their permissions.
6. Set the same new random 32+ character `DISCORD_ROLE_SYNC_SECRET` on this process and as a Cloudflare Worker secret. It authenticates only the read-only entitlement API, not normal account sessions. Apply migration 0019 before enabling the bridge.
7. Run `npm test`, then `npm start` with `DISCORD_ROLE_SYNC_APPLY=false`. Check a test member, website grant/revoke, supporter opt-out, join, reconnect and hierarchy errors. Dry-run output reports intended role counts, not usernames, member IDs, tokens or donation amounts.
8. Set `DISCORD_ROLE_SYNC_APPLY=true` only after the mapping and test have been reviewed. Run one instance under a service supervisor; restart on failure and monitor `sync-retry`/`poll-retry` logs.

Example mapping (replace these example IDs):

```json
{"helper":"111111111111111111","moderator":"222222222222222222","admin":"333333333333333333","supporter":"444444444444444444"}
```

The role bridge has **not been activated** merely by deploying the website. It needs the separate process, token, intent, permissions and mappings above. No Discord messages are sent by this process.

## Security and privacy

The Worker verifies an HMAC signature over timestamp, GET method and exact path/query, accepting a 60-second window. The dedicated secret must be separate from OAuth and session secrets. The API returns only Discord IDs, allowlisted entitlement keys and opted-in nicknames, in bounded pages. There is no endpoint for Discord to grant website staff access. Both endpoints and bot logs omit secret values. The process keeps temporary member/cache data in memory and reads member events; it does not read chat or store server message history.

Sources: [Discord member events](https://docs.discord.com/developers/events/gateway-events#guild-member-add), [Discord role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Discord-Roles-and-Permissions), [discord.js](https://discord.js.org/docs/packages/discord.js/14.26.4/Client:Class).
