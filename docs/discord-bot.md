# Spooned OSRS Discord bot

Application: `DISCORD_CLIENT_ID`. Server: `DISCORD_GUILD_ID` (both build variables).

Interactions endpoint: https://spoonedosrs.com/api/discord/interactions

## Commands

- `/profile name:Obifloat` posts the public profile image and a link to the journal. The image includes public character, pet and stats. No authenticated profile read or game import takes place. Discord can retain a previously posted snapshot after privacy changes, as it does with ordinary shared links.
- `/leaderboard` posts a link to the website rankings; it does not claim to post a live table.
- `/spooned` displays private help and community links.

Commands accept only correctly signed requests from the configured Discord application and server. All responses disable automatic mentions. Timestamp checks reject stale requests; payload size is bounded. No Gateway connection, message-content intent or Administrator permission is needed. Repeated signed requests cannot mutate site data: responses are returned directly to Discord, without independent message sends.

## Activate

1. In the Discord Developer Portal, open the application above and set General Information → Interactions Endpoint URL to the endpoint above. Save and let Discord verify the signed PING.
2. Install into the configured server using the link below. Permissions cover View Channels, Send Messages and Embed Links; no Administrator permission.
3. In `/staff`, open **Discord bot** and click **Register bot commands**. This owner-only action uses the existing Cloudflare secret, checks same-origin and verifies application identity before changing commands. Alternatively register commands with `node --experimental-strip-types scripts/register-discord-commands.mjs`. This uses the existing app's client secret from the local environment or ignored `.dev.vars`, exchanges it for a narrowly scoped `applications.commands.update` token and verifies the public key before registration. Commands are upserted individually, so unrelated commands are not deleted.
4. Test `/profile name:Obifloat` in your chosen server channel.

Install: https://discord.com/oauth2/authorize?client_id=<DISCORD_CLIENT_ID>&scope=bot%20applications.commands&permissions=19456&guild_id=<DISCORD_GUILD_ID>&disable_guild_select=true

The application must be installed and its interactions endpoint saved before end-to-end operation can be confirmed. There is no bot token in this repository. Scheduled announcements and automatic milestone feeds are not enabled; they need an explicit channel, posting rules and bot credential stored as a secret. Interactive commands use Discord's direct response mechanism and do not need a bot token at runtime.

## References

- https://docs.discord.com/developers/interactions/overview
- https://docs.discord.com/developers/interactions/application-commands
- https://docs.discord.com/developers/interactions/receiving-and-responding

## Automatic role bridge

The optional [`discord-bot/`](../discord-bot/README.md) service handles joins and periodic staff/supporter role reconciliation. It is separate from the HTTP interaction endpoint and requires a bot token plus a dedicated read-only API secret. Account settings provide supporter-role opt-out and optional linked-name nicknames. Migration 0019 stores these preferences. The bridge is not activated yet; accolade rules remain future work.
