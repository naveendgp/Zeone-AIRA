"use client";

/**
 * Thin client for /api/track.
 *
 * The session id is a random string in sessionStorage, not a cookie and not tied to any
 * person — it exists only to stitch one visitor's steps into a single row on the dashboard.
 * Nothing here is allowed to throw: a blocked request must never break onboarding.
 */
const SID_KEY = "zeone.sid";

export function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "anon"; // private mode / storage disabled
  }
}

export function track(type: string, data?: unknown): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ sid: sessionId(), type, data });
  try {
    // sendBeacon survives the page being closed mid-step, which is exactly the moment a
    // drop-off happens — the one event you most want to see on the dashboard.
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch {
    /* fall through to fetch */
  }
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => { /* never surface analytics failures */ });
}
