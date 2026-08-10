import { draftSchema } from "../../start/_lib/schema";
import { buildFactSheet, verify } from "../../start/_lib/factsheet";
import { answer as localAnswer } from "../../start/_lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Hosted platforms default to a 10s function timeout; the upstream calls here
// can legitimately take longer than that.
export const maxDuration = 30;

const BASE = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai/";
/**
 * Ordered by measured behaviour on this key, not by version number:
 *   gemini-3.1-flash-lite          ~1.0s, returned valid JSON 3/3
 *   gemini-3.1-flash-lite-preview  ~1.2s, valid JSON 3/3
 *   gemini-3.6-flash               ~2.2s, occasionally truncates mid-JSON
 *   gemini-3.5-flash-lite          what run.sh uses; currently a hard 503 on this key
 * gemini-3-flash-preview is deliberately absent: 12-17s per reply and it ignores JSON
 * mode entirely ("Here is the JSON requested: ```"), which is unusable on a phone call.
 */
const MODELS = (process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite,gemini-3.1-flash-lite-preview,gemini-3.6-flash,gemini-3.5-flash-lite")
  .split(",").map((m) => m.trim()).filter(Boolean);

/** Crude per-IP throttle. The key is ours and every demo call spends real quota. */
const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = Number(process.env.DEMO_RATE_LIMIT ?? 600); // runaway-loop guard, not a usage cap

function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  HITS.set(ip, recent);
  if (HITS.size > 500) HITS.clear(); // cheap bound; this is a demo, not a gateway
  return recent.length > MAX_PER_WINDOW;
}

interface Body {
  draft: unknown;
  messages?: { role: "caller" | "assistant"; text: string }[];
  question: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = draftSchema.safeParse(body.draft);
  if (!parsed.success) return Response.json({ error: "Incomplete setup." }, { status: 422 });

  const question = (body.question ?? "").trim();
  if (!question) return Response.json({ error: "Empty question." }, { status: 400 });

  const draft = parsed.data;
  const key = process.env.GEMINI_API_KEY;

  // No key, throttled, or Gemini unhappy -> the deterministic engine still answers.
  // The demo must never show a dead assistant just because a network call failed.
  const fallback = (why: string) => {
    const a = localAnswer(draft, question);
    return Response.json({ ...a, engine: "local", note: why });
  };

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!key) return fallback("GEMINI_API_KEY not set");
  if (throttled(ip)) return fallback("rate limited");

  const { prompt, refs } = buildFactSheet(draft);
  const history = (body.messages ?? []).slice(-8).map((m) => ({
    role: m.role === "caller" ? ("user" as const) : ("assistant" as const),
    content: m.text,
  }));

  const messages = [{ role: "system", content: prompt }, ...history, { role: "user", content: question }];

  let raw = "";
  let lastErr = "";
  for (const model of MODELS) {
    try {
      const res = await fetch(`${BASE}chat/completions`, {
        method: "POST",
        // The OpenAI-compatible endpoint wants Bearer. (x-goog-api-key is for the *native*
        // v1beta/models/...:generateContent endpoint and 400s here.)
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(12_000),
        body: JSON.stringify({
          model,
          temperature: 0.3,
          max_completion_tokens: 400,
          response_format: { type: "json_object" },
          messages,
        }),
      });
      if (!res.ok) { lastErr = `gemini ${res.status} (${model})`; continue; }
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      if (!content.trim()) { lastErr = `empty content (${model})`; continue; }
      raw = content;
      break;
    } catch (e) {
      lastErr = (e as Error).name === "TimeoutError" ? `timeout (${model})` : `error (${model})`;
    }
  }

  if (!raw) return fallback(lastErr || "no model responded");

  try {

    let out: { answer?: string; used?: string | null };
    try {
      out = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return fallback("unparseable model output");
      out = JSON.parse(m[0]);
    }

    const text = (out.answer ?? "").trim();
    if (!text) return fallback("empty model answer");

    // The badge reflects OUR check of the cited fact, not the model's self-assessment.
    const { confidence, source } = verify(out.used, refs);
    return Response.json({ text, confidence, source, engine: "gemini" });
  } catch {
    return fallback("could not read the model's reply");
  }
}
