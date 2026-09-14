import { DETAILS_FIELDS, PLACES_FIXTURE, PLACES_KEY, fixtureDetails, mapPlace } from "../../../_lib/places";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const session = (searchParams.get("session") ?? "").slice(0, 64);
  if (!/^[A-Za-z0-9_-]{6,300}$/.test(id)) return Response.json({ error: "bad_id" }, { status: 400 });

  if (PLACES_FIXTURE) {
    const f = fixtureDetails(id);
    return f ? Response.json(mapPlace(f)) : Response.json({ error: "not_found" }, { status: 404 });
  }
  if (!PLACES_KEY) return Response.json({ error: "not_configured" }, { status: 503 });

  try {
    const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`);
    url.searchParams.set("languageCode", "en");
    if (session) url.searchParams.set("sessionToken", session);
    const res = await fetch(url, {
      headers: { "X-Goog-Api-Key": PLACES_KEY, "X-Goog-FieldMask": DETAILS_FIELDS },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      console.warn("[places] details", res.status, (await res.text()).slice(0, 200));
      return Response.json({ error: "upstream" }, { status: res.status === 404 ? 404 : 502 });
    }
    return Response.json(mapPlace(await res.json()));
  } catch {
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
