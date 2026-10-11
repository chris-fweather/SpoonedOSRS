# UI and skill icon exports

70 transparent PNGs from the approved UI + skills concept preview: 24 skills and 46 interface icons. Each file is 256 by 256 pixels.

## Contents

- navigation: 9
- community: 9
- ranks: 10
- tiers: 12
- skills: 24
- account-modes: 6

The manifest maps each export to its existing reference path and approved atlas cell. Some skill references live under the existing bosses directory; these are skill symbols, not boss artwork.

The site serves this pack from public/icons, installed by `node scripts/install-icon-pack.mjs` (trimmed, scaled smoothly to 128px, 160px for tiers). The helper's adamant scimitar and the Owner blade's lava mask are derived there; crossed swords and the white scimitar are not used. No pet, boss, character, equipment, or collection-item redesigns are included. Support coins and rank scimitars are included as interface symbols.

## Rendering

Use an image element with object-fit: contain. Quest and diary icons use the same canvas size. Suggested preview sizes: 28px tabs, 24px progress rows, 76px combat tier cards. Preserve original dimming for incomplete achievements.

## Provenance

AI-generated raster concepts based on the existing OSRS-themed interface references, exported from the reviewed local design atlases on 2026-10-08. These are the approved preview drawings, not vector files or 3D models. This export does not establish rights clearance for the referenced game designs.

Exporting preserves each atlas cell and its transparent padding, downsampled to 256px. The collection-log tab uses the preview's existing edge clipping to exclude a neighbouring mascot fragment. Some fine edge colour fringes from the concept atlases remain and should be reviewed at the intended display size before integration.

## Discord addition

community/discord.png is the approved white faceted Discord icon with a purple border, exported at 256px with transparency. Generated using built-in image_gen and added on 2026-10-08. It is a new standalone asset, so its manifest referencePath is null. No application integration is included.

## Leaderboard crowns

The matching ranks/crown-gold.png, ranks/crown-silver.png and ranks/crown-bronze.png represent first, second and third place. Generated with built-in image_gen on 2026-10-08. Prompt direction: a simple three-point faceted crown with a broad band, transparent background, and gold, silver or bronze metal finish. Each is 256px. Intended for 16 to 24px display beside player names; verify in context before integration. New standalone assets have referencePath set to null.
