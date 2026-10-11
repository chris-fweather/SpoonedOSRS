import {supporterTitle} from './staff-appearance';
import {publicBoardMemo} from './public-board-cache';
import {supporterPositions} from './supporter-ranking';
import {hydratePublicJournal} from './public-journal';
import {parseAppearance,DEFAULT_APPEARANCE,SKIN_TONES,type Appearance} from './appearance';
import {parsePresentation, selectedTitle, signatureTitle, type Presentation} from './presentation';
import {HttpError, ensureAuthTables, readSession} from './auth';
import {assertFlair, coerceFlair, displayTitle, DONATOR_TITLE, emptyEquipped, badgeCatalogue, rankClaims, type BoardRow, type StoredFlair} from './flair';
import {journalForViewer, validVisibility, parseDetails, DEFAULT_DETAILS, type ProfileDetails, type Visibility} from './profile-privacy';
import {publicStaff, publicStaffList} from './staff-data';
import type {Journal} from './model';
import {journalStats, type CommunityStats} from './community';
import {accountName, db, readJournal, sameOrigin} from './storage';
import {publicMessage} from './request-body';

type ClaimRow = {
  discord_id: string;
  companion_pet: string | null;
  display_piece: string | null;
  equipped: string | null;
  pinned_mark: string | null;
  title: string | null;
  visibility: Visibility | null;
};


type StyleRow={staff_badge:Presentation['staffBadge'];staff_prefix:Presentation['staffPrefix'];title_choice:string;show_donation:number;amount_minor:number|null;currency:string|null};
function presentation(row:Partial<StyleRow>|null):Presentation{return {staffBadge:row?.staff_badge??null,staffPrefix:row?.staff_prefix??null,titleChoice:row?.title_choice??'auto',showDonation:row?.show_donation!==0};}
function donation(row:Partial<StyleRow>|null){return {amountMinor:row?.show_donation===0?null:row?.amount_minor??null,currency:row?.currency??'USD',hidden:row?.show_donation===0,badge:row?.staff_badge==='gilded'?'gilded' as const:null};}

type OptionsRow={details:string;skin:string;background:Appearance['background']};
async function profileOptions(name:string){const row=await db().prepare('SELECT details,skin,background FROM profile_options WHERE rsn=?').bind(name.toLowerCase()).first<OptionsRow>();return {background:row?.background??'none',details:row?parseDetails(JSON.parse(row.details)):DEFAULT_DETAILS,skin:row?.skin&&Object.hasOwn(SKIN_TONES,row.skin)?row.skin:'default'};}
function storedEquipped(raw: string | null): unknown {
  if (!raw) return undefined;
  try { return JSON.parse(raw) as unknown; } catch { return undefined; }
}

export async function publicProfile(username: unknown, viewerId: string | null): Promise<StoredFlair> {
  const name = accountName(username);
  await ensureAuthTables();
  const row = await db().prepare(
    `SELECT c.discord_id, c.companion_pet, c.display_piece, c.equipped, c.pinned_mark, u.title, v.visibility
     FROM claimed_names c JOIN users u ON u.discord_id = c.discord_id LEFT JOIN profile_visibility v ON v.rsn=c.rsn WHERE c.rsn = ?`,
  ).bind(name.toLowerCase()).first<ClaimRow>();
  if (!row) return {companionPet: null, displayPiece: null, equipped: emptyEquipped(), pinnedMark: null, title: displayTitle(name, null), canEdit: false};
  const journal = await readJournal(name);
  const clean = coerceFlair(journal, {
    companionPet: row.companion_pet,
    displayPiece: row.display_piece,
    equipped: storedEquipped(row.equipped),
    pinnedMark: row.pinned_mark,
    title: row.title,
  });
  const style=await db().prepare('SELECT p.*,COALESCE(pd.amount_minor,d.amount_minor) AS amount_minor,COALESCE(pd.currency,d.currency) AS currency FROM claimed_names c LEFT JOIN profile_presentation p ON p.rsn=c.rsn LEFT JOIN supporter_totals d ON d.discord_id=c.discord_id LEFT JOIN profile_supporter_totals pd ON pd.rsn=c.rsn WHERE c.rsn=?').bind(name.toLowerCase()).first<StyleRow>();
  const body=await db().prepare('SELECT body_type AS body,hair_color AS hair FROM profile_appearance WHERE rsn=?').bind(name.toLowerCase()).first<Appearance>();
  const options=await profileOptions(name);
  const supporter=(style?.amount_minor??0)>0||row.title===DONATOR_TITLE;
  clean.title=supporterTitle(style?.amount_minor,style?.currency);
  const prefs=presentation(style), role=await publicStaff(row.discord_id), isOwner=role?.role==='owner';
  const chosen=badgeCatalogue(journal).find(m=>m.id===row.pinned_mark&&m.unlocked);
  if(chosen)clean.pinnedMark=chosen.id;
  const staff=role?{...role,displayRole:isOwner&&prefs.staffBadge!=='gilded'?prefs.staffBadge:null,displayPrefix:prefs.staffPrefix}:null;
  const pet=journal.pets.find(p=>p.id===clean.companionPet&&p.obtained);
  return {...clean,...prefs,supporter,details:options.details,appearance:parseAppearance({...body??DEFAULT_APPEARANCE,skin:options.skin,background:options.background}),donation:donation(style),ownerShowcase:!!chosen&&!chosen.unlocked, title: displayTitle(name, clean.title), visibility:row.visibility??'public', canEdit: viewerId === row.discord_id, staff,showcase:{badge:chosen??null,pet:pet?{id:pet.id,name:pet.name}:null,achievementTitle:selectedTitle(journal,prefs.titleChoice,clean.pinnedMark,isOwner,supporter,staff?.role)}};
}

export async function profileJournal(request:Request, username:unknown):Promise<Journal> {
  const name=accountName(username), session=await readSession(request);
  await ensureAuthTables();
  const [row,claim,journal,options]=await Promise.all([
   db().prepare('SELECT visibility FROM profile_visibility WHERE rsn=?').bind(name.toLowerCase()).first<{visibility:Visibility}>(),
   db().prepare('SELECT discord_id FROM claimed_names WHERE rsn=?').bind(name.toLowerCase()).first<{discord_id:string}>(),
   readJournal(name),profileOptions(name),
  ]);
  return journalForViewer(journal,row?.visibility??'public',!!session&&claim?.discord_id===session.id,options.details);
}

export async function saveProfile(request: Request, username: unknown, input: {details?:unknown;appearance?:unknown; companionPet?: unknown; displayPiece?: unknown; equipped?: unknown; pinnedMark?: unknown; title?: unknown; visibility?:unknown;staffBadge?:Presentation['staffBadge'];staffPrefix?:Presentation['staffPrefix'];titleChoice?:string;showDonation?:boolean}): Promise<StoredFlair> {
  try { sameOrigin(request); } catch (error) { throw new HttpError(403, publicMessage(error, 'This request must come from your tracker.')); }
  const session = await readSession(request);
  if (!session) throw new HttpError(401, 'Log in with Discord to edit your profile.');
  const name = accountName(username);
  await ensureAuthTables();
  const owner = await db().prepare('SELECT c.discord_id, u.title FROM claimed_names c JOIN users u ON u.discord_id = c.discord_id WHERE c.rsn = ?').bind(name.toLowerCase()).first<{discord_id: string; title: string | null}>();
  if (!owner || owner.discord_id !== session.id) throw new HttpError(403, 'This RuneScape name is not linked to your Discord account.');
  if (input.visibility!==undefined&&!validVisibility(input.visibility)) throw new HttpError(400,'Choose Public or Private.');
  let appearance:Appearance|undefined;
  if(input.appearance!==undefined){try{appearance=parseAppearance(input.appearance);}catch(e){throw new HttpError(400,publicMessage(e,'Choose a valid appearance.'));}}
  const options=await profileOptions(name);
  let details:ProfileDetails;try{details=input.details===undefined?options.details:parseDetails(input.details);}catch(e){throw new HttpError(400,publicMessage(e,'Choose which profile details to share.'));}
  const journal = await readJournal(name);
  const role=await publicStaff(session.id);
  const prior=await db().prepare('SELECT p.*,COALESCE(pd.amount_minor,d.amount_minor) AS amount_minor,COALESCE(pd.currency,d.currency) AS currency FROM claimed_names c LEFT JOIN profile_presentation p ON p.rsn=c.rsn LEFT JOIN supporter_totals d ON d.discord_id=c.discord_id LEFT JOIN profile_supporter_totals pd ON pd.rsn=c.rsn WHERE c.rsn=?').bind(name.toLowerCase()).first<StyleRow>();
  const entitledTitle=supporterTitle(prior?.amount_minor,prior?.currency);
  if(input.title!=null&&input.title!==entitledTitle)throw new HttpError(403,'That title is not unlocked.');
  const extras=Object.fromEntries(['staffBadge','staffPrefix','titleChoice','showDonation'].filter(k=>k in input).map(k=>[k,input[k as keyof typeof input]]));
  let prefs:Presentation;
  try{prefs=parsePresentation(extras,presentation(prior),journal,role,{amountMinor:prior?.amount_minor??null,currency:prior?.currency??'USD',hidden:false},(prior?.amount_minor??0)>0||owner.title===DONATOR_TITLE);}catch(e){throw new HttpError(400,publicMessage(e,'Choose valid title and badge options.'));}
  let clean;
  try { clean = assertFlair(journal, {...input, title: entitledTitle}); }
  catch (error) { throw new HttpError(400, publicMessage(error, 'Invalid profile choice.')); }
  const writes=[db().prepare('UPDATE claimed_names SET companion_pet = ?, display_piece = ?, equipped = ?, pinned_mark = ? WHERE rsn = ? AND discord_id=?')
    .bind(clean.companionPet, clean.displayPiece, JSON.stringify(clean.equipped), clean.pinnedMark, name.toLowerCase(),session.id)];
  if(validVisibility(input.visibility)) writes.push(db().prepare('INSERT INTO profile_visibility(rsn,visibility) SELECT rsn,? FROM claimed_names WHERE rsn=? AND discord_id=? ON CONFLICT(rsn) DO UPDATE SET visibility=excluded.visibility').bind(input.visibility,name.toLowerCase(),session.id));
  writes.push(db().prepare('INSERT INTO profile_presentation(rsn,staff_badge,staff_prefix,title_choice,show_donation) SELECT rsn,?,?,?,? FROM claimed_names WHERE rsn=? AND discord_id=? ON CONFLICT(rsn) DO UPDATE SET staff_badge=excluded.staff_badge,staff_prefix=excluded.staff_prefix,title_choice=excluded.title_choice,show_donation=excluded.show_donation').bind(prefs.staffBadge,prefs.staffPrefix,prefs.titleChoice,prefs.showDonation?1:0,name.toLowerCase(),session.id));
  if(appearance)writes.push(db().prepare('INSERT INTO profile_appearance(rsn,body_type,hair_color) SELECT rsn,?,? FROM claimed_names WHERE rsn=? AND discord_id=? ON CONFLICT(rsn) DO UPDATE SET body_type=excluded.body_type,hair_color=excluded.hair_color').bind(appearance.body,appearance.hair,name.toLowerCase(),session.id));
  writes.push(db().prepare('INSERT INTO profile_options(rsn,details,skin,background) SELECT rsn,?,?,? FROM claimed_names WHERE rsn=? AND discord_id=? ON CONFLICT(rsn) DO UPDATE SET details=excluded.details,skin=excluded.skin,background=excluded.background').bind(JSON.stringify(details),appearance?.skin??options.skin,appearance?.background??options.background,name.toLowerCase(),session.id));
  await db().batch(writes);
  return publicProfile(name,session.id);
}

export async function leaderboard(names?:string[]): Promise<BoardRow[]> {
  if(names?.length===0)return [];
  // Public reads use deployed migrations; avoid DDL and backfills on the homepage cold path.
  const result = await db().prepare(
    `SELECT COALESCE(c.display_name,j.name) as name, c.discord_id, c.pinned_mark, c.companion_pet, u.title as title, j.data as data,o.details,p.staff_badge,p.staff_prefix,p.title_choice,p.show_donation,COALESCE(pd.amount_minor,d.amount_minor) AS amount_minor,COALESCE(pd.currency,d.currency) AS currency
     FROM (SELECT rsn FROM journal_summaries UNION SELECT rsn FROM claimed_names) names
     LEFT JOIN journal_summaries j ON j.rsn=names.rsn
     LEFT JOIN claimed_names c ON c.rsn=names.rsn
     LEFT JOIN users u ON u.discord_id = c.discord_id
     LEFT JOIN profile_visibility v ON v.rsn=names.rsn
     LEFT JOIN profile_options o ON o.rsn=names.rsn
     LEFT JOIN profile_presentation p ON p.rsn=c.rsn
     LEFT JOIN supporter_totals d ON d.discord_id=c.discord_id LEFT JOIN profile_supporter_totals pd ON pd.rsn=c.rsn
     WHERE COALESCE(v.visibility,'public')='public'
     AND (c.rsn IS NOT NULL OR NOT EXISTS(SELECT 1 FROM profile_link_owners r WHERE r.rsn=j.rsn))
     ${names?`AND names.rsn IN (${names.map(()=>'?').join(',')})`:""}`,
  ).bind(...(names??[]).map(n=>n.toLowerCase())).all<{name: string; discord_id:string; pinned_mark:string|null; companion_pet:string|null; title: string | null; data: string | null; details:string|null} & StyleRow>();
  const supporters=new Set(result.results.filter(row=>row.title===DONATOR_TITLE||(row.amount_minor??0)>0).map(row=>row.name));
  result.results.forEach(row=>{row.title=supporterTitle(row.amount_minor,row.currency);});
  const staff = await publicStaffList();
  const supporterRanks=supporterPositions(result.results
    .filter(row=>supporters.has(row.name))
    .map(row=>({name:row.name,amountMinor:row.amount_minor,currency:row.currency??'USD'})));
  const rows = result.results.map(row => publicBoardMemo(JSON.stringify([row,staff.get(row.discord_id),supporterRanks.get(row.name)]),()=>{
    let stats: CommunityStats | undefined;
    let pets = 0;
    let log = 0;
    let earnedTitle: string | null = row.title_choice==='none'?null:signatureTitle(row.name)??(supporters.has(row.name)?'Supporter':null);
    let featuredPet: BoardRow['featuredPet'] = null;
    let accountMode: BoardRow['accountMode'] = null;
    if (row.data) {
      try {
        const journal = journalForViewer(hydratePublicJournal(JSON.parse(row.data) as Journal),'public',false,row.details?parseDetails(JSON.parse(row.details)):DEFAULT_DETAILS);
        stats = journalStats(journal);
        pets = Array.isArray(journal.pets) ? journal.pets.filter(pet => pet.obtained).length : 0;
        log = journal.log && Number.isFinite(journal.log.obtained) ? journal.log.obtained : 0;
        earnedTitle = selectedTitle(journal,row.title_choice??'auto',row.pinned_mark,staff.get(row.discord_id)?.role==='owner',supporters.has(row.name),staff.get(row.discord_id)?.role);
        const pet = journal.pets.find(p=>p.id===row.companion_pet && p.obtained);
        if(pet) featuredPet={id:pet.id,name:pet.name};
        accountMode=journal.accountMode??null;
      } catch { /* Missing or invalid public totals remain unranked. */ }
    }
    const rank=staff.get(row.discord_id);
    return {accountMode,supporter:supporters.has(row.name),supporterRank:supporterRanks.get(row.name)??null, donation:donation(row), name: row.name, title: displayTitle(row.name, row.title === DONATOR_TITLE ? DONATOR_TITLE : null), pets, log, hasJournal: !!stats, stats, staff:rank?{...rank,displayRole:rank.role==='owner'&&row.staff_badge!=='gilded'?row.staff_badge:null,displayPrefix:row.staff_prefix}:null, achievementTitle: earnedTitle, featuredPet};
  }));
  return rankClaims(rows);
}
