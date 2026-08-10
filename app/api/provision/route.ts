import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { draftSchema } from "../../start/_lib/schema";
import { slugify, toAgentConfig } from "../../start/_lib/toAgentConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Repo root — this Next app lives in VoiceAI-Website/ inside it. */
const ROOT = path.resolve(process.cwd(), "..");
const PROFILES = path.join(ROOT, "profiles");
const DB_PATH = path.join(ROOT, "zeone.db");

/**
 * Hand the onboarding answers to the Python voice agent.
 *
 * Writes profiles/<slug>.json (what `ZEONE_CONFIG` points at) and registers the business
 * in zeone.db so the dashboard lists it. This is a local developer convenience — it writes
 * to disk outside the web root, so it stays disabled in production.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production" && process.env.ZEONE_ALLOW_PROVISION !== "1") {
    return Response.json(
      { error: "Provisioning is disabled in production. Run this locally, or POST to your own backend." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "That setup isn't complete yet.", issues: parsed.error.issues.map((i) => i.message) },
      { status: 422 }
    );
  }

  const draft = parsed.data;
  const config = toAgentConfig(draft);
  // slug is sanitised to [a-z0-9-] so it can't escape the profiles directory
  const slug = slugify(draft.name);
  const file = path.join(PROFILES, `${slug}.json`);

  try {
    await mkdir(PROFILES, { recursive: true });
    await writeFile(file, JSON.stringify(config, null, 2) + "\n", "utf-8");
  } catch (e) {
    return Response.json({ error: `Couldn't write the profile: ${(e as Error).message}` }, { status: 500 });
  }

  // Registering in the DB is a nice-to-have — a missing/locked zeone.db must not fail
  // the part that actually matters, which is the profile the agent reads.
  let businessId: number | null = null;
  let dbNote: string | null = null;
  try {
    const sqlite = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
    const db = new sqlite.DatabaseSync(DB_PATH);
    db.exec(`CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      config TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
    const json = JSON.stringify(config);
    const existing = db.prepare("SELECT id FROM businesses WHERE name = ?").get(config.business_name) as
      | { id: number }
      | undefined;
    if (existing) {
      db.prepare("UPDATE businesses SET config = ? WHERE id = ?").run(json, existing.id);
      businessId = existing.id;
    } else {
      const r = db.prepare("INSERT INTO businesses (name, config) VALUES (?, ?)").run(
        config.business_name,
        json
      );
      businessId = Number(r.lastInsertRowid);
    }
    db.close();
  } catch (e) {
    dbNote = `Profile written, but zeone.db wasn't updated: ${(e as Error).message}`;
  }

  return Response.json({
    ok: true,
    slug,
    profilePath: path.relative(ROOT, file),
    businessId,
    dbNote,
    command: `ZEONE_CONFIG=profiles/${slug}.json ./run.sh`,
    summary: {
      services: config.services.length,
      staff: config.staff.length,
      faqs: config.faqs.length,
      policies: Object.keys(config.policies).length,
      openTime: config.open_time,
      closeTime: config.close_time,
      closedDay: config.closed_day,
    },
  });
}
