# Design principles

SpoonedOSRS should look like one site. Every change follows these rules; anything that would break one needs the owner's approval first, shown as a before/after screenshot.

## 1. Same job, same component

| Job | Use | Never |
| --- | --- | --- |
| Main action | `.btn.primary` (gold) | A new colour or shape for one screen |
| Other actions | `.btn` / `.btn.ghost`, same height as the primary next to it | Buttons of different heights side by side |
| Choosing one of two or three options | Equal-width buttons in one row | Options of different widths |
| Switching sections | Horizontal tabs like the profile and leaderboard (`.wtabs`, board tabs) | Vertical side navigation |
| Explaining a value | `HoverTip` on the value itself | A "?" icon next to it |
| Status | Amber = awaiting, green = done/approved, red = rejected/failed | Other colours for the same states |
| Rank metals | Copper bronze, cool silver, bright gold, glowing record holder (`app/skill-ranks.css`) | New tier colours |
| A section's summary | One row under the cards: name left, "X of Y …" right | Extra hint lines |

## 2. Icons

- **Game things use the site icon set** (`public/icons`: skills, tiers, ranks, account types, interface) **or official OSRS artwork** from `public/` (bosses, pets, items). New icons come from the icon pack (`artwork/ui-skills`, installed with `node scripts/install-icon-pack.mjs`); never draw a one-off substitute.
- **Generic interface actions use the line icon set** (lucide): close, back, search, chevrons, external link, sign out, unlink, refresh.
- One concept, one icon, everywhere. If the account menu uses the wrench for settings, every settings entry uses the wrench.
- **Icons are never boxed.** No background tile, border or circle behind an icon. Item and pet slots are the only exception, because they copy the in-game collection log.
- Third-party brands use their own mark (the Discord logo for Discord).

## 3. Text

- Say it in as few words as possible. Labels beat sentences; one short helper line at most.
- No paragraphs that explain how a control works when the control can show it.
- **No single word alone on the last line.** Paragraphs use `text-wrap: pretty` and headings `text-wrap: balance` (set globally in `app/globals.css`). If a line still breaks badly, shorten the text.
- Don't repeat what the card above already shows.

## 4. Layout

- Reuse the existing spacing, panels (`.panel`, `.osrs-panel`) and card styles. Don't add new borders, shadows or backgrounds to make one area different.
- Phones first: check 390px wide. Nothing scrolls sideways, tap targets are at least 40px, and rows keep one line where possible.
- Loading skeletons reserve the **largest** space the loaded content can take (for example two-line names with a title), so nothing jumps.

## 5. Changing an existing area

- Change what was asked. A "visual upgrade" keeps the area's structure, components and icons unless the owner asked for a redesign.
- Show before/after screenshots on phone and desktop before shipping a visual change.
