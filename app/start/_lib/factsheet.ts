/**
 * The fact sheet handed to Gemini, and the check that its answers came from it.
 *
 * Same principle as booking_tools.BookingGuard on the Python side: the model proposes,
 * code disposes. Gemini says which fact it used; we confirm that fact actually exists in
 * the owner's setup before the answer is allowed to wear a green badge. A model claiming
 * "grounded" is not evidence — a matching field is.
 */
import { DAYS, type Draft, type PolicyKey } from "./schema";
import { PRESETS, POLICY_META, questionsFor, assistantNameFor, typeLabel } from "./presets";

export interface FactRef {
  /** Stable id the model must quote back, e.g. "service:3" or "policy:parking". */
  id: string;
  /** Human label shown under the confidence badge. */
  label: string;
}

export interface FactSheet {
  prompt: string;
  refs: Map<string, string>;
}

const money = (p?: string) => (p?.trim() ? `₹${p.trim()}` : "price not set");

export function buildFactSheet(draft: Draft): FactSheet {
  const preset = draft.type ? PRESETS[draft.type] : PRESETS.clinic;
  const who = assistantNameFor(draft.type, draft.name || "Zeone");
  const refs = new Map<string, string>();
  const lines: string[] = [];

  const add = (id: string, label: string, line: string) => {
    refs.set(id, label);
    lines.push(`[${id}] ${line}`);
  };

  add("business", "Business details",
    `Business: ${draft.name?.trim() || "—"} (${typeLabel(draft.type, draft.otherType)}). You are ${who}, the receptionist.`);

  const open = DAYS.filter((d) => !draft.hours?.[d]?.closed);
  const closed = DAYS.filter((d) => draft.hours?.[d]?.closed);
  add("hours", "Working hours",
    open.length
      ? `Open: ${open.map((d) => `${d} ${draft.hours[d].open}–${draft.hours[d].close}`).join("; ")}.` +
        (closed.length ? ` Closed on ${closed.join(", ")}.` : "")
      : "No open days configured.");

  if (draft.address?.trim()) add("address", "Business address", `Address: ${draft.address.trim()}`);
  if (draft.phone?.trim()) add("phone", "Contact details", `Phone: ${draft.phone.trim()}`);
  if (draft.website?.trim()) add("website", "Contact details", `Website: ${draft.website.trim()}`);

  (draft.services ?? []).filter((s) => s.name?.trim()).forEach((s, i) => {
    add(`service:${i}`, `Service — ${s.name.trim()}`, `Service: ${s.name.trim()} — ${money(s.price)}`);
  });

  (draft.staff ?? []).filter((s) => s.name?.trim()).forEach((s, i) => {
    const bits = [s.role?.trim(), s.fee?.trim() ? `fee ${money(s.fee)}` : "", s.hours?.trim()].filter(Boolean);
    add(`staff:${i}`, `${preset.staffNoun ?? "Staff"} — ${s.name.trim()}`,
      `${preset.staffNoun ?? "Staff"}: ${s.name.trim()}${bits.length ? ` (${bits.join(", ")})` : ""}`);
  });

  (Object.keys(POLICY_META) as PolicyKey[]).forEach((k) => {
    const p = draft.policies?.[k];
    if (!p) return;
    add(`policy:${k}`, `Policy — ${POLICY_META[k].label}`,
      `${POLICY_META[k].label}: ${p.on ? "YES" : "NO"}${p.on && p.note?.trim() ? ` — ${p.note.trim()}` : ""}`);
  });

  // Category-specific answers — the things this trade's callers always ask.
  questionsFor(draft).forEach((q) => {
    const a = draft.profile?.[q.id]?.trim();
    if (!a) return;
    // Stored as the caller's question plus the owner's own answer, so the model can
    // reuse the owner's wording rather than paraphrasing it.
    add(`profile:${q.id}`, `Your answer — “${q.ask}”`, `Q: ${q.ask}\n    A: ${a}`);
  });

  (draft.faqs ?? []).filter((f) => f.q?.trim() && f.a?.trim()).forEach((f, i) => {
    add(`faq:${i}`, `Your FAQ — “${f.q.trim()}”`, `Q: ${f.q.trim()}\n    A: ${f.a.trim()}`);
  });

  const prompt = `You are ${who}, the receptionist answering the phone for "${draft.name?.trim() || "this business"}".

THESE ARE THE ONLY FACTS YOU KNOW:
${lines.join("\n")}

RULES
1. Answer ONLY from the facts above. Never invent a service, price, doctor, timing or policy.
2. If the caller asks something not covered above, say you don't have that information and
   offer a call back. Do not guess, and do not answer from general knowledge.
3. Speak like a real front desk on a phone call: warm, one or two short sentences, no lists,
   no markdown. Tamil or English — match whatever the caller used.
4. Prices are exactly as written above. Never round, discount or estimate.
5. If they want to book, confirm the day and time against the working hours and ask for their name.

REPLY FORMAT — return ONLY this JSON, nothing else:
{"answer": "<what you say out loud>", "used": "<the [id] you took the fact from, or null>"}
"used" must be one of the ids in square brackets above, or null when you had no fact for it.`;

  return { prompt, refs };
}

export type Confidence = "grounded" | "general" | "unknown";

/** Trust the fact reference only if it exists. Everything else is downgraded. */
export function verify(
  used: string | null | undefined,
  refs: Map<string, string>
): { confidence: Confidence; source?: string } {
  if (!used || used === "null") return { confidence: "unknown", source: "Not in your knowledge base" };
  const key = used.replace(/^\[|\]$/g, "").trim();
  const label = refs.get(key);
  if (!label) {
    // The model cited something that isn't in the sheet — treat as ungrounded, not green.
    return { confidence: "general", source: "General response" };
  }
  return { confidence: "grounded", source: label };
}
