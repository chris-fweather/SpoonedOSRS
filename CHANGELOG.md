# Changelog

## Unreleased

Changes after the latest version belong here until the next version and its
release notes are prepared.

- Link previews: shared links show the castle scene with the site header. Profile previews show the player's name in their rank colour with their scimitar or coin and account-type badge, Sir when they use it, their achievement title in its rarity colour under the username, their character in the gear saved on their profile, their chosen scene, and their rank on the pets, collection log and total level boards.
- Running your own copy: `npm run setup` prepares a fresh clone, and the checks run without any configuration.

## 0.2.0-beta.1 — 2026-10-13

- Staff: corrections take notes, and approvals or rejections can carry a reason; both show in the timeline. Ownership requests show the admin notice first, and the evidence shows who added it and when. Players shows how many players there are and each player's donations (amounts a player hides are marked hidden). Latest activity uses the same rows as Access history, and on phones the section tabs scroll instead of cutting off.
- Guide editor: every insert is an icon on an Insert bar, grouped (In the text, Text, Gear, Boss info, Magic, Media), with its name on hover. Type @ in the text to search items, prayers, spells, skills and quests; type an s straight after a term to make it plural.
- Staff: a moderator can no longer approve an admin's correction or ownership request; the proposer's rank or higher decides. Access history reads as one line per change, and adding staff opens the person's card under the search.
- Guide editor: upload an image or GIF (PNG, JPG, WebP or GIF, up to 3 MB) straight into a guide, as well as pasting a link.
- Guide editor: gear tiers are edited in one place: rename a tier, edit its gear or inventory, or add your own tier. Gear sections show an "Edit" button right under them.
- Guide editor: Insert adds Prayers, Spells, and Images or GIFs by link. Spells can be linked inline like prayers and items. "Items & terms" (the book) is labelled, and can add a plural ("Sharks"). The text-style menu is readable on the dark theme.
- Profiles: scroll (or pinch) on the character to zoom in and out of the scene. Turning the character is gentler: it eases into place and a flick slows to a stop.
- Staff portal: names show the scimitar and rank colour only, without Sir or the donor title.
- Staff portal: RuneScape names carry the friends-list icon and Discord accounts the Discord icon, so requests read "Lucky Lad: from Lucky Lad → Dry Guy" with a one-line summary of what changes. "Needs admin" shows only while a request waits; decided requests note it in the timeline.
- Hold names: a new permission (moderators and up by default) puts an unprotected name on hold straight away, without a second reviewer. Releasing or linking a held name still needs one.
- Corrections: kill-rate rows lead with the boss ("Kraken · kills per hour · Pet kraken"), dry-streak records use a flame icon, state and time sit on one line, and every row opens to a timeline of who proposed and who decided.
- Players: rows show pets, collection log slots and quest points; opening one shows the account type, link date, last full sync and other names. Fix progress now covers the collection log, quests and diaries as well as pets.
- Permissions: picking someone to add shows their Discord name, handle and RuneScape names.
- Boss and activity pages show a "Read our guide" button when a published guide covers them.
- Staff portal: names sit on the same line as the sentence around them. Corrections show the item's or pet's own icon, and kill-rate rows lead with the pet. Dry-streak records read as "Dry Streaker went 14,250 kills without Pet kraken".
- Kill rates & XP: a proposal can set a pet's rate (for example 1 in 1,000 master clues for Bloodhound) as well as, or instead of, its pace.
- Ownership: requests name the Discord account a name moves to (with the Discord icon) rather than its main RuneScape name; protected requests show a Needs admin flag; reviewers are always named.
- Access history starts with who acted: "Mira Vale promoted Bramble Pk", "Mira Vale updated Corvid Hc's access".
- Guides page tiles are compact: the icon beside a one-line title and topic, the byline underneath.
- Staff portal: Ownership and Corrections share one layout: section tabs with their own Awaiting review tab, compact rows that open in place, and step-by-step forms. A new ownership request shows who owns the name now before you choose what should happen.
- Corrections: the drop search groups results by item and lists every boss or activity that drops it with its own rate; History is a compact list instead of large cards.
- Overview: Latest activity reads as plain sentences, such as "Bramble Pk proposed a rate of 1/400 for Kraken tentacle".
- Permissions: access is grouped into Guides, Corrections and Ownership. Team rows show the Discord @username with the Discord icon, every row opens (your own read-only), new staff are found by searching a Discord account or RuneScape name, and rank changes in the history read Helper → Moderator.
- Players: each player shows their name as their profile does, with actions to view the profile, open an ownership request, manage staff access, search correction history or fix progress. The staff tabs read Overview, Ownership, Corrections, Players, Permissions, Guides, Discord bot.
- Ownership: accounts in the top 25 on the pet or collection log boards also need an admin to approve a request.
- Guides: a new guide starts from a layout (Blank, Bossing, Quest or Diary), suggested from its topic, instead of fixed templates. Quests show their difficulty, and diaries and combat achievement tiers can be guide topics. The workshop has a search, guide titles stay on one line, and requirements stay on one line.
- Account settings: Log out everywhere ends every signed-in session for your Discord account, on all devices.
- The footer credits every data source (OSRS Hiscores, RuneProfile, TempleOSRS and Wise Old Man), and the RuneProfile card's description fits on one line.
- Staff portal, Ownership: each request reads like a report, with a header, the from and to accounts, the evidence, a decision panel and a timeline. Staff can now hold a name and release the hold; while a name is held they can link it to its owner's Discord ID from the request.
- Staff portal: people show as they appear on the site everywhere (main name in rank colour, scimitar or supporter coin, Sir and "the Generous"), including the Team list and Access history.
- Staff portal, Overview: Latest activity lists corrections and ownership requests (moves, holds and releases) together, with who proposed and who decided.
- Staff portal, Corrections: section tabs with waiting counts, step-by-step proposal forms, a review queue per section, and cards that show the proposed value up front.
- Every supporter gets a silver coin beside their name on the site, and the same coin is the Supporter role icon on Discord. Gilded supporters show the gilded scimitar instead.
- The site owner's name is red, like admins', with the owner's inferno scimitar.
- The Guides banner shows how many guides are published. The Leaderboard banner shows the live community totals (public journals, pets collected and log slots unlocked), which moved there from the home page.

- The Guides page is open: a search bar, published guides as tiles that open the full guide, and a banner inviting helpers to join the Discord and write guides. The Leaderboard and Guides titles show their navigation icons.

- Guides: gear setups for each budget sit side by side as tiers, each with a short note. Requirements show skill, quest, diary and item icons, plus custom requirements. Game terms such as Protect from Magic or a Dramen staff show their own icon and open their OSRS Wiki page. Staff add requirements from one search across skills, quests, diaries and items.
- The footer shows the site's version, linked to its published source code.
- The home page shows one full-width note when there are no public journals yet, instead of a box inside the Pet collectors panel. Both home boards always show their page controls.
- Connections: the RuneLite guide and Your data sit directly under the source cards instead of at the bottom of the panel, and are always open.
- Guides show who wrote them, when they were published and when they were last updated, on the guide and on its tile. Guide tiles are a little larger with a bigger boss icon.
- Guides: the trip inventory sits beside the gear tiers as one more card; drop tables show on their own without a filter bar; odds charts pick a drop or pet straight from the boss's table; custom requirements use a task icon by default.
- Pets tab tiles look like collection log tiles: icon, name, progress bar, then kills and the estimated time left.
- Quests show how many are left; quest difficulty orbs are smaller. Collection timeline filters use the same pills as the rest of the site.
- Guides and Support use the same gaps between sections as the home page.
- Staff portal: six tabs. Players holds the directory and progress corrections; Ownership has a clearer request form; Corrections brings drop rates, kill rates and XP, dry-streak records and history together, with searches that show results as you type; Permissions history reads as plain sentences with icons.
- Guides, Leaderboard and Support open with the same banner: the castle art, the page title and Rocky. Donor hovers read Supporter instead of Sponsor.
- Support: where the money goes as four cards, and questions that open one at a time.
- Staff names show in their rank colour everywhere a name appears: boards, profiles, search suggestions and the account menu.
- Support page rebuilt: Supporter and Gilded supporter side by side, each showing how your name looks on the site and in Discord, where the money goes, the top supporters and common questions.
- Guides: item and diary requirements keep their amount on the same line; [[XP]] shows the experience icon.
- Names: the achievement title starts under the username everywhere, as in the account menu. The Helper title is now green (uncommon) to match the helper rank.
- Profiles: Sir sits right beside the name, however long the title underneath. Character scenes are framed wider so more of the scene shows, and the Mine's tunnel has depth and a lantern instead of a black panel.
- Collection timeline: before anything is dated, a faded example timeline built from your pets shows what it will look like.
- Connections: the RuneLite section explains that TempleOSRS collection logs import too, and what Refresh all sources pulls.
- Staff portal: approving corrections is its own permission. Helpers can now propose drop rates, records and kill rates by default; moderators and up approve. Admins can set helpers' and moderators' own access. Ownership requests show the from and to Discord accounts with avatars, a clear Relink or Unlink tag, and staff names with their rank scimitar.

## 0.1.0-beta.3 — 2026-10-08

First public source release (MIT). See [release notes](releases/0.1.0-beta.3.md).

- Account-type badges now show on the leaderboards and home page for every synced player, not only on their profile.
- Leaderboard names are laid out like profiles: the scimitar and account badge sit level with the name, and the achievement title centres under the username. Podium crowns follow the donation title, such as "the Generous".
- Leaderboards and the home page boards show each player's account-type badge (Ironman, Group Ironman and the rest) before their name; hovering it names the account type. The badge is the same size wherever a name shows it.
- Hovering an account-type badge now just names it, such as Group Ironman.
- New site icons: every skill, menu tab, quest and combat tier, chat, rank scimitar and account-type badge uses the refreshed icon set. The top three on each board wear gold, silver and bronze crowns, Discord links show the new Discord icon, the helper rank is an adamant scimitar, and lava flows through the Owner blade.
- Two new character scenes: a lantern-lit Mine with ore rocks, timber supports and a mine cart, and a Woodland clearing with oaks and pines, a stump and felled log, mushrooms and drifting leaves. Pick them in profile settings → Appearance.
- The staff portal uses the same horizontal tabs as the profile and leaderboard (scrolling sideways on phones), opens with a plain spinner, and each tab has its own address, such as `/staff?tab=history`.
- Awaiting review, Approved and Rejected are amber, green and red everywhere they appear in the staff portal, with a Rejected count on the overview and outcome filters in correction history. Review activity is now a stacked 14-day chart and a list of the latest submissions with who proposed and who reviewed them.
- The guide editor opens inside the staff portal as the Guides tab (`/staff/guides` still works) and reads like a document: a quiet toolbar with colour swatches, an Insert menu with descriptions, spaced sections with hover controls, an unsaved-changes indicator, and drafts that survive switching tabs.
- Guide editor: every item in gear and inventory setups now shows its in-game icon (Torva and about 4,800 other items used to show a placeholder book), and the item search covers every tradeable item, every wearable and common untradeables such as the rune pouch, with best matches first and no duplicate names.
- Guide editor requirements: switch between Items, Quests and Diaries, search, and add with one click; each result and requirement shows its official icon, and item quantities are edited in place.
- Guide editor text: the colour dots colour the highlighted words (or the whole section when nothing is highlighted), the style menu offers Paragraph, Heading, Subheading, Bulleted list and Numbered list, and an emoji button inserts the site's emojis.
- Guide editor: Save draft and Publish sit in the top bar (Publish saves first), Ctrl+S saves, and New guide asks for a title and a boss or activity, picked from a list with icons.
- New Permissions tab: the team with avatars, linked names and rank badges; promote, demote or remove staff (only the moves your rank allows); per-member custom access with a reset to rank defaults; a rank permission matrix that the owner can edit for helpers, moderators and admins; and a readable access history.
- Staff portal: the Staff & permissions tab is now Permissions, and only the owner sees it; the server refuses rank-default and member-access changes from anyone else. The owner sets what helpers, moderators and admins can open, and can give a member their own access; both are recorded in the access history.
- Staff portal: Awaiting review, Approved and Rejected show as a coloured dot and text, without a box.
- Guide workshop opens on tiles: New guide first, then every guide with its boss or activity icon, Draft, Published or Changes pending, and when it was last edited. All guides takes you back from the editor.
- Guide emojis: crossed swords, join chat and quest list are retired (guides that used them show the plain name), and :pets: is Rocky, the site mascot.
- Empty equipment slots in gear profiles and the profile editor use the game's own grey slot silhouettes; the profile editor's bottom row now reads gloves, boots, ring, as in game.
- Profile staff controls (the cog on someone's profile): set the rank with one tap and a short confirm, switch the profile between public and private, clear an achievement title or badge, unlink the RuneScape name from its Discord account or relink it, and jump to Edit progress. Admins and the owner only; every change is logged in the account history.
- Permissions tab rebuilt in the site's own style: a team list like the leaderboard (open a member to change their rank, their own access or remove the rank), rank permissions as equal-width toggles with the portal's icons, and a plain access history.
- Profile staff controls show the player's name block as on their profile; ranks are Helper, Moderator and Admin (Owner shown), with a separate Remove rank; staff can now assign an achievement title (any the player has unlocked) or an earned badge from a picker; the account row is one line with Unlink or Relink and Move to another account.
- Rank colours: Helper is green with the adamant scimitar, Moderator blue, Admin red, the Owner unchanged, everywhere ranks appear (also the rank_helper emoji).
- Characters now sway gently, turning up to 45° each way around the direction you left them facing. The sway pauses while you turn the character and is off when your device asks for reduced motion.
- Rocky the mascot now stands for the site and the Pets category: the browser tab icon, the Pets tab, summary rows, leaderboard and home totals, share images and the "All Pets" log page. Pet lists and dialogs still show the in-game Rocky.
- Profile settings no longer has a Privacy tab. Visibility and shared details live in Account settings, and saving your outfit, appearance or titles never changes them.
- Titles and emblems in profile settings are an even grid of cards. Locked choices are dimmed and say how to unlock when you hover, tap or focus them.
- Character scene choices show the actual Castle courtyard and Riverbank scenes.
- On profiles, the scimitar is a small mark on the name line beside the account-type badge, and the achievement title below starts where the username starts. Leaderboard rows centre the scimitar on the name and title.
- The account-type badge sits on the name line, at the same size for every ironman type, and scales with the name.
- Ironman, Ultimate, Hardcore, Group, Hardcore Group and Unranked Group Ironman now use the official in-game chat badges.
- Achievement titles no longer show a "?"; hover the title itself for its description, like the scimitar and "the Generous".
- Your collection timeline shows every dated pet and log slot as a lollipop: a stem from the day you got it up to a picture of the item or pet (gold for pets). A month strip runs along the bottom with the years beneath; zoom in and it switches to days. Scroll, pinch or use the buttons to zoom, and drag to move; nearby collections share one picture with a count until you zoom in. Tap a picture to see everything from that day. Choose Both, Pets or Collection log, and All time, Past year or Past 30 days.
- Insights keeps the dry meter, pets by category and the collection timeline. The Road to max and Road to every pet projections are gone.
- The site is served only at spoonedosrs.com: deploys no longer re-enable the Worker's workers.dev address or version preview URLs.
- The account menu shows a hidden donation inline beside Supporter, "Link another account" no longer has an arrow, and Sign out spans the footer with Privacy & account details as a small link underneath.
- Account settings: Public and Private are equal-size buttons, and the Discord section uses the Discord logo.
- Skills with no XP never show a Hiscores rank colour or crown, whatever rank a source reports.
- Leaderboard loading rows take the space of the tallest loaded row (a long name with its title), so the board no longer jumps when it loads.
- Headings and paragraphs no longer leave a single word alone on their last line.
- The Discord logo in account settings no longer sits on a coloured tile.
- Board ranks 1–3 get a gold, silver or bronze crown beside the name and a matching rank number, on every leaderboard and the home page.
- Bronze, silver and gold Hiscores ranks are easier to tell apart: copper bronze, cool silver and bright gold glows, edges and a faint tile tint, on skills and boss ranks.
- The profile loading skeleton uses the profile's own layout, so panels open where they finish instead of shifting.
- A background refresh every ten minutes gives profiles that never had a full pull one pass over OSRS Hiscores, RuneProfile, TempleOSRS and Wise Old Man (two at a time, spaced for TempleOSRS), starting with claimed names. Private profiles and unlinked names are skipped.
- Unclaimed profiles saved in the older full format (for example after a name was unlinked) now get the same daily all-source pull as other searched names, keeping their manual records. Previously they only ever refreshed OSRS Hiscores.
- The live site check explains each source it could not read (for example, a player not tracked on RuneProfile) and can sync a chosen player through the optional `DEPLOY_CHECK_PLAYER` Actions variable.
- The account menu shows your Discord picture, uses the RuneScape settings wrench instead of cogs, and "Link another account" is now a matching row that opens a one-line name field with a Link button.
- Account settings show your Discord picture and each profile's character head. Visibility and the tick boxes for what your profile shows sit together in one compact card, and "Save privacy" is a clearer button that says when changes are unsaved and when they are saved.
- The Discord section is now a single "Sync Discord roles" button: if you're in the SpoonedOSRS server, your website staff and supporter roles are applied there within a few minutes. The site never changes your server nickname.


## 0.1.0-beta.2 — 2026-10-07

Second beta: searching a name shows everything public about it, and leaderboard previews are rebuilt for phones.

- Searching a new name pulls OSRS Hiscores, RuneProfile, TempleOSRS and Wise Old Man at once, so the profile shows stats, the collection log, pets, quests, diaries and combat achievements before anyone claims it. Unclaimed names repeat the full pull at most daily (TempleOSRS allows one request every 12.5 seconds site-wide); other searches refresh Hiscores only. A busy source never removes data that was already found.
- Every leaderboard preview shows the same Pets, Collection log and Total level cards (Combat tasks instead of the collection log on the Combat achievements board), then one summary row: skills maxed, pets collected, collections complete, combat tiers complete or quests complete.
- Only the board's own category opens in detail. The Combat achievements board opens tier progress; the skill bar chart and hint text are gone.
- Collection log previews use the profile's activity icons and progress tiles, with a category dropdown beside search. The collection page has a header with icon, count and progress bar, and pets and items share in-game style slots with quantities.
- Top-ranked skills glow like ranked bosses, with a faint bronze, silver or gold tile edge; the record holder's crown sits in the tile's free space.
- Leaderboard totals stay right-aligned on phones, and previews use a lighter "View full profile" link.
- Cross-site writes are refused with 403 everywhere; some routes reported them as a 503 "could not save" error.
- Staff, moderation, guide, privacy and account feature checks run on every pull request and release against the production build (`npm run test:integration`), including a new check for staff ranks, the audit trail and corrections review.
- A Live site check runs after every push to `main` and every six hours: version, security headers, signed-out boundaries, Discord login, a public all-source search probe and, with `DEPLOY_CHECK_SECRET`, a signed real sync.

See [release notes](releases/0.1.0-beta.2.md).

## 0.1.0-beta.1 — 2026-10-07

First beta deployed for testers. Beta versions deploy to production from `main`; release candidates never do.

- Fix every Hiscores, RuneProfile, Temple and Wise Old Man refresh failing on Cloudflare with "Invalid redirect value". Provider redirects are still never followed, and a test runs the provider client in the Workers runtime.
- Start the one-minute refresh cooldown only after a refresh is saved. Failed refreshes and player searches no longer make players wait.
- Limit each Discord account to 10 reserved RuneScape names, counting unlinked names, so names cannot be squatted in bulk.
- Show players only the site's own error messages; runtime and database errors fall back to a plain retry message.
- Send HSTS on production responses, update sharp to 0.35.5 and remove an unused header-trusting sign-in helper.
- Check Discord login, name claiming and all-source sync against the production build on every pull request (`npm run test:beta`).
- Verify a real provider sync after every production deploy through a signed `/api/health/sync` check (`DEPLOY_CHECK_SECRET`).
- Read database, Discord and owner identifiers from Workers Builds variables instead of source code.
- Give the type check its own 4 GB heap so cold builds succeed without extra build settings.

See [release notes](releases/0.1.0-beta.1.md).

## 0.1.0-rc.4 — 2026-10-07

- Highlight top-ranked skills with shared gold, silver and bronze styling on profiles and leaderboard previews.
- Crown current synced rank #1 skills and expose rank tiers in tooltips and accessible labels.
- Respect reduced-motion preferences for the record-holder glow.

## 0.1.0-rc.3 — 2026-10-07

- Fit full XP values within leaderboard columns and place the skill filter right of search.
- Browse collection previews through category and activity progress tiles, search and pagination.
- Use all-source refresh consistently for profile callbacks.
- Fix cold GitHub verification memory capacity and stop tracking generated compiler caches.

Versions describe reviewed source snapshots. A changelog entry does not mean a
version has been deployed. Deployment is verified separately against the live
site and Cloudflare build result.

## 0.1.0-rc.2 — 2026-10-07

- Use labelled staff navigation with a collapsible mobile menu and a staff-only header shortcut.
- Search destination Discord accounts by username, ID or linked RuneScape name when preparing relink requests.
- Keep leaderboard totals in the right column on phones and remove follower pets from ranking rows.
- Rebuild the castle courtyard with an arched gate, watchtowers, stonework and garden borders.

See [release notes](releases/0.1.0-rc.2.md).

## 0.1.0-rc.1 — 2026-10-07

First release candidate for the community tracker, profile customisation,
document-style guides, moderation workflows and shared upstream request
controls. This candidate is under verification and has not been published as a
stable release.

See [release notes](releases/0.1.0-rc.1.md) for scope, database requirements and
known limitations.
