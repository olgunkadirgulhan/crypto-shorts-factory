// Offline test of pipeline/lib/llm.mjs with a mocked fetch: valid answer, schema retry, Gemini outage -> Groq.
//   node scripts/test-llm-chain.mjs
import { z } from "zod";

process.env.GEMINI_API_KEY = "test";
process.env.GROQ_API_KEY = "test";
delete process.env.ANTHROPIC_API_KEY;
const { generateStructured } = await import("../pipeline/lib/llm.mjs");

const schema = z.object({ hook: z.string(), lines: z.array(z.string()).min(2).max(3) });
const good = { hook: "Three coins to watch", lines: ["a", "b"] };
const bad = { hook: "x", lines: ["only one"] };
const gem = (obj) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }],
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } }) });
const groqOk = (obj) => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }], usage: {} }) });
const down = { ok: false, status: 503, text: async () => "high demand" };

async function run(label, responder) {
  const calls = [];
  globalThis.fetch = async (url) => { calls.push(url.includes("groq") ? "groq" : url.match(/models\/([^:]+)/)[1]); return responder(calls.length, url); };
  try {
    const r = await generateStructured({ system: "s", user: "u", schema, name: "t" });
    console.log(`PASS ${label}: provider=${r.provider} calls=${calls.join(",")}`);
  } catch (e) {
    console.log(`FAIL ${label}: ${e.message} calls=${calls.join(",")}`);
  }
}

await run("valid first try", () => gem(good));
await run("schema retry", (n) => gem(n === 1 ? bad : good));
await run("gemini down -> groq", (n, url) => (url.includes("groq") ? groqOk(good) : down));
await run("everything down", () => down);
