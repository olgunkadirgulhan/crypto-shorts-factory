// One-off: rewrite the channel's About text and keywords, and create the format playlists.
// The description only promises what the pipeline really does: an inflated "institutional
// intelligence / liquidation alerts" pitch is misleading metadata under YouTube's spam policy.
// Run from Actions: "Channel setup" (workflow_dispatch).
import fs from "node:fs";
import { PLAYLISTS, addToPlaylist, ensurePlaylist, youtubeClient } from "./youtube.mjs";

const DESCRIPTION = `Where the big money moved in crypto today.

Whale Market Pulse turns each day's biggest crypto move into a 30-second story: what happened, what the chart shows, and how much of the coin changed hands.

Every day: the big-cap move, the biggest mover, and the coin everyone is searching for.
Sundays and Wednesdays: the weekly recap.

Market data: CoinGecko. News is always credited to its source (CoinDesk, Cointelegraph, Decrypt).
Videos are produced with automated tools from public market data. No price predictions, no buy or sell calls, no paid promotions.

Not financial advice. Crypto is volatile. Do your own research.`;

const KEYWORDS = [
  "crypto news", "crypto market today", "bitcoin price today", "biggest crypto movers", "trending crypto",
  "altcoins", "crypto chart", "ethereum", "solana", "whale market pulse",
].map((k) => (k.includes(" ") ? `"${k}"` : k)).join(" ");

const yt = youtubeClient();
const { data } = await yt.channels.list({ part: ["brandingSettings", "snippet"], mine: true });
const ch = data.items?.[0];
if (!ch) throw new Error("this token has no YouTube channel");
console.log(`channel: ${ch.snippet.title} (${ch.id})`);

// brandingSettings is replaced as a whole on update, so start from the current object.
const branding = ch.brandingSettings ?? {};
branding.channel = { ...(branding.channel ?? {}), description: DESCRIPTION, keywords: KEYWORDS, country: "US", defaultLanguage: "en" };
await yt.channels.update({ part: ["brandingSettings"], requestBody: { id: ch.id, brandingSettings: branding } });
console.log("about text + keywords updated");

for (const key of Object.keys(PLAYLISTS)) console.log(`playlist ${key}: ${await ensurePlaylist(yt, key)}`);

// Put the videos already on the channel into their playlists (new uploads are added by run.mjs).
for (const file of fs.readdirSync("archive").filter((f) => f.endsWith(".json")).sort()) {
  const a = JSON.parse(fs.readFileSync(`archive/${file}`, "utf8"));
  const key = file.includes("weekly") ? "weekly" : a.slot;
  if (!a.videoId || !PLAYLISTS[key]) continue;
  console.log(`  ${a.videoId} -> ${key}: ${(await addToPlaylist(yt, key, a.videoId)) ? "added" : "failed"}`);
}
