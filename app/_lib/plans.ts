/**
 * The plans, in one place — the pricing page, the order form and the dashboard all read
 * from here so a price can never say one thing on one screen and another elsewhere.
 *
 * Every rupee figure is GST-inclusive. A ₹2,999 plan is ₹2,541 of revenue plus ₹458 of
 * GST at 18%, and the invoice has to show that split even though the page does not.
 */
export const GST_RATE = 0.18;

export interface Plan {
  id: "starter" | "growth" | "enterprise";
  name: string;
  /** GST-inclusive rupees per month. null = "talk to us". */
  price: number | null;
  blurb: string;
  minutes: string;
  concurrent: string;
  features: string[];
  /** Charged per extra minute once the allowance runs out, GST-inclusive. */
  overage?: string;
  popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 2999,
    blurb: "For a single clinic or shop that just wants every call answered.",
    minutes: "400 AI minutes",
    concurrent: "1 call at a time",
    overage: "₹6/min after that",
    features: [
      "Tamil + English on the same call",
      "Answers from your details — never invents a price",
      "Appointment booking",
      "Customer records",
      "Call analytics & transcripts",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 6999,
    popular: true,
    blurb: "For a busy practice where the phone rings while you're with someone.",
    minutes: "750 AI minutes",
    concurrent: "3 calls at once",
    overage: "₹5/min after that",
    features: [
      "Everything in Starter",
      "WhatsApp reminders to customers",
      "Follow-ups on missed enquiries",
      "Advanced analytics & business insights",
      "Multiple staff logins",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    blurb: "For hospitals and multi-branch businesses.",
    minutes: "Custom minutes",
    concurrent: "10+ calls at once",
    features: [
      "Multiple branches",
      "SIP / PBX connection",
      "Custom integrations",
      "Dedicated infrastructure",
      "Priority support",
    ],
  },
];

export const planById = (id?: string) => PLANS.find((p) => p.id === id);

/** ₹2,999 -> "₹2,999". Indian grouping, no decimals. */
export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** The GST already inside a displayed price, for the invoice line. */
export function gstSplit(inclusive: number) {
  const base = inclusive / (1 + GST_RATE);
  return { base: Math.round(base), gst: Math.round(inclusive - base) };
}
