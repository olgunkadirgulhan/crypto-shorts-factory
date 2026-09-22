// One-off channel trailer, not part of the daily cron pipeline.
// Run: node pipeline/render-trailer.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { synthesizeVoiceover } from "./tts.mjs";

const ROOT = process.cwd();

// Card 0 has no icon/eyebrow/headline - it renders as the BrandIntro instead.
const CARDS = [
  { icon: null, eyebrow: "", headline: "" },
  { icon: "shield", eyebrow: "OUR PROMISE", headline: "Data and analysis — never advice" },
  { icon: "lock", eyebrow: "RISK MANAGEMENT", headline: "Only risk what you can afford" },
  { icon: "search", eyebrow: "DO YOUR OWN RESEARCH", headline: "Always verify independently" },
  { icon: "bars", eyebrow: "STAY PROTECTED", headline: "Volatility cuts both ways" },
];

const LINES = [
  "Welcome to Whale Market Pulse, your daily crypto market data breakdown.",
  "Everything here is data and analysis, never financial advice or signals.",
  "Only ever risk money you can genuinely afford to lose completely.",
  "Always verify independently, and never trade off a single video.",
  "Markets swing hard in both directions, so protect your capital first.",
  "Hit follow and join traders who think clearly, not emotionally.",
];

const TAKEAWAY = "Clear Data. Smart Trading.";

function sh(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function main() {
  console.log("1/3 voiceover");
  const { timeline, totalSec } = await synthesizeVoiceover(LINES, {
    workDir: path.join(ROOT, "out", "trailer-tts"),
    outFile: path.join(ROOT, "public", "trailer-voice.mp3"),
    musicFile: path.join(ROOT, "public", "music.mp3"),
  });
  console.log(`  ${timeline.length} lines, ${totalSec}s`);

  const props = {
    cards: CARDS,
    takeaway: TAKEAWAY,
    captions: timeline,
    durationSec: totalSec,
    audioFile: "trailer-voice.mp3",
  };

  fs.mkdirSync(path.join(ROOT, "out"), { recursive: true });
  const propsFile = path.join(ROOT, "out", "trailer-props.json");
  fs.writeFileSync(propsFile, JSON.stringify(props, null, 2));

  console.log("2/3 render");
  const videoFile = path.join(ROOT, "out", "channel-trailer.mp4");
  await sh("npx", ["remotion", "render", "src/index.ts", "ChannelTrailer", videoFile, `--props=${propsFile}`]);
  console.log(`  ${videoFile}`);

  console.log("3/3 thumbnail");
  const thumbFile = path.join(ROOT, "out", "channel-trailer-thumb.png");
  await sh("npx", [
    "remotion", "still", "src/index.ts", "ChannelTrailer", thumbFile,
    `--props=${propsFile}`, `--frame=${Math.round(totalSec * 30) - 60}`,
  ]);
  console.log(`  ${thumbFile}`);

  console.log("\ndone\n");
}

main().catch((err) => {
  console.error(`FAILED: ${err.message}`);
  process.exit(1);
});
