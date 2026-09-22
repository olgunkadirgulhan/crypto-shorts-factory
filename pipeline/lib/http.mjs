const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// CoinGecko's free tier allows only a handful of calls per minute and answers
// with 429 plus (sometimes) Retry-After. Nothing here is latency-sensitive, so
// waiting it out is always better than failing the run.
const RATE_LIMIT_BACKOFF_MS = [8000, 16000, 30000, 45000, 60000];

export async function fetchJson(url, { headers = {}, retries = 5, timeoutMs = 20000 } = {}) {
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json", "user-agent": "crypto-shorts-factory/3", ...headers },
        signal: ac.signal,
      });

      if (res.ok) return await res.json();

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : RATE_LIMIT_BACKOFF_MS[Math.min(attempt, RATE_LIMIT_BACKOFF_MS.length - 1)];
        lastErr = new Error(`HTTP 429 from ${url}`);
        if (attempt === retries) break;
        console.warn(`  rate limited, waiting ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }

      if (res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} from ${url}`);
        if (attempt === retries) break;
        await sleep(2000 * 2 ** attempt);
        continue;
      }

      throw new Error(`HTTP ${res.status} from ${url}`);
    } catch (err) {
      if (err.message?.startsWith("HTTP 4")) throw err;
      lastErr = err;
      if (attempt === retries) break;
      await sleep(2000 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr;
}
