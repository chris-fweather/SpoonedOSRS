# Rate and effort audit — 5 October 2026

Compared all 71 canonical pets against a cached response from [Temple pet hours](https://templeosrs.com/api/pets/hours.php). 68 pets have a matching benchmark; Aggy, Maggot marquess and Mr McGroot do not. The CSV lists each selected default method and all matching Temple variants (78 comparison rows). Matching numeric inputs do not establish that a player's technique matches Temple's assumptions. Temple describes this table as [Petcord spreadsheet data](https://templeosrs.com/pets/hours.php); it is not a Jagex-authored personal pace model.

## Corrections and material differences

- **Phoenix:** the supplied in-game screenshot shows 5,504 rewards claimed and 2,425 kills. [The Wiki rate](https://oldschool.runescape.wiki/w/Phoenix) is 1/5,000 per reward roll before 200M Firemaking XP. Chance by this count is 66.7432%, or 33.2568% still dry; 1.1008 times the denominator. Subdues never substitute for rolls. Temple's 50 rolls/hour gives a 100-hour mean and 110.08 hours of estimated effort, not measured play time. Choosing a future 200M method no longer boosts historical rolls. At 200M, a combined historical counter is insufficient without separating pre/post-200M rolls, so historical probability is left unknown.
- **Nexling:** the old Wiki import turned 1/4,100 into 1/500 per personal kill, making the mean 21.3 hours. [Nex's drop mechanics](https://oldschool.runescape.wiki/w/Nex) apply contribution and an MVP bonus to the base pet roll. Restored the explicitly labelled Temple planning benchmark (4,100 / 23.5 = 174.47 hours). It is not a verified personal probability. Existing custom methods are not replaced.
- **Rocky:** Temple's 34,015 at 1,915 actions/hour is a level-99 seed-stall reference (~17.76 hours). The tracker defaults to Ardougne knights: (257,211 − 25 × 99) / 2,000 ≈127.37 hours. A player's total Thieving XP cannot tell us how much was eligible under each method. XP/h belongs with an XP denominator; actions/h belongs with an action denominator.
- **TzRek-Jad:** Temple's rounded denominator 67 and 2.5 runs/hour give about 27 hours. This corresponds to different task/cape assumptions from off-task 1/200. Obifloat's stated 30-minute off-task keep-cape pace gives 100 hours. Neither prior KC nor going dry reduces the future mean.
- **Lil' Creator:** Temple's 12,000 Zeal at 430 Zeal/hour is about 28 hours. Our explicitly labelled 150-Zeal/hour example is 5 crates/hour at 1/400 = 80 hours. A Zeal count is not a crate count.
- **Callisto cub:** Temple uses 2,800, which matches Artio; Callisto's listed rate differs. Method/source distinctions are retained.
- **Bloodhound:** Temple returns 1,000, 10 per hour, and 273 hours. The listed total does not equal 1,000 / 10. The API does not explain the additional timing assumptions, so the stored reference total is displayed separately, not reverse-engineered as measured pace.
- **Dom, raids, skilling and other conditional methods:** Temple's method-specific reference must not overwrite varying delve, team-size, raid-level, unique-reward or skill-level conditions. These figures remain projections. This audit does not certify every conditional source as a universal drop rate.

## Snapshot comparison

[Temple player stats](https://templeosrs.com/api/player_stats.php?player=Obifloat&bosses=1) were dated 1 September 2026, 23:21:08, despite being fetched on 5 October. Wintertodt was 2,425 and Firemaking 57,139,030 XP. Nine skills differed from the newer saved journal (Attack, Strength, Hitpoints, Ranged, Magic, Crafting, Mining, Runecraft and Hunter). The older Temple snapshot is not used to overwrite newer account progress.

## Calculation conventions

Per-roll probability is `1 − (1 − 1/rate)^eligible_count`. Independent recorded methods combine their no-drop probabilities. Mean future hours = denominator / matching-unit hourly pace; a 95% budget uses the geometric quantile, not mean minus historical effort. Historical effort derived from count / pace is labelled **Estimated effort**; **Recorded time** is reserved for an entered duration. The all-pets budget states how many hunts have a usable rate and pace and is not a guarantee or a sum of measured sessions.

## Verification

Unit tests cover Phoenix counters, future-method changes, Nex personal-rate handling, XP/action consistency and future probability budgets. API checks verify the screenshot count reaches the journal, and owner-account linking preserves authorisation and prevents self-reputation. The raw Temple reference snapshot is bundled with its fetch date for reproducibility. Browser automation is unavailable in this task; the supplied screenshots guided layout repairs, but a fresh interactive visual review remains necessary.
