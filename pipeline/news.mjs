// Recent crypto headlines from free public RSS feeds, so a script can say WHY a coin is in the
// news instead of only reading its price. Only headlines that name the coin are returned, and the
// script is allowed to attribute them ("CoinDesk reports...") but never to claim they caused the move.
// Any feed that fails is skipped: a video without a headline is still a valid video.

const FEEDS = [
  ["CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"],
  ["Cointelegraph", "https://cointelegraph.com/rss"],
  ["Decrypt", "https://decrypt.co/feed"],
];
const MAX_AGE_H = 36;

// Symbols that are also everyday English words would match unrelated headlines.
const AMBIGUOUS = new Set(["ONE", "GAS", "SUN", "BAT", "KEY", "HOT", "ACE", "CAT", "DOG", "APE", "BEAM", "MOVE", "JUP", "OM", "IT", "AI", "ME", "S", "T", "G"]);

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8217;|&rsquo;/g, "'").replace(/&#822[01];|&[lr]dquo;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const tag = (item, name) => decode(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? "");

async function fetchFeed(source, url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WhaleMarketPulse/1.0)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)].map(([item]) => ({
      source,
      title: tag(item, "title"),
      link: tag(item, "link"),
      published: new Date(tag(item, "pubDate")).getTime(),
    }));
  } catch {
    return [];
  }
}

let cache = null;
async function allHeadlines() {
  if (!cache) {
    const lists = await Promise.all(FEEDS.map(([s, u]) => fetchFeed(s, u)));
    const cutoff = Date.now() - MAX_AGE_H * 3600_000;
    cache = lists.flat().filter((h) => h.title && Number.isFinite(h.published) && h.published >= cutoff);
    console.log(`  news: ${cache.length} headlines from the last ${MAX_AGE_H}h`);
  }
  return cache;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Up to `max` recent headlines that name this coin (by name, or by symbol when unambiguous). */
export async function headlinesFor(coin, max = 3) {
  const all = await allHeadlines();
  const symbol = coin.symbol.toUpperCase();
  const patterns = [new RegExp(`\\b${escapeRe(coin.name)}\\b`, "i")];
  if (symbol.length >= 3 && !AMBIGUOUS.has(symbol)) patterns.push(new RegExp(`\\b${escapeRe(symbol)}\\b`));
  const seen = new Set();
  return all
    .filter((h) => patterns.some((p) => p.test(h.title)))
    .sort((a, b) => b.published - a.published)
    .filter((h) => !seen.has(h.title.toLowerCase()) && seen.add(h.title.toLowerCase()))
    .slice(0, max)
    .map((h) => ({ ...h, age_hours: Math.round((Date.now() - h.published) / 3600_000) }));
}
