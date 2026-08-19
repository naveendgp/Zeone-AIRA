/**
 * Append-only event log for the hosted demo, so you can see what testers actually did.
 *
 * Upstash Redis over its REST API: plain fetch, no SDK, no new dependency, and it works
 * from a serverless function where there is no writable disk and no connection pooling.
 *
 * Recording must never be able to break or slow the demo — every call here swallows its
 * own errors and gives up after a couple of seconds. A dead analytics store means missing
 * rows on your dashboard, never a failed answer for a tester.
 */
const URL_ =
  process.env.UPSTASH_REDIS_REST_URL ??
  process.env.KV_REST_API_URL ??
  "";
const TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ??
  process.env.KV_REST_API_TOKEN ??
  "";

const KEY = "zeone:events";
/** Keep the log bounded so it always fits the free tier and the dashboard stays fast. */
const MAX_EVENTS = 5000;

export const analyticsEnabled = Boolean(URL_ && TOKEN);

export type EventType =
  | "session"      // someone opened /start
  | "step"         // moved to a named onboarding step
  | "generated"    // finished setup — carries the whole draft
  | "ask"          // asked the assistant something
  | "voice"        // a spoken turn, or a speech failure
  | "provision"
  | "order"        // someone asked to buy — v0 captures intent, payment is sent by hand
  | "error";

export interface ZeoneEvent {
  t: number;
  sid: string;
  type: EventType;
  [k: string]: unknown;
}

async function redis(command: unknown[]): Promise<unknown> {
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(2500),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}: ${(await res.text()).slice(0, 120)}`);
  return (await res.json())?.result;
}

/** Fire-and-mostly-forget. Awaited (serverless kills stray promises) but never throws. */
export async function record(ev: Omit<ZeoneEvent, "t">): Promise<void> {
  if (!analyticsEnabled) return;
  try {
    const payload = JSON.stringify({ ...ev, t: Date.now() });
    // LPUSH then LTRIM in one round trip.
    await fetch(`${URL_}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["LPUSH", KEY, payload],
        ["LTRIM", KEY, 0, MAX_EVENTS - 1],
      ]),
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
  } catch {
    /* analytics is never worth failing a request over */
  }
}

/** Newest first. Returns [] rather than throwing, so the dashboard always renders. */
export async function readEvents(limit = MAX_EVENTS): Promise<ZeoneEvent[]> {
  if (!analyticsEnabled) return [];
  try {
    const rows = (await redis(["LRANGE", KEY, 0, limit - 1])) as string[];
    return rows
      .map((r) => { try { return JSON.parse(r) as ZeoneEvent; } catch { return null; } })
      // A row missing its timestamp or session would render as "Invalid Date" and skew the
      // counts. Truncated writes and older event shapes are both real possibilities, so
      // drop anything that isn't a well-formed event rather than trusting the store.
      .filter((e): e is ZeoneEvent =>
        !!e && typeof e === "object" &&
        typeof e.t === "number" && Number.isFinite(e.t) &&
        typeof e.sid === "string" && typeof e.type === "string");
  } catch {
    return [];
  }
}

export async function clearEvents(): Promise<void> {
  if (!analyticsEnabled) return;
  try { await redis(["DEL", KEY]); } catch { /* nothing to do */ }
}
