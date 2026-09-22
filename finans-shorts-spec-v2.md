# FINANCE SHORTS AUTOMATION SYSTEM v3 — REMOTION + VOICEOVER + ENGLISH-ONLY

## CHANGES (v1 -> v3)
- Render engine: MoviePy -> **Remotion** (React-based, high-quality motion graphics)
- Audio: none -> **quality TTS voiceover** added
- Upload: manual/semi-automatic -> **fully automatic to GitHub + YouTube**
- LLM/API calls: optimized to be **token-efficient**
- **Scope narrowed: 4 -> 2 videos/day per channel, and we're starting English-only** (TR/DE later)

## 0. CURRENT SCOPE (v3)
- **2 scheduled videos/day per channel**: 08:00 `daily_recap` (Market Recap) + 14:00 `mover_spotlight` (Mover of the Day)
- `breaking_news` (RSS-triggered) stays an **opportunistic bonus** — not counted against the fixed daily 2; publishes extra when a real headline hits
- `education` format (22:00) is **currently disabled** — will be reactivated once TR/DE roll out
- **Language: English only.** The Ollama prompt and TTS voice run with `language: "en"`. Adding TR/DE later means inserting a language loop (SplitInBatches: ["en","tr","de"]) into the same pipeline, which would scale output from 2 to 6 videos/day per channel — not implemented yet.

---

## 1. RENDER ENGINE: REMOTION

**Why Remotion instead of MoviePy:**
- React components give cleaner, more professional animations/transitions
- Programmatic video = re-renders automatically when data changes (passed in as JSON props)
- `@remotion/renderer` enables headless CLI rendering, called from n8n's Execute Command node
- `@remotion/lambda` allows parallel rendering on AWS (not required for 2 videos/day, but scales if needed later)

**Project structure:**
```
/remotion-project
  /src
    Root.tsx              -> registers all format compositions
    compositions/
      DailyRecap.tsx
      MoverSpotlight.tsx
      BreakingNews.tsx
      Education.tsx        (disabled for now, kept for later)
    components/
      DataBox.tsx          -> price boxes (BTC, BIST100, USDTRY, GOLD)
      Chart.tsx             -> candlestick chart (via recharts/visx instead of mplfinance)
      TypewriterText.tsx
      Hook.tsx
  package.json
  remotion.config.ts
```

**Render command (from n8n's Execute Command node):**
```bash
npx remotion render src/index.ts <format-composition-id> out/{format}_{timestamp}.mp4 \
  --props='{"data": <yfinance-json>, "commentary": "<ollama-commentary>", "voiceoverUrl": "<tts-file-path>"}'
```

**Chart:** instead of mplfinance, use `@visx/xychart` or `recharts` inside a Remotion component so the candlestick chart itself is animated by React — no separate PNG/video layer needed.

---

## 2. VOICEOVER (TTS)

**Options ranked by cost/quality:**

| Option | Cost | Quality | Note |
|---|---|---|---|
| **Edge TTS** (Microsoft, open API) | $0 | Good | Supports EN (and TR/DE later), most practical starting point |
| **Piper TTS** (local, open source) | $0 | Medium-Good | Fully offline, no GPU required |
| **ElevenLabs** | Paid (per character) | Very good | Consider later if quality becomes the bottleneck |

**Starting point: Edge TTS** ($0, aligned with the cost target, natural-sounding English voice).

**Flow:**
```
[OLLAMA COMMENTARY] -> [EDGE TTS NODE] -> mp3/wav file -> [REMOTION] (props.voiceoverUrl)
                                                         -> [FFMPEG] mixed with music at -20db
```

**Language:** currently hardcoded to `en`. When TR/DE are added, the `language` field drives which TTS voice and Ollama output language get used, and the pipeline branches per language (video count per channel scales from 2/day to 2 x number of languages).

---

## 3. TOKEN EFFICIENCY

**Rules:**
1. The Ollama prompt is fixed and short — the system prompt stays identical every run, only the variable data (price/news) is appended. No long explanations or examples get embedded in the prompt.
2. `num_predict` is capped low in Ollama (a 3-sentence commentary needs roughly 80-120 tokens).
3. Repeated news/data within the same day is **cached** — the same headline isn't sent to Ollama twice (same layer as the RSS dedup check).
4. The education format (currently disabled) will draw topics from a **static list** rather than asking Ollama to "come up with a topic" — Ollama only writes the explanation for the pre-selected topic.
5. Ollama runs locally so token cost is $0, but keeping the prompt short still matters for render speed/CPU load (short prompt = fast response = faster pipeline completion, which matters as video volume grows).

---

## 4. FULLY AUTOMATED UPLOAD: GITHUB + YOUTUBE

**GitHub (archive/versioning purpose):**
- After each render, the video file + the JSON data used + the Ollama commentary are committed to a repo (archive + debugging)
- n8n -> Execute Command node: `git add . && git commit -m "auto: {format} {timestamp}" && git push`
- Alternative: if you want GitHub Actions to trigger the render itself, push would kick off a workflow — but since n8n already handles orchestration, GitHub should stay an **archive/backup layer only**, NOT a render trigger (avoids double-triggering)
- Repo must be **private** — it contains financial commentary and possibly copyrighted music/data

**YouTube (direct API, fully automatic):**
- YouTube Data API v3, `videos.insert` (resumable upload)
- OAuth2 refresh token stored in the n8n credential, refreshes without human intervention
- Daily quota: ~1600 units/upload, default quota 10,000 units/day -> roughly 6 uploads/day ceiling. At 2 videos/day per channel this is comfortable headroom; only becomes a constraint if languages are added later.
- Title + description + tags are auto-derived from the Ollama commentary — no manual entry

**TikTok / Instagram:** unchanged from v1 (TikTok still needs app audit for direct publish, Instagram still needs a Business account + Meta review — the GitHub/YouTube automation doesn't remove these platform-side constraints).

---

## 5. CURRENT N8N FLOW (SUMMARY)

```
[CRON 08:00/14:00 or RSS trigger] -> [DATA: yfinance] -> [SUPPORT/RESISTANCE: Python, last 4h]
   -> [NEWS CONTEXT] -> [OLLAMA: short commentary, EN] -> [EDGE TTS: voiceover]
   -> [REMOTION: render (data + voice + chart)] -> [FFMPEG: background music mix]
   -> [GITHUB: commit+push (archive)]
   -> [PARALLEL: YOUTUBE / TIKTOK / INSTAGRAM upload]
   -> [TELEGRAM: summary notification]
```

---

## 6.5. SUPPORT/RESISTANCE ANALYSIS (LAST 4 HOURS)

**The calculation is done in Python, NOT the LLM** (both for token efficiency and accuracy — Ollama doesn't "make up" numeric levels, it only narrates numbers that are already computed).

**Data:** yfinance pulls `interval='5m'` intraday candles for the last 4 hours (BTC-USD trades 24/7 so this works directly; for BIST100/USDTRY, if the market is closed the last open 4-hour session is used).

**Method (simple and fast — no heavy technical-analysis library needed):**
```python
# calc_support_resistance.py
import yfinance as yf

def get_levels(ticker, hours=4):
    data = yf.download(ticker, period="1d", interval="5m")
    window = data.tail(hours * 12)  # 48 candles at 5min = 4 hours
    resistance = round(window["High"].max(), 2)
    support = round(window["Low"].min(), 2)
    current = round(window["Close"].iloc[-1], 2)
    dist_to_resistance_pct = round((resistance - current) / current * 100, 2)
    dist_to_support_pct = round((current - support) / current * 100, 2)
    return {
        "ticker": ticker, "support": support, "resistance": resistance,
        "current": current, "dist_to_resistance_pct": dist_to_resistance_pct,
        "dist_to_support_pct": dist_to_support_pct
    }
```

**Field added to the Ollama prompt:** `{"support": ..., "resistance": ..., "dist_to_resistance_pct": ...}` — the commentary prompt itself doesn't change, these fields are just appended to the data object. Example generated sentence: *"BTC traded between $66,800 support and $68,100 resistance over the last 4 hours, now sitting 0.9% below resistance."* — descriptive, no advice.

**Node added to the n8n flow:** right after `Fetch Yahoo Data (yfinance)` and before `Fetch News Context`, a `Calculate Support/Resistance` (Execute Command) node runs. This branch only runs for `daily_recap` and `mover_spotlight` (both depend on yfinance). `breaking_news` currently comes from a separate RSS branch and doesn't pull price data — adding support/resistance there would need a yfinance call inserted into that branch too (see open points below). Doesn't affect the education format at all.

**Scope note:** this simple high/low method isn't "real" support/resistance (a level tested multiple times, volume profile, etc.) — it's good enough for fast/automated content, but shouldn't be presented as rigorous technical analysis. Prefer clear phrasing like "the last 4 hours' high/low" in the video text over confident language like "key support/resistance."

---

## 7. OPEN POINTS (NEED A DECISION)

- [x] TR/EN/DE vs single language -> **decided: English only for now, 2 videos/day per channel**
- [ ] Edge TTS or Piper — is offline operation required, or is a stable internet connection assumed?
- [ ] Should every video actually be pushed to the GitHub repo (may need Git LFS for storage) or should only the JSON+text be archived?
- [ ] Will a YouTube daily-quota increase be requested (needed if languages/volume scale up later)?
- [ ] Is a simple 4-hour high/low sufficient for support/resistance, or is a more "technical" method (pivot point formula: PP/R1/S1) preferred?
- [ ] Should support/resistance be added to `breaking_news` too (currently that branch isn't wired to yfinance — needs one more query added to the RSS branch)?
