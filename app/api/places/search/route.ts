import { PLACES_FIXTURE, PLACES_KEY, fixtureSearch, type PlaceSuggestion } from "../../../_lib/places";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Typeahead for "find your business". Called per (debounced) keystroke, so it is throttled. */
const HITS = new Map<string, number[]>();
function throttled(ip: string, max = 90): boolean {
  const now = Date.now();
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  HITS.set(ip, recent);
  if (HITS.size > 500) HITS.clear();
  return recent.length > max;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
  const session = (searchParams.get("session") ?? "").slice(0, 64);
  if (q.length < 3) return Response.json({ results: [] });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttled(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

  if (PLACES_FIXTURE) return Response.json({ results: fixtureSearch(q) });
  if (!PLACES_KEY) return Response.json({ error: "not_configured" }, { status: 503 });

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": PLACES_KEY },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        input: q,
        // A session token ties the keystrokes to the eventual details lookup, which is how
        // Google bills the whole search as one session rather than per request.
        ...(session ? { sessionToken: session } : {}),
        includedRegionCodes: ["in"],
        languageCode: "en",
      }),
    });
    if (!res.ok) {
      console.warn("[places] autocomplete", res.status, (await res.text()).slice(0, 200));
      return Response.json({ error: "upstream" }, { status: 502 });
    }
    const data = (await res.json()) as {
      suggestions?: { placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } }; text?: { text: string } } }[];
    };
    const results: PlaceSuggestion[] = (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
      .slice(0, 6)
      .map((p) => ({
        id: p.placeId,
        main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        secondary: p.structuredFormat?.secondaryText?.text ?? "",
      }));
    return Response.json({ results });
  } catch {
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
