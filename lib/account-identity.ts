/** Explicit owner-only account link requested by the site owner. No name-based matching.
 * IDs come from OWNER_DISCORD_IDS at build time: the first is the canonical owner identity and
 * the rest are linked owner logins. Server-only; never import this from client components. */
declare const __SPOONED_OWNERS__:string[]|undefined;
// Unit tests run without Vite and get inert identifiers.
export const OWNER_DISCORD_IDS:readonly string[]=typeof __SPOONED_OWNERS__==='undefined'?['100000000000000003','100000000000000004']:__SPOONED_OWNERS__;
export function accountIdentity(discordId: string): string {
  return OWNER_DISCORD_IDS.includes(discordId) ? OWNER_DISCORD_IDS[0] : discordId;
}
