/** The site's emoji set: the SpoonedOSRS Discord emoji pack (artwork/discord/emojis/manifest.json), drawn from the site's own artwork.
 * Guides write them as :name:. The animated owner rank is left out because it needs the site's lava effect.
 * `pets` is Rocky, the site mascot from the nav bar. A name that is not here (for example a retired emoji) stays plain text. */
export const GUIDE_EMOJIS:Record<string,string>={
 pets:'/brand/rocky-mascot.webp',clogs:'/icons/navigation/collection-log-icon.png',quests:'/icons/navigation/quest-point-icon.png',diaries:'/icons/navigation/achievement-diaries-icon.png',leaderboard:'/icons/navigation/stats-icon.png',
 combat:'/icons/navigation/combat-achievements.png',support:'/icons/community/support-coins.png',supporters:'/icons/community/supporters-heart.png',connections:'/icons/community/settings-icon.png',
 friends_chat:'/icons/community/friends-chat.png',clan_chat:'/icons/community/clan-chat.png',friends_list:'/icons/community/friends-list.png',
 skills:'/icons/navigation/skills-icon.png',combat_tasks:'/icons/navigation/combat-achievements-icon.png',collection_log:'/icons/navigation/collection-log.png',
 max_cape:'/icons/ranks/max-cape.png',
 rank_helper:'/icons/ranks/adamant-scimitar.png',rank_moderator:'/icons/ranks/rune-scimitar.png',rank_admin:'/icons/ranks/dragon-scimitar.png',rank_gilded:'/icons/ranks/gilded-scimitar.png',
 combat_easy:'/icons/tiers/ca-easy.png',combat_medium:'/icons/tiers/ca-medium.png',combat_hard:'/icons/tiers/ca-hard.png',combat_elite:'/icons/tiers/ca-elite.png',combat_master:'/icons/tiers/ca-master.png',combat_grandmaster:'/icons/tiers/ca-grandmaster.png',
 quest_novice:'/icons/tiers/novice.png',quest_intermediate:'/icons/tiers/intermediate.png',quest_experienced:'/icons/tiers/experienced.png',quest_master:'/icons/tiers/master.png',quest_grandmaster:'/icons/tiers/grandmaster.png',quest_special:'/icons/tiers/special.png',
};
export const guideEmojiLabel=(name:string)=>name.replaceAll('_',' ');
