// Weekly long-form recap (3-5 min, landscape). Runs on its own cron
// (Sun/Wed) separate from the daily Shorts pipeline in run.mjs.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { fetchWeeklyMarketContext, selectWeeklySegments } from "./market.mjs";
import { computeWeeklyMetrics, sentimentOf } from "./indicators.mjs";
import { generateWeeklyScript } from "./weeklyScript.mjs";
import { synthesizeVoiceover } from "./tts.mjs";
import { addToPlaylist, discoverTrendingHashtags, setThumbnail, uploadVideo, youtubeClient } from "./youtube.mjs";
import { notify } from "./notify.mjs";

const ROOT = process.cwd();
const HISTORY_FILE = path.join(ROOT, "state", "weekly-history.json");
const COIN_COUNT = 8;
const OVERVIEW_LINES = 4;
const LINES_PER_COIN = 4;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch {
    return [];
  }
}

function sh(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: "inherit", shell: process.platform === "win32" });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function downloadLogo(url, dest) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return path.basename(dest);
  } catch {
    return null;
  }
}

const round2 = (n) => Number(n.toFixed(2));

async function main() {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const history = loadHistory();
  // Only skip coins from the last recap - 8 coins/run makes the tradeable
  // pool tight, so a longer exclusion window would starve candidate coins.
  const recentCoinIds = history.slice(-1).flatMap((h) => h.coinIds ?? []);

  console.log(`\n=== weekly recap | ${stamp} | dryRun=${dryRun} ===`);

  console.log("1/9 market data");
  const context = await fetchWeeklyMarketContext();
  const picked = await selectWeeklySegments(context, recentCoinIds, COIN_COUNT);
  if (picked.length < 6) {
    throw new Error(`Only found ${picked.length}/${COIN_COUNT} tradeable coins with enough weekly history`);
  }

  console.log("2/9 indicators");
  const segmentsBase = picked.map(({ coin, candles }) => {
    const metrics = computeWeeklyMetrics(coin, candles);
    return { coin, candles, metrics, sentiment: sentimentOf(metrics) };
  });
  for (const s of segmentsBase) {
    console.log(
      `  ${s.coin.symbol.toUpperCase().padEnd(6)} $${s.metrics.priceText} ${s.metrics.change7dPct}% (7d) RSI ${s.metrics.rsi14} ${s.metrics.trend}`,
    );
  }

  console.log("3/9 script");
  const { script, usage } = await generateWeeklyScript({
    segments: segmentsBase,
    global: context.global,
    avoidTitles: history.slice(-3).map((h) => h.title),
  });
  console.log(`  "${script.title}"`);
  console.log(`  tokens in/out: ${usage.input_tokens}/${usage.output_tokens}`);

  console.log("4/9 voiceover");
  const allLines = [...script.overviewLines, ...script.coinLines.flat(), script.cta];
  // A calmer pace than the fast-paced daily Shorts (default +6%) - fits the
  // longer-form recap tone and helps land the total run time in the target range.
  if (!process.env.TTS_RATE) process.env.TTS_RATE = "+0%";
  const { timeline, totalSec } = await synthesizeVoiceover(allLines, {
    workDir: path.join(ROOT, "out", "weekly-tts"),
    outFile: path.join(ROOT, "public", "weekly-voice.mp3"),
    musicFile: path.join(ROOT, "public", "music.mp3"),
  });
  console.log(`  ${timeline.length} lines, ${totalSec}s (${(totalSec / 60).toFixed(1)} min)`);

  console.log("5/9 logos + segment timing");
  const boundaries = [0];
  for (let i = 1; i < timeline.length; i++) {
    boundaries.push(Math.max(boundaries[i - 1] + 1, round2(timeline[i].start - 0.3)));
  }
  boundaries.push(totalSec);

  const segments = [];
  for (let i = 0; i < segmentsBase.length; i++) {
    const { coin, candles, metrics } = segmentsBase[i];
    const logoFile = await downloadLogo(coin.image, path.join(ROOT, "public", `weekly-coin-${i}.png`));
    const startIdx = OVERVIEW_LINES + i * LINES_PER_COIN;
    segments.push({
      coin: { id: coin.id, name: coin.name, symbol: coin.symbol.toUpperCase(), image: coin.image },
      metrics,
      candles,
      logoFile,
      startSec: boundaries[startIdx],
      endSec: boundaries[startIdx + LINES_PER_COIN],
    });
  }

  const props = {
    hook: script.hook,
    takeaway: script.takeaway,
    ctaText: script.cta,
    global: context.global,
    segments,
    captions: timeline,
    durationSec: totalSec,
    audioFile: "weekly-voice.mp3",
  };

  fs.mkdirSync(path.join(ROOT, "out"), { recursive: true });
  const propsFile = path.join(ROOT, "out", "weekly-props.json");
  fs.writeFileSync(propsFile, JSON.stringify(props, null, 2));

  console.log("6/9 render");
  const videoFile = path.join(ROOT, "out", `${stamp}-weekly.mp4`);
  await sh("npx", ["remotion", "render", "src/index.ts", "ChannelWeekly", videoFile, `--props=${propsFile}`]);
  const sizeMb = (fs.statSync(videoFile).size / 1e6).toFixed(1);
  console.log(`  ${videoFile} (${sizeMb} MB)`);

  console.log("7/9 thumbnail");
  const thumbFile = path.join(ROOT, "out", `${stamp}-weekly-thumb.png`);
  // A couple seconds into the first coin segment: chart's drawn in, still legible as a still.
  const firstCoinStartFrame = Math.round(segments[0].startSec * 30) + 45;
  await sh("npx", [
    "remotion", "still", "src/index.ts", "ChannelWeekly", thumbFile,
    `--props=${propsFile}`, `--frame=${firstCoinStartFrame}`,
  ]);
  console.log(`  ${thumbFile}`);

  let videoId = null;
  let hashtags = [];
  let thumbnailSet = false;

  if (dryRun) {
    console.log("8/9 upload skipped (--dry-run)");
  } else {
    console.log("8/9 hashtags + upload + thumbnail");
    const yt = youtubeClient();
    hashtags = await discoverTrendingHashtags(yt, segments.map((s) => s.coin));
    console.log(`  ${hashtags.join(" ")}`);
    videoId = await uploadVideo(yt, {
      file: videoFile,
      title: script.title,
      description: script.description,
      tags: script.tags,
      hashtags,
    });
    console.log(`  https://youtu.be/${videoId}`);
    thumbnailSet = await setThumbnail(yt, videoId, thumbFile);
    console.log(`  thumbnail set: ${thumbnailSet}`);
    console.log(`  playlist: ${(await addToPlaylist(yt, "weekly", videoId)) ?? "not added"}`);
  }

  console.log("9/9 archive");
  fs.mkdirSync(path.join(ROOT, "archive"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "archive", `${stamp}-weekly.json`),
    JSON.stringify(
      { coins: segments.map((s) => s.coin), metrics: segments.map((s) => s.metrics), script, hashtags, videoId, thumbnailSet, usage },
      null,
      2,
    ),
  );

  history.push({
    at: new Date().toISOString(),
    coinIds: segments.map((s) => s.coin.id),
    title: script.title,
    videoId,
    durationSec: totalSec,
  });
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(-20), null, 2));

  await notify(
    `✅ weekly recap · ${segments.map((s) => s.coin.symbol).join(" / ")}\n` +
      `${script.title}\n${videoId ? `https://youtu.be/${videoId}` : "(dry run, not uploaded)"}`,
  );

  console.log("\ndone\n");
}

main().catch(async (err) => {
  console.error(`\nFAILED: ${err.message}`);
  await notify(`❌ Weekly recap run failed\n${err.message}`.slice(0, 900));
  process.exit(1);
});
