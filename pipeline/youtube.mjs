import fs from "node:fs";
import { google } from "googleapis";

export function youtubeClient() {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
    throw new Error("Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN");
  }
  const auth = new google.auth.OAuth2(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: YOUTUBE_REFRESH_TOKEN });
  return google.youtube({ version: "v3", auth });
}

const toHashtag = (s) =>
  "#" + s.replace(/[^a-zA-Z0-9]/g, "").replace(/^[0-9]+/, "").slice(0, 24);

// Pulls the tags actually used by recent high-view videos on these coins, so the
// hashtags track what is trending on YouTube now instead of a hardcoded list.
// One search call covers all coins in the video - same YouTube quota as a
// single-coin lookup, since search.list (100 units) dominates the cost.
export async function discoverTrendingHashtags(yt, coins) {
  const baseline = [...coins.flatMap((c) => [c.name, c.symbol]), "crypto", "cryptonews", "trading", "Shorts"];
  try {
    const search = await yt.search.list({
      part: ["snippet"],
      q: `${coins.map((c) => c.symbol).join(" ")} crypto price analysis`,
      type: ["video"],
      order: "viewCount",
      publishedAfter: new Date(Date.now() - 14 * 86400000).toISOString(),
      maxResults: 20,
      regionCode: "US",
      relevanceLanguage: "en",
    });

    const ids = (search.data.items ?? []).map((i) => i.id?.videoId).filter(Boolean);
    if (!ids.length) return dedupeHashtags(baseline);

    const videos = await yt.videos.list({ part: ["snippet"], id: ids });
    const counts = new Map();
    for (const v of videos.data.items ?? []) {
      const found = [
        ...(v.snippet?.tags ?? []),
        ...`${v.snippet?.title ?? ""} ${v.snippet?.description ?? ""}`.match(/#[\p{L}\p{N}_]+/gu)?.map((h) => h.slice(1)) ?? [],
      ];
      for (const raw of found) {
        const tag = toHashtag(raw);
        if (tag.length < 4 || tag.length > 25) continue;
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    const ranked = [...counts.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);

    return dedupeHashtags([...baseline, ...ranked]);
  } catch (err) {
    console.warn(`  hashtag discovery failed, using baseline: ${err.message}`);
    return dedupeHashtags(baseline);
  }
}

// YouTube ignores every hashtag in a description once there are more than 15,
// and only surfaces the first three above the title. Stay well under.
function dedupeHashtags(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const tag = item.startsWith("#") ? item : toHashtag(item);
    const key = tag.toLowerCase();
    if (tag.length < 4 || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length === 8) break;
  }
  return out;
}

export async function uploadVideo(yt, { file, title, description, tags, hashtags }) {
  const safeTitle = title.replace(/[<>]/g, "").slice(0, 100);
  const body = `${description}\n\n${hashtags.join(" ")}`.slice(0, 4900);

  const res = await yt.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: safeTitle,
        description: body,
        tags,
        categoryId: process.env.YOUTUBE_CATEGORY_ID || "28",
        defaultLanguage: "en",
        defaultAudioLanguage: "en",
      },
      status: {
        privacyStatus: process.env.YOUTUBE_PRIVACY || "unlisted",
        selfDeclaredMadeForKids: false,
      },
    },
    media: { body: fs.createReadStream(file) },
  });

  if (!res.data.id) throw new Error("YouTube accepted the upload but returned no video id");
  return res.data.id;
}

// Custom thumbnails require the channel to be phone-verified - YouTube rejects
// the call otherwise. That's a channel-level setting we can't fix here, so a
// failure here is a warning, not a fatal error: the video itself already uploaded.
export async function setThumbnail(yt, videoId, imagePath) {
  try {
    await yt.thumbnails.set({
      videoId,
      media: { mimeType: "image/png", body: fs.createReadStream(imagePath) },
    });
    return true;
  } catch (err) {
    console.warn(
      `  thumbnail upload failed (channel likely needs phone verification at youtube.com/verify): ${err.message}`,
    );
    return false;
  }
}
