# Pet records and calculations

## Current progress and acquisition history

Hiscores is a current snapshot. Its KC is not evidence of the KC when a pet was obtained. Sync never fills an acquisition count from current Hiscores and never overwrites saved historical segments.

A pet record can store the received-at count, its unit, received-from method, date, approximate flag, optional starting counter and optional recorded hours. A received-at level is useful history but only gives an XP interval. It is not exact XP or exact play time.

For a single method, estimated time to pet is `(received count - starting count) / hourly pace`. A missing start assumes zero and the UI says so. Only eligible activity belongs in this count: lifetime skill XP can include lamps, quests and unrelated methods. The app no longer turns lifetime XP into recorded hunt time.

For mixed methods, add one historical segment per method/period. Counts are amounts completed during that segment, not cumulative totals. Each segment saves its own unit, count, pace and optional denominator/mean XP. Hours are the sum of `segment count / segment pace`. An incomplete segment leaves the total unknown. Explicit recorded hours take precedence. Current KC remains separate.

## Chance of at least one

For independent eligible attempts with fixed probability `p`, cumulative chance after `n` attempts is `1 - (1 - p)^n`. At 85 eligible kills with a 1/75 rate, this is about 68.1%. Previous misses do not increase the next-roll chance.

For historical segments with different fixed rates, multiply their no-drop probabilities and subtract from one. Every segment needs a rate to calculate combined likelihood. XP-based methods use the continuous approximation `1 - exp(-XP / meanXP)`; real rolls happen on eligible actions. A level alone is never converted into an exact historical likelihood.

Item charts use the selected source and a matching source count. Nex contribution-based odds are withheld because raw KC and its base table rate do not define a personal chance. Other table conditions still apply: the graph assumes every entered kill was eligible and the rate was constant. Multiple sources are not combined into one KC. Unknown probabilities stay unknown.

## Planning versus observed effort

A mean hunt is denominator divided by pace. It is an expectation, not a promise or time already spent. A 95% budget solves the cumulative formula for attempts, then divides by pace. The selected method, pace and whether it is a default estimate are shown in the UI.

Staff can propose fixed rates and hourly paces with an evidence URL; a different authorised reviewer must approve publication. Existing player-customised paces are preserved. Observed average XP per pet is a separately labelled reference, never substituted for a Wiki probability. Self-reported successful hunts are subject to selection bias and starting-XP ambiguity.

Historical segment rates and paces are snapshots: later staff updates do not silently rewrite them. Users must enter their historical method conditions (level, team, raid level, boost, reward rolls) accurately. Current-level Wiki formulas cannot reconstruct a complete past hunt automatically.

## Release dates

`lib/release-dates.json` contains explicit dates and source metadata. Pet and boss heads sort ascending by date, retaining catalogue order for ties; unknown dates sort last. Boss dates mean first availability in OSRS, so bosses already present at launch share 22 February 2013. Mode releases can differ from base bosses. Pet release dates can differ from boss releases.

Pet dates were transcribed from the OSRS Wiki Pet table snapshot linked in the catalogue; individual boss dates use their corresponding Wiki release/update information. These are curated reference facts, not live API fields. Corrections should include the relevant source and update tests.


### Exact odds-chart markers

Both compact and full pet curves include the exact entered count in their tooltip dataset, in addition to evenly spaced samples. The yellow point, line, caption and tooltip use the same count and probability. Discrete roll samples use whole counts; continuous XP retains its precision. Abyssal protector's stored `rewards` unit is displayed as searches (one Rewards Guardian search per pet roll), never Guardians of the Rift game completions. At 775 searches and 1/4,000 per search, cumulative probability is approximately 17.6%.

A compatible obtained count takes priority, including any explicit hunt-start offset. If acquisition count is absent, the graph may show the selected method's current eligible count, explicitly labelled Current progress; it does not claim that was the acquisition count. Mismatched acquisition units and mixed historical hunts do not silently fall back to a misleading single-rate curve. Missing current progress has no personal marker. These cases are covered by `lib/odds-chart.test.ts`.

### Tree-run time

Tangleroot's mixed/fruit-tree presets measure XP/hour as active route time. Mixed = six magic and six palm trees, 145,046.4 planting/check XP in an example 15 active minutes. Fruit-only = six palms, 61,563.6 XP in ten minutes. Growth and offline time are not active play time.

The separate calendar estimate uses mean XP / XP per full route × interval between routes. A saved `Method.farmingRunsPerDay` overrides the explicitly labelled one-run/day example. The interval is at least the 16-hour palm growth cycle (magic: eight hours) and the active duration of the route. Trees grow concurrently; growth is not summed per patch. Values are validated from 0.01 to 1.5 full runs/day and allowlisted by the journal API. No inferred schedule is saved into an existing record.

This is a long-run planning approximation, not a reconstruction of acquisition dates: initial growth phase, missed runs, disease, growth-cycle alignment and extra magic-only runs are not modelled. Active time still uses saved XP/hour, and changing frequency never changes odds. Unknown/custom routes do not inherit these assumptions. Sources: https://oldschool.runescape.wiki/w/Tree_farming_guide and https://oldschool.runescape.wiki/w/Tangleroot.
