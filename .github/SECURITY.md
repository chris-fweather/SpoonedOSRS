# Security

## Reporting a vulnerability

Please report security problems privately. Do not use a public issue.

- **Preferred:** GitHub's [private vulnerability reporting](https://github.com/chris-fweather/spoonedosrs/security/advisories/new) for this repository.
- **Or:** message a site owner on [Discord](https://discord.gg/spoonedosrs) and ask for a private conversation.

Include the affected page or API, the steps to reproduce using accounts you control, and the expected and actual results. Never post tokens or other players' data.

## Please don't

- Access other players' private data, or change data you don't own.
- Run load tests, scanners or denial-of-service tests against spoonedosrs.com.
- Disrupt Discord, the OSRS Hiscores or RuneProfile.

We're a small volunteer project with no paid bounty programme, but we'll credit reporters who want to be credited.

## How the site handles secrets

- Production secrets are Cloudflare Worker secrets and never live in Git.
- Deployment identifiers are Workers Builds variables.
- Tests run against an isolated in-memory database with mocked upstream services.
