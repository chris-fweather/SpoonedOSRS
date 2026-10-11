/** Decode wiki HTML entities and join ordinals the bucket export splits (`2 nd` → `2nd`). */
export function decodeWiki(value: string): string {
  return value
    .replace(/<sup>(.*?)<\/sup>/gi, '$1')
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&([a-z]+);/gi, (all, name: string) => {
      const named: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '};
      return named[name.toLowerCase()] ?? all;
    })
    .replace(/(\d+)\s+(st|nd|rd|th)\b/gi, '$1$2')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +\n/g, '\n')
    .trim();
}
