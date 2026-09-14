import { DAYS, type BusinessType, type Draft, type PolicyKey } from "../start/_lib/schema";

/**
 * Google Places (New) → the shape onboarding needs.
 *
 * One pick on the search box replaces most of what the owner used to type: name, category,
 * address, phone, website, hours, and a few facilities Google already knows about.
 */
export const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";

/** Canned data for local work without a key. Never active in production. */
export const PLACES_FIXTURE = process.env.NODE_ENV !== "production" && process.env.PLACES_FIXTURE === "1";

export interface PlaceSuggestion {
  id: string;
  main: string;
  secondary: string;
}

export interface PlaceSummary {
  placeId: string;
  name: string;
  type: BusinessType;
  otherType: string;
  address: string;
  phone: string;
  website: string;
  hours: Draft["hours"] | null;
  policies: Partial<Record<PolicyKey, boolean>>;
  rating: number | null;
  reviewCount: number | null;
  reviews: string[];
}

/** Google's place types, most specific first, mapped to our categories. */
const TYPE_MAP: [RegExp, BusinessType][] = [
  [/^(dentist|dental_clinic)$/, "dental"],
  [/^hospital$/, "hospital"],
  [/^(doctor|medical_clinic|medical_lab|physiotherapist|chiropractor|pharmacy|skin_care_clinic)$/, "clinic"],
  [/^(beauty_salon|hair_salon|hair_care|barber_shop|nail_salon|spa|massage|makeup_artist)$/, "salon"],
  [/(restaurant|cafe|bakery|meal_takeaway|meal_delivery|food_court|sweets|coffee_shop|diner)/, "restaurant"],
  [/^(cell_phone_store|electronics_store)$/, "mobile"],
  [/^(gym|fitness_center|yoga_studio|sports_club)$/, "gym"],
  [/^(car_repair|car_wash|car_dealer|electrician|plumber|auto_parts_store|motorcycle_dealer|home_improvement_store)$/, "service"],
  [/(school|university|preschool|tutoring|library|educational)/, "education"],
  [/(store|shop|supermarket|market|mall)/, "retail"],
];

/** Tags Google adds to almost everything — they say nothing about what the business does. */
const GENERIC = /^(store|point_of_interest|establishment|health|finance|food|premise)$/;

/**
 * The primary type decides. The secondary list is only consulted when there is no primary
 * type — otherwise a tailor (primary "tailor", also tagged "store") became a retail shop
 * instead of falling through to "other" with its own label.
 */
function mapType(primary?: string, types: string[] = []): BusinessType {
  const candidates = primary ? [primary] : types.filter((t) => !GENERIC.test(t));
  for (const t of candidates) {
    for (const [re, ours] of TYPE_MAP) if (re.test(t)) return ours;
  }
  return "other";
}

const GOOGLE_DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const hhmm = (h = 0, m = 0) => `${String(Math.min(h, 23)).padStart(2, "0")}:${String(h >= 24 ? 59 : m).padStart(2, "0")}`;

interface Period { open?: { day: number; hour?: number; minute?: number }; close?: { day: number; hour?: number; minute?: number } }

/**
 * Periods become one window per day: earliest open, latest close. A lunch break collapses
 * into the outer window, which is what the booking guard can express anyway. A day with no
 * period is closed; a single open-ended period means open around the clock.
 */
function mapHours(periods?: Period[]): Draft["hours"] | null {
  if (!periods?.length) return null;
  const out = Object.fromEntries(
    DAYS.map((d) => [d, { closed: true, open: "09:00", close: "20:00" }])
  ) as Draft["hours"];

  if (periods.length === 1 && periods[0].open && !periods[0].close) {
    for (const d of DAYS) out[d] = { closed: false, open: "00:00", close: "23:59" };
    return out;
  }

  const seen = new Set<string>();
  for (const p of periods) {
    if (!p.open) continue;
    const day = GOOGLE_DAY[p.open.day];
    const open = hhmm(p.open.hour, p.open.minute);
    // Past-midnight closing is clamped to the end of the opening day.
    const close = !p.close || p.close.day !== p.open.day ? "23:59" : hhmm(p.close.hour, p.close.minute);
    const cur = out[day];
    if (!seen.has(day)) {
      out[day] = { closed: false, open, close };
      seen.add(day);
    } else {
      out[day] = { closed: false, open: open < cur.open ? open : cur.open, close: close > cur.close ? close : cur.close };
    }
  }
  return out;
}

interface RawPlace {
  id: string;
  displayName?: { text: string };
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  types?: string[];
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { periods?: Period[] };
  rating?: number;
  userRatingCount?: number;
  reviews?: { text?: { text: string }; originalText?: { text: string } }[];
  paymentOptions?: { acceptsCreditCards?: boolean; acceptsDebitCards?: boolean; acceptsNfc?: boolean; acceptsCashOnly?: boolean };
  parkingOptions?: Record<string, boolean>;
  accessibilityOptions?: { wheelchairAccessibleEntrance?: boolean };
}

export function mapPlace(p: RawPlace): PlaceSummary {
  const type = mapType(p.primaryType, p.types);
  const policies: Partial<Record<PolicyKey, boolean>> = {};
  // Only what Google actually states — an absent field is "unknown", not "no".
  if (p.paymentOptions) {
    const po = p.paymentOptions;
    if (po.acceptsCreditCards || po.acceptsDebitCards || po.acceptsNfc) policies.card = true;
    else if (po.acceptsCashOnly) policies.card = false;
  }
  if (p.parkingOptions && Object.values(p.parkingOptions).some(Boolean)) policies.parking = true;
  if (p.accessibilityOptions?.wheelchairAccessibleEntrance !== undefined) {
    policies.wheelchair = p.accessibilityOptions.wheelchairAccessibleEntrance;
  }

  return {
    placeId: p.id,
    name: p.displayName?.text ?? "",
    type,
    otherType: type === "other" ? p.primaryTypeDisplayName?.text ?? "" : "",
    address: p.formattedAddress ?? "",
    phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? "",
    website: p.websiteUri ?? "",
    hours: mapHours(p.regularOpeningHours?.periods),
    policies,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    reviews: (p.reviews ?? [])
      .map((r) => (r.originalText?.text ?? r.text?.text ?? "").trim())
      .filter(Boolean)
      .slice(0, 5),
  };
}

export const DETAILS_FIELDS = [
  "id", "displayName", "primaryType", "primaryTypeDisplayName", "types", "formattedAddress",
  "nationalPhoneNumber", "internationalPhoneNumber", "websiteUri", "regularOpeningHours",
  "rating", "userRatingCount", "reviews", "paymentOptions", "parkingOptions", "accessibilityOptions",
].join(",");

/* ---------------------------------- fixture ---------------------------------- */

const FIXTURES: RawPlace[] = [
  {
    id: "fx_anand_dental_care",
    displayName: { text: "Anand Dental Care" },
    primaryType: "dental_clinic",
    types: ["dental_clinic", "dentist", "health"],
    formattedAddress: "12, Gandhi Road, RS Puram, Coimbatore, Tamil Nadu 641002",
    nationalPhoneNumber: "0422 234 5678",
    websiteUri: "fixture://anand-dental",
    regularOpeningHours: {
      periods: [1, 2, 3, 4, 5, 6].flatMap((day) => [
        { open: { day, hour: 9, minute: 30 }, close: { day, hour: 13, minute: 30 } },
        { open: { day, hour: 17, minute: 0 }, close: { day, hour: 20, minute: 30 } },
      ]),
    },
    rating: 4.7,
    userRatingCount: 318,
    reviews: [
      { text: { text: "Dr. Anand explained the root canal clearly and it was painless. Staff are friendly." } },
      { text: { text: "Took my son for a checkup, Dr. Meena was very patient with kids. Free parking behind the clinic." } },
      { text: { text: "Clean clinic. Got braces here, they gave EMI option." } },
    ],
    paymentOptions: { acceptsCreditCards: true, acceptsDebitCards: true },
    parkingOptions: { freeParkingLot: true },
    accessibilityOptions: { wheelchairAccessibleEntrance: true },
  },
  {
    id: "fx_kumar_tailors",
    displayName: { text: "Kumar Tailors" },
    primaryType: "tailor",
    primaryTypeDisplayName: { text: "Tailor" },
    types: ["tailor", "store"],
    formattedAddress: "5, Cross Cut Road, Gandhipuram, Coimbatore 641012",
    nationalPhoneNumber: "098400 12345",
    regularOpeningHours: {
      periods: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ open: { day, hour: 10 }, close: { day, hour: 21 } })),
    },
    rating: 4.3,
    userRatingCount: 87,
  },
];

export function fixtureSearch(q: string): PlaceSuggestion[] {
  const n = q.toLowerCase();
  return FIXTURES
    .filter((f) => f.displayName!.text.toLowerCase().includes(n) || n.length < 4)
    .map((f) => ({ id: f.id, main: f.displayName!.text, secondary: f.formattedAddress ?? "" }));
}

export const fixtureDetails = (id: string) => FIXTURES.find((f) => f.id === id) ?? null;

export const FIXTURE_SITE = `
Anand Dental Care — RS Puram, Coimbatore
Our Doctors
Dr. R. Anand, BDS, MDS — Root canal and implant specialist
Dr. Meena Anand, BDS — Paediatric dentistry
Treatments and fees
Consultation — ₹300
Teeth cleaning and polishing — ₹800
Root canal treatment — starting from ₹4,500 per tooth
Braces (metal) — ₹25,000 onwards, EMI available for 3 or 6 months
Dental implants — price depends on the case, consult the doctor
Teeth whitening — ₹6,000
FAQ
Do you treat children? Yes, Dr. Meena sees children of all ages.
Emergency tooth pain? Call us and we will see you the same day.
We accept all cards and UPI.
`;
