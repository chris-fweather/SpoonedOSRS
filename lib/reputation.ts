export type Reputation = {
  networkUsed?: boolean;
  canVote?: boolean;
  count: number;
  given: boolean;
  signedIn: boolean;
  ownProfile: boolean;
  available: boolean;
};

export function reputationHint(rep: Reputation): string {
  if (rep.given) return 'You gave respect. Click to undo.';
  if (!rep.available) return 'This player needs a saved journal before receiving respect.';
  if (rep.ownProfile) return 'Visitors can give you respect. You cannot give it to yourself.';
  if(rep.canVote===false)return 'Your connection could not be verified. Please retry.';
  if(rep.networkUsed)return 'This connection has already commended this profile.';
  return 'Give respect. One +1 per connection on this profile; no sign-in needed.';
}
