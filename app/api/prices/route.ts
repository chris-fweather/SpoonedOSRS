/** Grand Exchange prices for guide costs, from the OSRS Wiki real-time prices API (https://prices.runescape.wiki).
 * The full price list is cached for ten minutes per location, and callers get only the item IDs they ask for. */
const SOURCE = 'https://prices.runescape.wiki/api/v1/osrs/latest';
const AGENT = 'spoonedosrs.com guide prices (discord.gg/spoonedosrs)';
type Latest = {data: Record<string, {high: number | null; low: number | null}>};
let memory: {at: number; data: Latest['data']} | null = null;

async function latest() {
  if (memory && Date.now() - memory.at < 600_000) return memory.data;
  const response = await fetch(SOURCE, {headers: {'User-Agent': AGENT}, signal: AbortSignal.timeout(10_000), cf: {cacheTtl: 600, cacheEverything: true}} as RequestInit);
  if (!response.ok) throw Error('Prices are unavailable right now.');
  const body = await response.json() as Latest;
  memory = {at: Date.now(), data: body.data ?? {}};
  return memory.data;
}

export async function GET(request: Request) {
  const ids = [...new Set((new URL(request.url).searchParams.get('ids') ?? '').split(',').filter(id => /^\d{1,6}$/.test(id)))].slice(0, 200);
  if (!ids.length) return Response.json({error: 'Ask for at least one item ID.'}, {status: 400});
  try {
    const data = await latest(), prices: Record<string, number> = {};
    // Coins are always worth 1; otherwise use the average of the latest instant buy and sell, or whichever exists.
    for (const id of ids) {
      if (id === '995') { prices[id] = 1; continue; }
      const p = data[id], values = [p?.high, p?.low].filter((v): v is number => typeof v === 'number' && v > 0);
      if (values.length) prices[id] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    }
    return Response.json({prices, source: 'OSRS Wiki real-time prices'}, {headers: {'Cache-Control': 'public, max-age=600'}});
  } catch {
    return Response.json({error: 'Prices are unavailable right now.'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}
