# How Spooned OSRS handles accounts and data

Spooned OSRS is a fan project, not affiliated with Jagex. The site does not ask for RuneScape passwords. Discord sign-in requests the `identify` OAuth scope to identify the Discord account, not access its messages or servers.

Linking a RuneScape name gives that Discord account editing rights on this site. It does not independently prove ownership of the game account. Manual acquisition records and imported JSON are self-reported. A public profile, leaderboard position or staff cosmetic is not independent verification of an in-game accomplishment.

Public name lookups can fetch official Hiscores without login. Unclaimed discovery stores compact skills/activity snapshots, not full collection logs or loot histories. Lookups have network-based budgets and short freshness windows. RuneProfile provides collection logs, quests, diary totals and account mode when available; Temple provides shared collection-log data; Wise Old Man provides tracked skills and boss counts. A provider outage preserves existing data.

The database stores linked Discord identity, saved progress, profile preferences and operational records. The owner's profile view retains its complete data. Visitor responses apply public/private and per-section choices on the server; hidden sections are removed, not just concealed with CSS. Private accounts are excluded from boards. Hidden donation amounts remain null in public responses, while the supporter rank remains visible by the owner's requested design. That rank reveals relative ordering, not the amount.

Pet acquisition records are separately controlled by their sharing option. Historical method/count/rate/pace entries are part of those records. Notes, manual time totals and personal planning preferences are omitted from public views. Profile pages and viewer-dependent API responses use no-store headers. Board derivation may be memoised in server memory only after fresh database rows (including privacy preferences) have been read.

Guest commendations use a keyed, per-profile IP digest and short-lived rate-budget digests, not stored raw IP addresses. Shared networks share the allowance; this is not a guarantee of one human per vote. Discord linking, permissions, revision checks and server validation also protect writes.

Calculations and their limits are documented in [calculations.md](calculations.md). No independent security audit is claimed. Publishing source improves inspectability; it does not itself prove that every bug or vulnerability has been found.
