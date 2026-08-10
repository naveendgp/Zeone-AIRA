export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Hosted platforms default to a 10s function timeout; the upstream calls here
// can legitimately take longer than that.
export const maxDuration = 30;

/**
 * Five questions real callers would ask THIS business, generated for trades we don't have
 * a template for ("Something else").
 *
 * Every listed category has a hand-written list; only the unknown ones come through here.
 * Generating questions is safe in a way that generating *answers* would not be — the owner
 * still supplies every answer, so nothing invented ever reaches a caller.
 */
const BASE = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai/";
const MODELS = (process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite,gemini-3.1-flash-lite-preview,gemini-3.6-flash")
  .split(",").map((m) => m.trim()).filter(Boolean);

/** Same trade asked twice costs one generation, not two. */
const CACHE = new Map<string, string[]>();

/** Used when there's no key, or the model won't cooperate. */
const GENERIC = [
  "What are your timings?",
  "How much do you charge?",
  "Do I need to book, or can I just come?",
  "Where exactly are you located?",
  "Do you deliver or come to the customer?",
];

function clean(list: unknown): string[] | null {
  if (!Array.isArray(list)) return null;
  const out = list
    .filter((q): q is string => typeof q === "string")
    .map((q) => q.trim().replace(/^\d+[.)]\s*/, ""))
    .filter((q) => q.length > 8 && q.length < 140)
    .slice(0, 5);
  return out.length === 5 ? out : null;
}

export async function POST(req: Request) {
  let trade = "";
  let name = "";
  try {
    const body = (await req.json()) as { trade?: string; name?: string };
    trade = (body.trade ?? "").trim().slice(0, 80);
    name = (body.name ?? "").trim().slice(0, 80);
  } catch {
    return Response.json({ error: "bad_body" }, { status: 400 });
  }
  if (!trade) return Response.json({ questions: GENERIC, source: "generic" });

  const key = process.env.GEMINI_API_KEY;
  const cacheKey = trade.toLowerCase();
  const hit = CACHE.get(cacheKey);
  if (hit) return Response.json({ questions: hit, source: "cache" });
  if (!key) return Response.json({ questions: GENERIC, source: "generic" });

  const prompt = `A small business in Tamil Nadu, India describes itself as: "${trade}"${name ? ` (called "${name}")` : ""}.

List the 5 questions their customers most often ask when they PHONE this business.
Rules:
- Write them in the caller's own words, as spoken on a phone call.
- Make them specific to this trade — not generic "what are your timings" filler,
  unless timing genuinely is what people ring this trade about.
- Each must be answerable in one or two sentences by the owner.
- Indian context: rupees, local expectations.
- Write them in ENGLISH. The owner reads and answers these in the setup form; the
  assistant handles Tamil at speaking time. Do not romanise Tamil.
Return ONLY JSON: {"questions": ["...", "...", "...", "...", "..."]}`;

  for (const model of MODELS) {
    try {
      const res = await fetch(`${BASE}chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(12_000),
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_completion_tokens: 400,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const raw: string = data?.choices?.[0]?.message?.content ?? "";
      if (!raw.trim()) continue;
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw) as { questions?: unknown };
      const questions = clean(parsed.questions);
      if (!questions) continue;
      CACHE.set(cacheKey, questions);
      if (CACHE.size > 200) CACHE.delete(CACHE.keys().next().value as string);
      return Response.json({ questions, source: "gemini", model });
    } catch {
      /* try the next model */
    }
  }

  return Response.json({ questions: GENERIC, source: "generic" });
}
