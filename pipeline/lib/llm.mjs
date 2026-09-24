import { z } from "zod";

// Free-first LLM chain for script generation:
//   Gemini (free tier, aistudio.google.com key)  ->  Groq (free tier, optional)  ->  Claude (paid, optional last resort)
// Every answer is validated against the same zod schema the Claude path used, so quality rules are unchanged.
// A backend without a key is skipped; one that errors, rate-limits or returns invalid JSON hands over to the next.

const GEMINI_MODELS = (process.env.GEMINI_MODEL || "gemini-3.8-flash,gemini-3.5-flash,gemini-flash-latest,gemini-3-flash-preview,gemini-flash-lite-latest")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
let geminiStart = 0; // remember the model that worked in this run, so the slow failover is paid once

async function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function jsonFrom(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(t);
  } catch {
    return JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
  }
}

async function gemini(system, user) {
  let last = "no model tried";
  for (let i = geminiStart; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    try {
      const r = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: "application/json" },
          }),
        },
        75_000,
      );
      if (!r.ok) {
        last = `${model}: ${r.status} ${(await r.text()).slice(0, 200)}`;
        continue;
      }
      const j = await r.json();
      const parts = j.candidates?.[0]?.content?.parts ?? [];
      const text = parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("");
      if (!text.trim()) {
        last = `${model}: empty answer (${j.candidates?.[0]?.finishReason ?? "no candidates"})`;
        continue;
      }
      geminiStart = i;
      return {
        text,
        provider: `gemini:${model}`,
        usage: {
          input_tokens: j.usageMetadata?.promptTokenCount ?? 0,
          output_tokens: j.usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    } catch (e) {
      last = `${model}: ${e.name === "AbortError" ? "timeout" : e.message}`;
    }
  }
  geminiStart = 0;
  throw new Error(`gemini: ${last}`);
}

async function groq(system, user) {
  const r = await fetchWithTimeout(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.7,
        max_tokens: 6000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
    120_000,
  );
  if (!r.ok) throw new Error(`groq: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return {
    text: j.choices[0].message.content,
    provider: `groq:${GROQ_MODEL}`,
    usage: { input_tokens: j.usage?.prompt_tokens ?? 0, output_tokens: j.usage?.completion_tokens ?? 0 },
  };
}

/**
 * Generate an object that validates against `schema`.
 * `claude` is the original paid path, used only if every free backend failed and ANTHROPIC_API_KEY is set.
 * Returns { out, usage, provider }.
 */
export async function generateStructured({ system, user, schema, name, claude }) {
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
  const sys = `${system}

OUTPUT FORMAT
Return ONLY one JSON object ("${name}") that validates against this JSON Schema. No prose, no code fences:
${jsonSchema}`;

  const backends = [];
  if (process.env.GEMINI_API_KEY) backends.push(gemini);
  if (process.env.GROQ_API_KEY) backends.push(groq);

  const errors = [];
  for (const call of backends) {
    let message = user;
    const attempts = call === gemini ? 4 : 2;
    for (let attempt = 0; attempt < attempts; attempt++) {
      let res;
      try {
        res = await call(sys, message);
      } catch (e) {
        errors.push(e.message.slice(0, 220));
        if (call === gemini && attempt < attempts - 1) {
          await new Promise((ok) => setTimeout(ok, 20_000)); // every model busy (503/429): wait, then retry
          continue;
        }
        break; // backend down or rate-limited: next backend
      }
      let parsed;
      try {
        parsed = schema.safeParse(jsonFrom(res.text));
      } catch (e) {
        parsed = { success: false, error: { issues: [{ path: [], message: `invalid JSON (${e.message})` }] } };
      }
      if (parsed.success) return { out: parsed.data, usage: res.usage, provider: res.provider };
      const issues = parsed.error.issues
        .slice(0, 6)
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      errors.push(`${res.provider}: schema ${issues}`);
      // a model that returned broken JSON tends to repeat it: move the next attempt to the next Gemini model
      if (call === gemini) geminiStart = (geminiStart + 1) % GEMINI_MODELS.length;
      message = `${user}\n\nYour previous JSON failed validation: ${issues}\nReturn the corrected JSON object only.`;
    }
  }

  if (claude && process.env.ANTHROPIC_API_KEY) {
    console.log(`  free LLMs failed (${errors.join(" | ") || "no free key"}), falling back to Claude`);
    const r = await claude();
    return { ...r, provider: "anthropic" };
  }
  throw new Error(`No LLM produced a valid ${name}: ${errors.join(" | ") || "no GEMINI_API_KEY / GROQ_API_KEY set"}`);
}
