import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Hosted platforms default to a 10s function timeout; the upstream calls here
// can legitimately take longer than that.
export const maxDuration = 30;

const VOICE = process.env.ELEVEN_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL"; // Sarah (free premade)
const MODEL = process.env.ELEVEN_MODEL ?? "eleven_turbo_v2_5";

/**
 * Sarah, tuned softer and younger for the web demo.
 *
 * stability 0.35  — lower than the 0.5 default; a flat read sounds older and more clerical
 * style     0.15  — a little warmth without the theatrical delivery high style produces
 * speed     1.04  — slightly quicker, which reads as younger energy
 * Override per-request only within these bounds; unbounded values make Tamil unstable.
 */
const VOICE_SETTINGS = {
  stability: 0.35,
  similarity_boost: 0.85,
  style: 0.15,
  use_speaker_boost: true,
  speed: 1.04,
};

const MAX_CHARS = Number(process.env.TTS_MAX_CHARS ?? 1200);

/**
 * The greeting is byte-identical on every single call, and ElevenLabs bills per character.
 * A tiny cache turns "every visitor who presses Call" into "once per phrase per deploy".
 */
const CACHE = new Map<string, ArrayBuffer>();
const CACHE_MAX = 60;

/** Crude per-IP throttle — this spends real credits. */
const HITS = new Map<string, number[]>();
const RATE = Number(process.env.TTS_RATE_LIMIT ?? 600);
function throttled(ip: string, max = RATE): boolean {
  const now = Date.now();
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  HITS.set(ip, recent);
  if (HITS.size > 500) HITS.clear();
  return recent.length > max;
}

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  // 204 => "no speech from me". The client falls back to the browser voice rather than
  // failing loudly, so a missing key degrades instead of breaking the demo.
  if (!key) return new Response(null, { status: 204 });

  let text = "";
  try {
    const body = (await req.json()) as { text?: string };
    text = (body.text ?? "").trim().slice(0, MAX_CHARS);
  } catch {
    return Response.json({ error: "Expected JSON { text }" }, { status: 400 });
  }
  if (!text) return Response.json({ error: "Empty text" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttled(ip)) return new Response(null, { status: 204 });

  const hash = createHash("sha1").update(`${VOICE}|${MODEL}|${JSON.stringify(VOICE_SETTINGS)}|${text}`).digest("hex");
  const hit = CACHE.get(hash);
  if (hit) {
    return new Response(hit, {
      headers: { "Content-Type": "audio/mpeg", "X-Zeone-Cache": "hit", "Cache-Control": "no-store" },
    });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          text,
          model_id: MODEL,
          language_code: "ta", // the assistant speaks Tamil with English words mixed in
          voice_settings: VOICE_SETTINGS,
        }),
      }
    );

    if (!res.ok) {
      // 401/402 (bad key, free-plan voice) shouldn't kill the call — fall back to the browser.
      console.warn("[tts] elevenlabs", res.status, (await res.text()).slice(0, 160));
      return new Response(null, { status: 204 });
    }

    const buf = await res.arrayBuffer();
    if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value as string);
    CACHE.set(hash, buf);

    return new Response(buf, {
      headers: { "Content-Type": "audio/mpeg", "X-Zeone-Cache": "miss", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.warn("[tts] failed:", (e as Error).message);
    return new Response(null, { status: 204 });
  }
}
