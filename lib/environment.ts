/** Which deployment this code runs in. `__SPOONED_ENV__` is set at build time (SPOONED_ENV); tests and local runs are production-like. */
declare const __SPOONED_ENV__: string | undefined;
export const IS_DEV_ENVIRONMENT = typeof __SPOONED_ENV__ !== 'undefined' && __SPOONED_ENV__ === 'dev';
/** The dev environment holds one profile only: the owner's Obifloat. */
export const DEV_PROFILE = 'obifloat';
/** Dev keeps every account and profile write to the owner and Obifloat; production allows everything. */
export function devAllowsProfile(rsn: string, dev = IS_DEV_ENVIRONMENT) { return !dev || rsn.trim().toLowerCase() === DEV_PROFILE; }
export function devAllowsAccount(discordId: string, owners: readonly string[], dev = IS_DEV_ENVIRONMENT) { return !dev || owners.includes(discordId); }
