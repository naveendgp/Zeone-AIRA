/**
 * One JSON-mode call to Gemini through the OpenAI-compatible endpoint, walking the model
 * chain until one answers with parseable JSON.
 *
 * Auth is `Authorization: Bearer` — the OpenAI-compatible endpoint rejects the
 * `x-goog-api-key` header the native API uses.
 */
const BASE = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai/";
const MODELS = (process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite,gemini-3.1-flash-lite-preview,gemini-3.6-flash")
  .split(",").map((m) => m.trim()).filter(Boolean);

export async function geminiJSON<T>(
  prompt: string,
  { maxTokens = 1500, timeoutMs = 20_000, budgetMs = 60_000 }: { maxTokens?: number; timeoutMs?: number; budgetMs?: number } = {}
): Promise<{ data: T; model: string } | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  // Total time across the whole fallback chain, so a slow first model can't push the
  // request past the host's limit by retrying on the next one.
  const deadline = Date.now() + budgetMs;

  for (const model of MODELS) {
    const left = deadline - Date.now();
    if (left < 2000) break;
    try {
      const res = await fetch(`${BASE}chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(Math.min(timeoutMs, left)),
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_completion_tokens: maxTokens,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) continue;
      const raw: string = (await res.json())?.choices?.[0]?.message?.content ?? "";
      const json = raw.match(/\{[\s\S]*\}/)?.[0];
      if (!json) continue;
      return { data: JSON.parse(json) as T, model };
    } catch {
      /* next model */
    }
  }
  return null;
}
