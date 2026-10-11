import assert from 'node:assert/strict';
import test from 'node:test';
import {assertFlair, badgeCatalogue, badgeTier, CLOG_UNIQUE, clogMilestones, coerceFlair, displayTitle, DONATOR_TITLE, earnedMarks, isMaxed, petFloats, profileSaveBody, rankClaims} from './flair.ts';
import type {Journal} from './model.ts';

function journal(partial: Partial<Journal>): Journal {
  return {
    username: 'Test',
    pets: [],
    hiscores: {skills: [], activities: []},
    log: null,
    statsSyncedAt: null,
    logSyncedAt: null,
    revision: 0,
    ...partial,
  } as Journal;
}

test('collection log milestones are shares of 1,717 unique items', () => {
  const steps = clogMilestones();
  assert.equal(CLOG_UNIQUE, 1717);
  assert.deepEqual(steps.map(step => step.count), [17, 86, 172, 343, 429, 687, 859, 1030, 1288, 1545, 1717]);
  assert.equal(steps[0].detail.includes('1,717'), true);
});

test('marks follow pets, max cape, and collection log count', () => {
  const skills = ['Attack', 'Hitpoints', 'Mining', 'Strength', 'Agility', 'Smithing', 'Defence', 'Herblore', 'Fishing', 'Ranged', 'Thieving', 'Cooking', 'Prayer', 'Crafting', 'Firemaking', 'Magic', 'Fletching', 'Woodcutting', 'Runecraft', 'Slayer', 'Farming', 'Construction', 'Hunter', 'Sailing'];
  const early = journal({
    pets: Array.from({length: 71}, (_, index) => ({id: String(index), name: 'Pet', obtained: index < 10})),
    log: {obtained: 171, total: 1717, tabs: []},
  });
  assert.deepEqual(earnedMarks(early).map(mark => mark.id), ['pets-1', 'pets-5', 'pets-10', 'clog-17', 'clog-86']);
  assert.equal(assertFlair(early, {pinnedMark:'pets-5'}).pinnedMark, 'pets-5');
  assert.throws(() => assertFlair(early, {pinnedMark:'pets-15'}), /earned/);
  const full = journal({
    pets: Array.from({length: 71}, (_, index) => ({id: String(index), name: 'Pet', obtained: true})),
    hiscores: {skills: skills.map(name => ({name, level: 99, xp: 13_000_000, rank: 1})), activities: []},
    log: {obtained: 1717, total: 1717, tabs: []},
  });
  assert.equal(isMaxed(full), true);
  assert.equal(earnedMarks(full).some(mark => mark.id === 'max-cape'), true);
  assert.equal(earnedMarks(full).some(mark => mark.id === 'clog-1717'), true);
  assert.equal(earnedMarks(full).some(mark => mark.name === DONATOR_TITLE), false);
  assert.equal(badgeCatalogue(full).find(mark => mark.id === 'max-cape')?.img, '/icons/ranks/max-cape.png');
  assert.equal(badgeTier('pets-5'), 'bronze');
  assert.equal(badgeTier('pets-10'), 'silver');
  assert.equal(badgeTier('pets-30'), 'platinum');
  assert.equal(badgeTier('pets-20'), 'gold');
  assert.equal(badgeTier('pets-50'), 'diamond');
  assert.equal(badgeTier('pets-all'), 'legendary');
});

test('public donor suffixes require server-authorised eligibility', () => {
  assert.equal(displayTitle('Obifloat', null), null);
  assert.equal(displayTitle('obifloat', 'the Maxed'), null);
  assert.equal(displayTitle('Someone', null), null);
  assert.equal(displayTitle('Someone', DONATOR_TITLE), DONATOR_TITLE);
});

test('title is not granted unless it is explicitly the Generous', () => {
  const j = journal({pets: [{id: '1', name: 'Rocky', obtained: true}] as Journal['pets']});
  assert.equal(coerceFlair(j, {title: DONATOR_TITLE}).title, DONATOR_TITLE);
  assert.equal(coerceFlair(j, {title: 'the Maxed'}).title, null);
  assert.throws(() => assertFlair(j, {title: 'the Maxed'}), /not available/);
  assert.equal(assertFlair(j, {title: ''}).title, null);
});

test('profile settings saves appearance and titles without touching Account privacy', () => {
  const j = journal({pets: [{id: '1', name: 'Rocky', obtained: true}] as Journal['pets']});
  const stale = {...coerceFlair(j, {companionPet: '1'}), canEdit: true, visibility: 'private' as const, details: {pets: false, log: false, quests: false, diaries: false, combat: false, skills: false, petRecords: false}, showDonation: false, titleChoice: 'none', appearance: {body: 'female' as const, hair: 'blonde' as const, skin: 'brown' as const, background: 'castle' as const}};
  const body = profileSaveBody(j, stale, false);
  for (const key of ['visibility', 'details', 'showDonation']) assert.equal(key in body, false, key);
  assert.equal(body.titleChoice, 'none');
  assert.deepEqual(body.appearance, stale.appearance);
  assert.equal(body.companionPet, '1');
});

test('companion and displayed piece must already be obtained', () => {
  const j = journal({
    pets: [
      {id: '1', name: 'Rocky', obtained: true},
      {id: '2', name: 'Heron', obtained: false},
    ] as Journal['pets'],
    log: {obtained: 1, total: 2, tabs: [{name: 'Other', pages: [{name: 'Page', obtained: 1, total: 1, items: [{id: 4151, name: 'Abyssal whip', quantity: 1}, {id: 1163, name: 'Rune full helm', quantity: 0}]}]}]},
  });
  assert.equal(assertFlair(j, {companionPet: '1', displayPiece: 'item:4151'}).displayPiece, 'item:4151');
  assert.throws(() => assertFlair(j, {companionPet: '2'}));
  assert.throws(() => assertFlair(j, {displayPiece: 'item:1163'}));
  assert.equal(petFloats('Rocky'), false);
  assert.equal(petFloats('Pet Kraken'), true);
});

test('worn gear has to be an owned item with a model for that slot', () => {
  const j = journal({
    log: {obtained: 2, total: 3, tabs: [{name: 'Other', pages: [{name: 'Page', obtained: 2, total: 3, items: [
      {id: 6570, name: 'Fire cape', quantity: 1},
      {id: 2581, name: 'Robin hood hat', quantity: 1},
      {id: 21295, name: 'Infernal cape', quantity: 0},
    ]}]}]},
  });
  const worn = assertFlair(j, {equipped: {cape: '6570', head: '2581'}});
  assert.equal(worn.equipped.cape, '6570');
  assert.equal(worn.equipped.head, '2581');
  assert.equal(worn.equipped.body, null);
  assert.throws(() => assertFlair(j, {equipped: {cape: '21295'}}), /can wear/);
  const legacy = coerceFlair(j, {displayPiece: 'item:6570'});
  assert.equal(legacy.equipped.cape, '6570');
});

test('leaderboard ranking does not invent rows', () => {
  assert.deepEqual(rankClaims([]), []);
  const ranked = rankClaims([
    {name: 'Bee', title: null, pets: 2, log: 10},
    {name: 'Aay', title: DONATOR_TITLE, pets: 2, log: 40},
    {name: 'Cee', title: null, pets: 5, log: 1},
  ]);
  assert.deepEqual(ranked.map(row => row.name), ['Cee', 'Aay', 'Bee']);
});
