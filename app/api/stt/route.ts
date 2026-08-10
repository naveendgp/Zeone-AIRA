export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Hosted platforms default to a 10s function timeout; the upstream calls here
// can legitimately take longer than that.
export const maxDuration = 30;

/**
 * Speech-to-text for the web demo, using the same stack as the phone agent.
 *
 * Mirrors agent.py's STT_PROVIDER switch:
 *   whisper (default) -> local mlx-whisper large-v3 via whisper_server.py on :8123
 *   sarvam            -> Sarvam saarika, the same cloud fallback agent.py offers
 *
 * Whisper is on-device: no per-minute cost, nothing leaves the machine, and it keeps
 * English terms in English inside Tamil speech. It needs whisper_server.py running:
 *     ./venv/bin/python whisper_server.py
 */
const PROVIDER = (process.env.STT_PROVIDER ?? "whisper").toLowerCase();
const WHISPER_URL = process.env.WHISPER_URL ?? "http://127.0.0.1:8123/transcribe";
const SARVAM_MODEL = process.env.SARVAM_STT_MODEL ?? "saarika:v2.5";
const MAX_BYTES = 8 * 1024 * 1024;

const HITS = new Map<string, number[]>();
const RATE = Number(process.env.STT_RATE_LIMIT ?? 600);
function throttled(ip: string, max = RATE): boolean {
  const now = Date.now();
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  HITS.set(ip, recent);
  if (HITS.size > 500) HITS.clear();
  return recent.length > max;
}

async function viaWhisper(bytes: ArrayBuffer, type: string, lang: string, prompt: string) {
  const res = await fetch(WHISPER_URL, {
    method: "POST",
    headers: {
      "Content-Type": type,
      // Biases decoding toward this business's vocabulary, exactly as agent.py does with
      // initial_prompt. Base64 because HTTP headers are ByteStrings — raw Tamil throws
      // "character ... greater than 255".
      ...(prompt ? { "X-Whisper-Prompt-B64": Buffer.from(prompt, "utf8").toString("base64") } : {}),
      "X-Whisper-Lang": lang.split("-")[0], // "ta-IN" -> "ta"
    },
    body: bytes,
    signal: AbortSignal.timeout(45_000), // large-v3 on a long turn is not instant
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`whisper ${res.status}: ${detail.slice(0, 160)}`);
  }
  const d = (await res.json()) as { text?: string; audio_seconds?: number; took_seconds?: number };
  return { text: (d.text ?? "").trim(), engine: "whisper-mlx", audio: d.audio_seconds, took: d.took_seconds };
}

async function viaSarvam(file: File, type: string, lang: string) {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY not set");
  // Sarvam matches the mime exactly and 400s on "audio/webm;codecs=opus" — strip params.
  const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("file", new File([await file.arrayBuffer()], `turn.${ext}`, { type }));
  form.append("model", SARVAM_MODEL);
  form.append("language_code", lang);
  const res = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: { "api-subscription-key": key },
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`sarvam ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const d = (await res.json()) as { transcript?: string };
  return { text: (d.transcript ?? "").trim(), engine: "sarvam" };
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttled(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

  let audio: File | null = null;
  let lang = "ta-IN";
  let prompt = "";
  try {
    const form = await req.formData();
    const f = form.get("audio");
    if (f instanceof File) audio = f;
    const l = form.get("lang");
    if (typeof l === "string" && /^[a-z]{2}-[A-Z]{2}$/.test(l)) lang = l;
    const p = form.get("prompt");
    if (typeof p === "string") prompt = p.slice(0, 600);
  } catch {
    return Response.json({ error: "bad_form" }, { status: 400 });
  }

  if (!audio || audio.size === 0) return Response.json({ error: "no_audio" }, { status: 400 });
  if (audio.size > MAX_BYTES) return Response.json({ error: "too_long" }, { status: 413 });

  const type = (audio.type || "audio/webm").split(";")[0].trim();

  try {
    const out = PROVIDER === "sarvam"
      ? await viaSarvam(audio, type, lang)
      : await viaWhisper(await audio.arrayBuffer(), type, lang, prompt);
    return Response.json(out);
  } catch (e) {
    const msg = (e as Error).message;
    console.warn("[stt]", msg);
    // A dead sidecar is the likeliest failure — say so plainly instead of "stt_error".
    const down = PROVIDER !== "sarvam" && /fetch failed|ECONNREFUSED|timeout/i.test(msg);
    return Response.json(
      { error: down ? "whisper_offline" : "stt_failed", detail: msg.slice(0, 200) },
      { status: down ? 503 : 502 }
    );
  }
}
