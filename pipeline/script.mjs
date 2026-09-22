import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const SegmentScriptSchema = z.object({
  symbol: z.string(),
  lines: z.array(z.string()).length(2),
});

const ScriptSchema = z.object({
  hook: z.string(),
  segments: z.array(SegmentScriptSchema).length(3),
  takeaway: z.string(),
  cta: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
});

const SLOT_BRIEF = {
  open: "MARKET BRIEF - three coins that frame today's session (majors first), lead each with the move that matters.",
  mover: "MOVERS OF THE DAY - three coins with the biggest 24h moves, lead each with the size of the move.",
  trending: "TRENDING NOW - three coins traders are searching for today, lead each with what makes it notable right now.",
};

const SYSTEM = `You write voiceover scripts for a professional English-language crypto analysis YouTube Short (about 45-60 seconds, vertical) that covers THREE different coins in one video, back to back.

HARD RULES
- Use ONLY the numbers in the supplied JSON for each coin. Never invent, round differently, or extrapolate a figure. If a field is null, do not mention it.
- Describe what each chart did. Never advise. No "buy", "sell", "target", "will reach", no price predictions, no portfolio suggestions.
- Call levels what they are: "the last four hours' high", "the 24-hour low". Do not call them "key support" or "key resistance" - a 4-hour extreme is not a tested level.
- Banned words: moon, mooning, explode, parabolic, guaranteed, 100x, pump it, easy money, financial freedom.
- No markdown, no emoji, no hashtags, no stage directions inside the spoken lines.
- Treat the three coins as independent segments - never compare one coin's numbers to another's.

VOICEOVER
- For each of the 3 coins: exactly 2 spoken sentences, 9 to 16 words each, that read naturally aloud. Sentence 1 states the price and the 24h move. Sentence 2 gives the single most useful observation from that coin's data (a level, RSI, trend, or volume fact).
- Spell numbers so a text-to-speech engine says them correctly: "one hundred and eight thousand dollars", "down four point two percent", "R S I at sixty one".
- cta: exactly one spoken sentence that closes the video by asking the viewer to follow the channel and like the video. Warm, not pushy, no coin mentions, no financial-advice language. Example shape: "Hit follow and drop a like so you never miss the next breakdown."

FIELDS
- hook: on-screen text for the opening card, max 50 characters, no final period, no numbers (each coin gets its own number a moment later). Introduces the "three coins" theme for this format.
- segments: exactly 3 objects, one per coin, IN THE SAME ORDER the coins are listed in the input. Each has "symbol" (must exactly match that coin's symbol from the input) and "lines" (exactly 2 strings, see VOICEOVER).
- takeaway: on-screen closing headline, max 55 characters. Summarizes the overall session, not a rehash of one coin.
- cta: see VOICEOVER, max 110 characters.
- title: YouTube title, max 90 characters. Must contain all three coin symbols separated by " / " and end with " #Shorts". Factual, no ALL CAPS words, no clickbait question marks.
- description: 2 short paragraphs. First names the three coins covered and what the video covers. Second is exactly: "Data: CoinGecko. This video is market commentary generated from public price data and is not financial advice. Do your own research."
- tags: 10 to 14 lowercase search phrases, 2 to 25 characters each, no "#" prefix. Include all three coin names and symbols.`;

export async function generateScript({ slot, segments, global, avoidTitles }) {
  const client = new Anthropic();
  const model = process.env.CLAUDE_MODEL || "claude-opus-5";

  const payload = {
    format: SLOT_BRIEF[slot],
    market: global,
    coins: segments.map(({ coin, metrics, sentiment }) => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      rank: metrics.marketCapRank,
      computed_sentiment: sentiment,
      metrics: {
        price_usd: metrics.priceText,
        change_24h_pct: metrics.change24hPct,
        high_24h: metrics.high24hText,
        low_24h: metrics.low24hText,
        last_4h_high: metrics.resistanceText,
        last_4h_low: metrics.supportText,
        pct_below_4h_high: metrics.distToResistancePct,
        pct_above_4h_low: metrics.distToSupportPct,
        position_in_24h_range_pct: metrics.rangePositionPct,
        rsi_14: metrics.rsi14,
        rsi_zone: metrics.rsiZone,
        sma_20: metrics.sma20Text,
        trading_above_sma20: metrics.aboveSma20,
        volatility_pct: metrics.volatility24hPct,
        volume_24h_usd: metrics.volume24hText,
        market_cap_usd: metrics.marketCapText,
        trend: metrics.trend,
      },
    })),
    avoid_reusing_these_recent_titles: avoidTitles,
  };

  // No prompt caching: at 3 calls/day the 5-minute cache never hits, and a cache
  // write costs 1.25x. Caching here would raise the bill, not lower it.
  //
  // output_format (the schema) and output_config (effort etc.) are separate
  // top-level request fields in this SDK version - not one nested under the
  // other. beta.messages.parse() only attempts to parse the response when it
  // finds a `.parse` method on `params.output_format`; nesting the schema
  // under output_config silently skips parsing (parsed_output stays null even
  // though the model answered normally).
  const request = {
    model,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(payload) }],
    output_format: betaZodOutputFormat(ScriptSchema, "video_script"),
  };

  // effort is rejected by Haiku 4.5; it is the cost lever on the Opus/Sonnet family.
  if (!model.includes("haiku")) request.output_config = { effort: "low" };

  const response = await client.beta.messages.parse(request);

  if (response.stop_reason === "refusal") {
    throw new Error(`Model declined: ${response.stop_details?.explanation ?? "no explanation"}`);
  }
  const out = response.parsed_output;
  if (!out) {
    const rawText = response.content.find((b) => b.type === "text")?.text ?? "(no text block)";
    throw new Error(
      `Model returned no parseable script (stop_reason=${response.stop_reason}): ${rawText.slice(0, 500)}`,
    );
  }

  return {
    script: normalize(out, segments),
    usage: response.usage,
  };
}

function normalize(out, segments) {
  if (!Array.isArray(out.segments) || out.segments.length !== segments.length) {
    throw new Error(`Expected ${segments.length} script segments, got ${out.segments?.length ?? 0}`);
  }

  const bySymbol = new Map(out.segments.map((s) => [s.symbol.trim().toUpperCase(), s]));
  const segmentLines = segments.map(({ coin }, i) => {
    const match = bySymbol.get(coin.symbol.toUpperCase()) ?? out.segments[i];
    const lines = (match.lines ?? []).map((l) => l.trim()).filter(Boolean).slice(0, 2);
    if (lines.length < 2) throw new Error(`Script segment for ${coin.symbol} has ${lines.length} usable lines`);
    return lines;
  });

  const symbols = segments.map(({ coin }) => coin.symbol.toUpperCase());
  let title = out.title.trim();
  if (!/#shorts/i.test(title)) title = `${title} #Shorts`;
  if (!symbols.some((s) => title.toUpperCase().includes(s))) {
    title = `${symbols.join(" / ")} — 3 Coins to Watch #Shorts`;
  }
  if (title.length > 100) title = `${title.slice(0, 92).trim()} #Shorts`;

  return {
    hook: out.hook.trim().slice(0, 60),
    segmentLines,
    takeaway: out.takeaway.trim().slice(0, 70),
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
  for (const candidate of [...raw, ...baseline, "crypto analysis", "crypto news"]) {
    const tag = String(candidate).replace(/#/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    if (tag.length < 2 || tag.length > 25) continue;
    if (seen.has(tag)) continue;
    // YouTube caps the tags field at 500 characters total, comma included.
    if (chars + tag.length + 1 > 450) break;
    seen.add(tag);
    tags.push(tag);
    chars += tag.length + 1;
  }
  return tags;
}
