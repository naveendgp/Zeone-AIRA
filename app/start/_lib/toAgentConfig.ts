/**
 * Onboarding draft  ->  the JSON the Python voice agent actually loads.
 *
 * The agent's contract lives in profiles/*.json and is consumed by three places, so this
 * has to satisfy all of them:
 *   config_prompt.render_agent_prompt  — speaks these facts on the phone (Tamil)
 *   grounding.py                       — blocks services we don't offer, answers FAQs
 *   booking_tools.BookingGuard         — validates slots against open/close/closed_day
 *
 * Anything the guard reads (open_time, close_time, slot_minutes, closed_day) must be
 * machine-readable; anything the model *says* (hours, about) is prose.
 */
import { DAYS, type Draft, type PolicyKey } from "./schema";
import { questionsFor, PRESETS, ASSISTANT_NAME_TA, typeLabel } from "./presets";

/** Weekday names the booking guard understands (booking_tools._TA_DAYS). */
const TA_DAY: Record<string, string> = {
  Monday: "திங்கள்", Tuesday: "செவ்வாய்", Wednesday: "புதன்", Thursday: "வியாழன்",
  Friday: "வெள்ளி", Saturday: "சனி", Sunday: "ஞாயிறு",
};

/** Policy keys become spoken words: grounding.py says "ஆமா சார், {key} வசதி உண்டு". */
const POLICY_TERM: Record<PolicyKey, string> = {
  parking: "parking",
  card: "card payment",
  wheelchair: "wheelchair access",
  insurance: "insurance",
  homeCollection: "home collection",
  emergency: "emergency",
};

function tamilTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h < 12 ? "காலை" : h < 16 ? "மதியம்" : h < 19 ? "மாலை" : "இரவு";
  const h12 = h % 12 || 12;
  return m ? `${period} ${h12}:${String(m).padStart(2, "0")} மணி` : `${period} ${h12} மணி`;
}

/** Keywords for grounding.answer_faq — it matches these against the caller's words. */
function faqKeywords(q: string): string[] {
  const words = q.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 3);
  return [...new Set([q.toLowerCase().trim(), ...words])].slice(0, 8);
}

const NEEDS_STAFF = /consult|checkup|check-up|visit|session|training|class/i;

export interface AgentConfig {
  business_name: string;
  assistant_name: string;
  business_type: string;
  area: string;
  hours: string;
  closed_day: string;
  open_time: string;
  close_time: string;
  slot_minutes: number;
  staff: { name: string; specialty: string; fee: number | null; hours: string; available_days: string; name_en: string }[];
  services: { name: string; price: number | null; price_note: string | null; needs_staff: boolean; name_en: string }[];
  service_synonyms: Record<string, string[]>;
  policies: Record<string, string>;
  about: string;
  fallback: string;
  faqs: { q: string; a: string; keywords: string[] }[];
  _generated_by: string;
}

export function toAgentConfig(draft: Draft): AgentConfig {
  const preset = draft.type ? PRESETS[draft.type] : PRESETS.clinic;

  const openDays = DAYS.filter((d) => !draft.hours?.[d]?.closed);
  const closedDays = DAYS.filter((d) => draft.hours?.[d]?.closed);
  const first = openDays.length ? draft.hours[openDays[0]] : { open: "09:00", close: "20:00" };

  // The guard needs one window; take the earliest open and latest close across open days
  // so it never refuses a slot the business actually works.
  const openTime = openDays.length
    ? openDays.map((d) => draft.hours[d].open).sort()[0]
    : "09:00";
  const closeTime = openDays.length
    ? openDays.map((d) => draft.hours[d].close).sort().slice(-1)[0]
    : "20:00";

  const services = (draft.services ?? [])
    .filter((s) => s.name?.trim())
    .map((s) => ({
      name: s.name.trim(),
      price: s.price?.trim() ? Number(s.price.replace(/[^\d.]/g, "")) || null : null,
      // Spoken instead of a rupee figure when there is no fixed number.
      price_note: s.priceNote?.trim() || null,
      needs_staff: NEEDS_STAFF.test(s.name) && (draft.staff ?? []).some((x) => x.name?.trim()),
      name_en: s.name.trim(),
    }));

  const synonyms: Record<string, string[]> = {};
  for (const s of services) {
    const lower = s.name.toLowerCase();
    const words = lower.split(/\s+/).filter((w) => w.length > 3);
    const set = new Set([lower, ...(words.length > 1 ? words : [])]);
    synonyms[s.name] = [...set];
  }

  const policies: Record<string, string> = {};
  for (const key of Object.keys(POLICY_TERM) as PolicyKey[]) {
    const p = draft.policies?.[key];
    if (!p) continue;
    // The agent only distinguishes உண்டு / கிடையாது; the free-text note goes into `about`
    // rather than the policy value, because grounding.py compares the value exactly.
    policies[POLICY_TERM[key]] = p.on ? "உண்டு" : "கிடையாது";
  }

  const notes = (Object.keys(POLICY_TERM) as PolicyKey[])
    .filter((k) => draft.policies?.[k]?.on && draft.policies[k].note?.trim())
    .map((k) => `${POLICY_TERM[k]}: ${draft.policies[k].note!.trim()}`);

  const area = draft.address?.trim()
    ? draft.address.split(",").map((x) => x.trim()).filter(Boolean).slice(-2)[0] ?? draft.address.trim()
    : "";

  const label = typeLabel(draft.type, draft.otherType);
  const serviceList = services.slice(0, 6).map((s) => s.name).join(", ");

  return {
    business_name: draft.name?.trim() || "Frontline Business",
    assistant_name: ASSISTANT_NAME_TA,
    business_type: label,
    area,
    hours: openDays.length
      ? `${tamilTime(first.open)} முதல் ${tamilTime(first.close)} வரை`
      : "தற்போது மூடியிருக்கு",
    closed_day: closedDays.map((d) => TA_DAY[d]).join(", "),
    open_time: openTime,
    close_time: closeTime,
    slot_minutes: 30,
    staff: (draft.staff ?? [])
      .filter((s) => s.name?.trim())
      .map((s) => ({
        name: s.name.trim(),
        specialty: s.role?.trim() || "",
        fee: s.fee?.trim() ? Number(s.fee.replace(/[^\d.]/g, "")) || null : null,
        hours: s.hours?.trim() || "",
        available_days: s.hours?.trim() || openDays.map((d) => TA_DAY[d]).join(", "),
        name_en: s.name.trim(),
      })),
    services,
    service_synonyms: synonyms,
    policies,
    about: [
      `${label}${area ? `, ${area}` : ""}.`,
      serviceList ? `${serviceList} மாதிரி வசதிகள் இருக்கு.` : "",
      draft.address?.trim() ? `முகவரி: ${draft.address.trim()}.` : "",
      notes.join(". "),
    ].filter(Boolean).join(" "),
    fallback: draft.phone?.trim()
      ? `எங்க front desk-ல ${draft.phone.trim()} number-ல கேட்க, அல்லது உங்க number சொன்னா call back arrange பண்ண`
      : "எங்க front desk-ல கேட்க, அல்லது உங்க number சொன்னா நான் call back arrange பண்ண",
    // Owner FAQs first, then the category answers — grounding.answer_faq serves both,
    // so a "do you deliver?" call is answered whether it came from either source.
    faqs: [
      ...(draft.faqs ?? [])
        .filter((f) => f.q?.trim() && f.a?.trim())
        .map((f) => ({ q: f.q.trim(), a: f.a.trim(), keywords: faqKeywords(f.q) })),
      ...questionsFor(draft)
        .filter((q) => draft.profile?.[q.id]?.trim())
        .map((q) => ({
          q: q.ask,
          a: draft.profile![q.id].trim(),
          keywords: faqKeywords(q.ask),
        })),
    ],
    _generated_by: `frontline onboarding /start — ${new Date().toISOString()}`,
  };
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "business";
