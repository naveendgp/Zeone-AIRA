import { z } from "zod";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Day = (typeof DAYS)[number];

export const BUSINESS_TYPES = [
  "clinic", "hospital", "dental", "salon", "restaurant",
  "retail", "mobile", "gym", "service", "education",
  // catch-all: the caller describes their own trade in `otherType`
  "other",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const POLICY_KEYS = [
  "parking", "card", "wheelchair", "insurance", "homeCollection", "emergency",
] as const;
export type PolicyKey = (typeof POLICY_KEYS)[number];

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

export const dayHoursSchema = z.object({
  closed: z.boolean(),
  open: time,
  close: time,
});

// NOTE: no .default() anywhere in here. Zod v4 defaults make the schema's input type
// diverge from its output type, which the react-hook-form resolver won't accept.
// Optional-and-possibly-empty is the honest shape anyway; emptyDraft() seeds "".
export const staffSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Name is required"),
  role: z.string().optional(),
  // kept as a string so the field can be empty while typing; parsed at the edges
  fee: z.string().optional(),
  hours: z.string().optional(),
});

export const serviceSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Service name is required"),
  price: z.string().optional(),
  /**
   * What to say when there is no fixed number — "depends on the design", "today's gold
   * rate, call and we'll tell you". Spoken instead of a rupee figure.
   *
   * A blank price used to be the only way to express this, and a blank price is exactly
   * what nobody can answer: the assistant would say it had no information about a service
   * the owner had just listed.
   */
  priceNote: z.string().optional(),
});

export const faqSchema = z.object({
  id: z.string(),
  q: z.string().trim().min(1, "Question is required"),
  a: z.string().trim().min(1, "Answer is required"),
});

export const policySchema = z.object({
  on: z.boolean(),
  note: z.string().optional(),
});

export const draftSchema = z.object({
  name: z.string().trim().min(2, "Tell us your business name"),
  type: z.enum(BUSINESS_TYPES, { message: "Pick the closest match" }),
  /** Free text, only used when type === "other". */
  otherType: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  hours: z.record(z.enum(DAYS), dayHoursSchema),
  staff: z.array(staffSchema),
  services: z.array(serviceSchema).min(1, "Add at least one service"),
  policies: z.record(z.enum(POLICY_KEYS), policySchema),
  faqs: z.array(faqSchema),
  /**
   * Answers to the category-specific questions (see PRESETS[type].questions).
   * Keyed by question id so adding or reordering questions never orphans an answer.
   */
  profile: z.record(z.string(), z.string()).optional(),
  /**
   * Questions generated for an unlisted trade ("Something else"). Stored on the draft
   * because, unlike the fixed categories, they can't be looked up from a static map later.
   */
  generatedQuestions: z.array(z.object({ id: z.string(), ask: z.string() })).optional(),
});

export type Draft = z.infer<typeof draftSchema>;
export type StaffMember = z.infer<typeof staffSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Faq = z.infer<typeof faqSchema>;

export const uid = () => Math.random().toString(36).slice(2, 9);

export function emptyDraft(): Draft {
  const hours = Object.fromEntries(
    DAYS.map((d) => [d, { closed: d === "Sunday", open: "09:00", close: "20:00" }])
  ) as Draft["hours"];
  const policies = Object.fromEntries(
    POLICY_KEYS.map((k) => [k, { on: false, note: "" }])
  ) as Draft["policies"];
  return {
    name: "", type: undefined as unknown as BusinessType, otherType: "",
    phone: "", address: "", website: "",
    hours, staff: [], services: [], policies, faqs: [], profile: {}, generatedQuestions: [],
  };
}
