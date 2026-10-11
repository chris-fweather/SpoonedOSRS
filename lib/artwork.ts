import bosses from './boss-artwork.json';
const map=bosses as Record<string,string>;
export function bossArtwork(name:string|null|undefined){return name?map[name.toLowerCase()] : undefined;}

const clue='/bosses/clue-scrolls-all.png';
const skill=(name:string)=>map[name];
/** Collection-log page image. Boss hiscore icons first, then the activity those pages stand for. */
const PAGE:Record<string,string>={
 'beginner treasure trails':clue,'easy treasure trails':clue,'medium treasure trails':clue,'hard treasure trails':clue,'elite treasure trails':clue,'master treasure trails':clue,
 'hard treasure trails (rare)':clue,'elite treasure trails (rare)':clue,'master treasure trails (rare)':clue,'shared treasure trail rewards':clue,'scroll cases':clue,
 'barbarian assault':skill('strength')??'','barracuda trials':skill('fishing')??'','brimhaven agility arena':skill('agility')??'','fishing trawler':skill('fishing')??'',
 "giants' foundry":skill('smithing')??'','gnome restaurant':skill('cooking')??'','hallowed sepulchre':skill('agility')??'','last man standing':map['lms - rank']??'',
 'magic training arena':skill('magic')??'','mahogany homes':skill('construction')??'','mastering mixology':skill('herblore')??'',"rogues' den":skill('thieving')??'',
 'shades of mort\'ton':skill('firemaking')??'','temple trekking':skill('agility')??'','tithe farm':skill('farming')??'','trouble brewing':skill('cooking')??'',
 'vale totems':skill('fletching')??'','volcanic mine':skill('mining')??'','aerial fishing':skill('fishing')??'','all pets':'/brand/rocky-mascot.webp','boat paints':skill('sailing')??'',
 'camdozaal':skill('mining')??'',"champion's challenge":skill('attack')??'','chompy bird hunting':skill('ranged')??'','colossal wyrm agility':skill('agility')??'',
 'creature creation':skill('hunter')??'','cyclopes':skill('attack')??'','elder chaos druids':skill('magic')??'','forestry':skill('woodcutting')??'',
 'fossil island notes':skill('hunter')??'',"glough's experiments":skill('ranged')??'','hunter guild':skill('hunter')??'','motherlode mine':skill('mining')??'',
 'ocean encounters':skill('sailing')??'','revenants':skill('strength')??'','rooftop agility':skill('agility')??'','sailing miscellaneous':skill('sailing')??'',
 'sea treasures':skill('sailing')??'','shayzien armour':skill('defence')??'','shooting stars':skill('mining')??'','skilling pets':'/pets/20665.png','slayer':skill('slayer')??'',
 'tormented demons':skill('strength')??'','tzhaar':map['tztok-jad']??'','pest control':skill('attack')??'','castle wars':skill('defence')??'',
};
export function pageIcon(name:string){
 const hit=bossArtwork(name)||PAGE[name.toLowerCase()];
 return hit||'/icons/navigation/collection-log-icon.png';
}
