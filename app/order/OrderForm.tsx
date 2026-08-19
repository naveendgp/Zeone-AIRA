"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { planById, rupees, gstSplit, type Plan } from "../_lib/plans";

/** Whatever the visitor built at /start, so the form can greet them by business name. */
function savedDraft(): { name?: string; type?: string; phone?: string } | null {
  try {
    const raw = localStorage.getItem("zeone.onboarding.v2");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function Field({
  label, optional, hint, ...rest
}: { label: string; optional?: boolean; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
        {label}
        {optional && <span className="ml-1.5 font-medium normal-case tracking-normal text-ink-ghost">optional</span>}
      </label>
      <input
        {...rest}
        className="h-[52px] w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-ghost focus:border-brand/50 focus:ring-2 focus:ring-brand/15"
      />
      {hint && <p className="mt-1.5 text-[12px] text-ink-faint">{hint}</p>}
    </div>
  );
}

export function OrderForm({ plan }: { plan: Plan }) {
  const [form, setForm] = useState({
    business: "", owner: "", whatsapp: "", businessPhone: "", email: "", gstin: "", note: "",
  });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [ref, setRef] = useState("");
  const [issues, setIssues] = useState<string[]>([]);

  // Prefill from the setup they already did — retyping the business name after building a
  // whole assistant with it is the kind of friction that loses a sale.
  useEffect(() => {
    const d = savedDraft();
    if (d?.name) setForm((f) => ({ ...f, business: f.business || d.name!, businessPhone: f.businessPhone || (d.phone ?? "") }));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setState("busy");
    setIssues([]);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, plan: plan.id }),
      });
      const d = await res.json();
      if (!res.ok) {
        setIssues(d.issues ?? ["unknown"]);
        setState("idle");
        return;
      }
      setRef(d.ref);
      setState("done");
    } catch {
      setIssues(["network"]);
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <div className="rounded-[19px] border border-leaf-line bg-leaf-soft/40 p-8 text-center">
        <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf text-white">
          <Check className="h-6 w-6" strokeWidth={3} />
        </span>
        <h2 className="text-[22px] font-extrabold tracking-tight text-ink">We&apos;ve got it.</h2>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-ink-dim">
          Your reference is <strong className="font-mono text-ink">{ref}</strong>. We&apos;ll WhatsApp
          you a payment link on <strong className="text-ink">+91 {form.whatsapp}</strong>, usually within a
          couple of hours. Nothing is charged until you open it.
        </p>
        <Link href="/start" prefetch className="mt-6 inline-block text-[13.5px] font-semibold text-brand underline-offset-4 hover:underline">
          Keep playing with your assistant →
        </Link>
      </div>
    );
  }

  const money = plan.price ? gstSplit(plan.price) : null;
  const bad = (k: string) => issues.includes(k);

  return (
    <>
      <div className="mb-7 rounded-2xl border border-line bg-white p-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[15px] font-extrabold tracking-tight text-ink">{plan.name}</span>
          {plan.price ? (
            <span className="text-[22px] font-semibold tabular-nums tracking-tight text-ink">
              {rupees(plan.price)}<span className="text-[13px] font-normal text-ink-ghost">/month</span>
            </span>
          ) : (
            <span className="text-[16px] font-semibold text-ink">Custom</span>
          )}
        </div>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          {plan.minutes} · {plan.concurrent}
          {money && <> · includes {rupees(money.gst)} GST</>}
        </p>
      </div>

      <div className="space-y-5">
        <Field
          label="Business name"
          value={form.business}
          onChange={set("business")}
          placeholder="Anand Dental Care"
          aria-invalid={bad("business")}
        />
        <Field
          label="Your name"
          value={form.owner}
          onChange={set("owner")}
          placeholder="Dr. Anand"
          aria-invalid={bad("owner")}
        />
        <Field
          label="WhatsApp number"
          value={form.whatsapp}
          onChange={set("whatsapp")}
          placeholder="98400 00000"
          inputMode="tel"
          hint={bad("whatsapp") ? "That doesn't look like an Indian mobile number." : "We send the payment link and the setup steps here."}
          aria-invalid={bad("whatsapp")}
        />
        <Field
          label="Number you want answered"
          optional
          value={form.businessPhone}
          onChange={set("businessPhone")}
          placeholder="0422 000 0000"
          inputMode="tel"
          hint="The line your customers already call. You keep it — we just answer it."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" optional value={form.email} onChange={set("email")} placeholder="you@clinic.com" inputMode="email" />
          <Field label="GSTIN" optional value={form.gstin} onChange={set("gstin")} placeholder="33AAAAA0000A1Z5" hint="For an input-credit invoice." />
        </div>
      </div>

      {issues.length > 0 && !bad("business") && !bad("owner") && !bad("whatsapp") && (
        <p className="mt-4 text-[13px] text-rose-600">Something went wrong. Try again in a moment.</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={state === "busy"}
        className="mt-7 flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
      >
        {state === "busy" && <Loader2 className="h-4 w-4 animate-spin" />}
        {plan.price ? "Send me the payment link" : "Ask for a quote"}
      </button>
      <p className="mt-3 text-center text-[12px] text-ink-faint">
        No card needed now. Nothing is charged until you open the link.
      </p>
    </>
  );
}
