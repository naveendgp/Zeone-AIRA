import { record } from "../../_lib/analytics";
import { planById, gstSplit } from "../../_lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * v0 of buying: capture the intent, notify the owner, send the payment link by hand.
 *
 * Deliberately no payment gateway. Nothing can be delivered on payment anyway — a real
 * number has to be provisioned and the customer's line forwarded — so a checkout that
 * charged instantly would only be pretending. Ten manual Razorpay links is the cheapest
 * possible way to learn whether anyone pays at all.
 */
const MAX = 8 * 1024;

/** Indian mobile: 10 digits starting 6-9, with or without +91. WhatsApp needs this exact shape. */
function normaliseMobile(raw: string): string | null {
  const d = raw.replace(/\D/g, "").replace(/^0+/, "");
  const ten = d.length > 10 && d.startsWith("91") ? d.slice(-10) : d;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

/**
 * The line to be answered is very often a landline — "0422 234 5678" for a Coimbatore
 * clinic. Holding it to the mobile pattern silently dropped exactly the number the whole
 * order is about, so this only sanity-checks the length and keeps the STD code.
 */
function normaliseLine(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  const trimmed = d.startsWith("91") && d.length > 11 ? d.slice(2) : d;
  return trimmed.length >= 8 && trimmed.length <= 12 ? trimmed : null;
}

export async function POST(req: Request) {
  let body: Record<string, string>;
  try {
    const raw = await req.text();
    if (raw.length > MAX) return Response.json({ error: "too_large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad_body" }, { status: 400 });
  }

  const plan = planById(body.plan);
  if (!plan) return Response.json({ error: "unknown_plan" }, { status: 400 });

  const business = (body.business ?? "").trim().slice(0, 120);
  const owner = (body.owner ?? "").trim().slice(0, 80);
  const whatsapp = normaliseMobile(body.whatsapp ?? "");
  const businessPhone = (body.businessPhone ?? "").trim() ? normaliseLine(body.businessPhone) : null;

  const issues: string[] = [];
  if (business.length < 2) issues.push("business");
  if (owner.length < 2) issues.push("owner");
  if (!whatsapp) issues.push("whatsapp");
  if (issues.length) return Response.json({ error: "invalid", issues }, { status: 422 });

  // Short, sayable reference — you'll be reading this out on WhatsApp.
  const ref = `Z${Date.now().toString(36).slice(-5).toUpperCase()}`;
  const money = plan.price ? gstSplit(plan.price) : null;

  const order = {
    ref,
    plan: plan.id,
    planName: plan.name,
    price: plan.price,
    base: money?.base ?? null,
    gst: money?.gst ?? null,
    business,
    owner,
    whatsapp,
    businessPhone,
    email: (body.email ?? "").trim().slice(0, 120) || null,
    gstin: (body.gstin ?? "").trim().toUpperCase().slice(0, 15) || null,
    note: (body.note ?? "").trim().slice(0, 400) || null,
    city: req.headers.get("x-vercel-ip-city") ?? null,
    status: "new",
  };

  await record({ sid: body.sid?.slice(0, 40) || "order", type: "order", ...order });

  // Optional ping so you don't have to sit on /admin. Any webhook that accepts JSON —
  // Slack, Discord, or a WhatsApp relay. Never blocks or fails the order.
  const hook = process.env.ORDER_WEBHOOK_URL;
  if (hook) {
    const line =
      `🔔 ${plan.name} — ${business} (${owner})\n` +
      `WhatsApp: +91 ${whatsapp}\n` +
      (businessPhone ? `Line to answer: ${businessPhone}\n` : "") +
      (plan.price ? `Amount: ₹${plan.price} incl GST\n` : "Custom pricing\n") +
      `Ref: ${ref}`;
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: line, content: line, order }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      /* the order is already recorded; a failed ping must not lose it */
    }
  }

  return Response.json({ ok: true, ref });
}
