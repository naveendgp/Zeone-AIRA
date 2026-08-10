import { record, type EventType } from "../../_lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Client-side events (session start, step progress, finished setup).
 *
 * Server-side events are recorded where they happen — /api/demo-chat and /api/stt know
 * things the browser can't, like which Gemini model answered and whether grounding held.
 */
const ALLOWED: EventType[] = ["session", "step", "generated", "voice", "error"];
const MAX_BODY = 64 * 1024; // a full draft with staff and FAQs, with room to spare

export async function POST(req: Request) {
  let body: { sid?: string; type?: string; data?: unknown };
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return Response.json({ ok: false }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const type = body.type as EventType;
  if (!ALLOWED.includes(type)) return Response.json({ ok: false }, { status: 400 });
  const sid = typeof body.sid === "string" ? body.sid.slice(0, 40) : "anon";

  await record({
    sid,
    type,
    data: body.data,
    ua: (req.headers.get("user-agent") ?? "").slice(0, 160),
    // City only — enough to tell Coimbatore friends from Chennai ones, without storing an IP.
    city: req.headers.get("x-vercel-ip-city") ?? undefined,
  });

  return Response.json({ ok: true });
}
