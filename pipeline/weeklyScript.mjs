import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Exact-length array constraints (.length(N)) aren't always perfectly honored
// by structured-output generation on deeply nested schemas like this one - the
// model occasionally writes one extra line. Accept a small overshoot here and
// truncate to the exact count in normalize() below, rather than hard-failing
// the whole run over one extra sentence.
const CoinScriptSchema = z.object({
  symbol: z.string(),
  lines: z.array(z.string()).min(4).max(5),
});

const WeeklyScriptSchema = z.object({
  hook: z.string(),
  overviewLines: z.array(z.string()).min(4).max(5),
  coins: z.array(CoinScriptSchema).min(6).max(8),
  takeaway: z.string(),
  cta: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
});

const SYSTEM = `You write the voiceover script for a landscape, long-form (3-5 minute) weekly crypto market recap video called "Weekly Market Pulse" - a natural bigger sibling of a channel's daily short-form videos, same brand voice, same rules, more depth.

HARD RULES
- Use ONLY the numbers in the supplied JSON. Never invent, round differently, or extrapolate a figure. If a field is null, do not mention it.
- Describe what happened. Never advise. No "buy", "sell", "target", "will reach", no price predictions, no portfolio suggestions.
- Call levels what they are: "this week's high/low". Never "key support/resistance".
- Banned words: moon, mooning, explode, parabolic, guaranteed, 100x, pump it, easy money, financial freedom.
- No markdown, no emoji, no hashtags, no stage directions inside spoken lines.
- Treat each coin as an independent segment - never compare one coin's numbers to another's.
- Spell numbers so a text-to-speech engine says them correctly: "one hundred and eight thousand dollars", "up thirty one point four percent this week", "R S I at sixty one".

VOICEOVER STRUCTURE
- overviewLines: exactly 4 sentences opening the video - the week's overall tone (total market cap direction, Bitcoin dominance, general risk mood, and one sentence framing what this recap will cover). 9-16 words each.
- coins: one object per coin supplied, SAME ORDER as the input, each with "symbol" (must exactly match the input coin's symbol) and "lines" (exactly 4 spoken sentences, 9-16 words each): sentence 1 states the 7-day move and current price, sentence 2 gives the most useful observation from that coin's data (a week-high/low level, RSI, trend, or volume fact), sentence 3 adds a second distinct observation (a different stat than sentence 2 - volume, market cap rank context, or how it's doing today vs. the week), sentence 4 is a brief closing color line about that coin's week (still descriptive, never advice).
- cta: exactly one spoken sentence closing the video, asking the viewer to follow the channel and like the video. Warm, not pushy, no coin mentions.

FIELDS
- hook: on-screen opening title card text, max 60 characters, no final period, no numbers. Names the weekly-recap theme (e.g. "This Week in Crypto").
- takeaway: on-screen closing headline, max 60 characters, summarizes the week's overall tone in one punchy phrase.
- title: YouTube title for a long-form video, max 95 characters. Should read as a normal (non-Shorts) crypto recap title, factual, no ALL CAPS, no clickbait question marks. Do not include "#Shorts".
- description: 2-3 short paragraphs. First names the coins covered and what the video covers. Last paragraph is exactly: "Data: CoinGecko. This video is market commentary generated from public price data and is not financial advice. Do your own research."
- tags: 12 to 16 lowercase search phrases, 2 to 25 characters each, no "#" prefix. Include every coin name/symbol covered plus general crypto-recap terms.`;

export async function generateWeeklyScript({ segments, global, avoidTitles }) {
  const client = new Anthropic();
  const model = process.env.CLAUDE_MODEL || "claude-opus-5";

  const payload = {
    format: "WEEKLY MARKET PULSE - long-form recap of this week's biggest crypto movers",
    market: global,
    coins: segments.map(({ coin, metrics, sentiment }) => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      rank: metrics.marketCapRank,
      computed_sentiment: sentiment,
      metrics: {
        price_usd: metrics.priceText,
        change_7d_pct: metrics.change7dPct,
        change_24h_pct: metrics.change24hPct,
        week_high: metrics.weekHighText,
        week_low: metrics.weekLowText,
        position_in_week_range_pct: metrics.rangePositionPct,
        rsi_14: metrics.rsi14,
        rsi_zone: metrics.rsiZone,
        trading_above_20_period_avg: metrics.aboveSma20,
        volume_pct: metrics.volume24hText,
        market_cap_usd: metrics.marketCapText,
        trend: metrics.trend,
      },
    })),
    avoid_reusing_these_recent_titles: avoidTitles,
  };

  const request = {
    model,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(payload) }],
    output_format: betaZodOutputFormat(WeeklyScriptSchema, "weekly_script"),
  };
  if (!model.includes("haiku")) request.output_config = { effort: "medium" };

  const response = await client.beta.messages.parse(request);

  if (response.stop_reason === "refusal") {
    throw new Error(`Model declined: ${response.stop_details?.explanation ?? "no explanation"}`);
  }
  const out = response.parsed_output;
  if (!out) {
    const rawText = response.content.find((b) => b.type === "text")?.text ?? "(no text block)";
    throw new Error(
      `Model returned no parseable weekly script (stop_reason=${response.stop_reason}): ${rawText.slice(0, 500)}`,
    );
  }

  return { script: normalize(out, segments), usage: response.usage };
}

function normalize(out, segments) {
  // Extras are fine - matched by symbol below and simply ignored. Fewer than
  // expected means a coin segment is genuinely missing, which is fatal.
  if (!Array.isArray(out.coins) || out.coins.length < segments.length) {
    throw new Error(`Expected at least ${segments.length} weekly coin segments, got ${out.coins?.length ?? 0}`);
  }

  const bySymbol = new Map(out.coins.map((c) => [c.symbol.trim().toUpperCase(), c]));
  const coinLines = segments.map(({ coin }, i) => {
    const match = bySymbol.get(coin.symbol.toUpperCase()) ?? out.coins[i];
    const lines = (match.lines ?? []).map((l) => l.trim()).filter(Boolean).slice(0, 4);
    if (lines.length < 4) throw new Error(`Weekly script segment for ${coin.symbol} has ${lines.length} usable lines`);
    return lines;
  });

  const overviewLines = (out.overviewLines ?? []).map((l) => l.trim()).filter(Boolean).slice(0, 4);
  if (overviewLines.length < 4) throw new Error(`Weekly overview has ${overviewLines.length} usable lines`);

  let title = out.title.trim();
  if (title.length > 100) title = title.slice(0, 100).trim();

  return {
    hook: out.hook.trim().slice(0, 70),
    overviewLines,
    coinLines,
    takeaway: out.takeaway.trim().slice(0, 80),
    cta: out.cta.trim().slice(0, 140),
    title,
    description: out.description.trim().slice(0, 4500),
    tags: sanitizeTags(out.tags, segments.map(({ coin }) => coin)),
  };
}

function sanitizeTags(raw, coins) {
  const seen = new Set();
  const tags = [];
  let chars = 0;
  const baseline = coins.flatMap((c) => [c.name.toLowerCase(), c.symbol.toLowerCase()]);
  for (const candidate of [...raw, ...baseline, "crypto news", "weekly recap", "crypto market"]) {
    const tag = String(candidate).replace(/#/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    if (tag.length < 2 || tag.length > 25) continue;
    if (seen.has(tag)) continue;
    if (chars + tag.length + 1 > 450) break;
    seen.add(tag);
    tags.push(tag);
    chars += tag.length + 1;
  }
  return tags;
}
