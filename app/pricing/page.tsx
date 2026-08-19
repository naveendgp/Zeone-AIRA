import Link from "next/link";
import { Check, Mic } from "lucide-react";
import { PLANS, rupees } from "../_lib/plans";

export const metadata = {
  title: "Zeone pricing — from ₹2,999/month",
  description: "A receptionist costs ₹18,000 and goes home at 7. Zeone answers every call, in Tamil, all night.",
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-[1040px] px-5 pb-24 pt-16 sm:px-8">
      <header className="mb-12 text-center">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-[19px] font-extrabold tracking-[-1px] text-ink">
          <span className="grid h-[27px] w-[27px] place-items-center rounded-[9px] bg-brand font-display text-[15px] font-bold italic text-white shadow-[0_5px_13px_#7254ef55]">
            Z
          </span>
          zeone
        </Link>
        <h1 className="text-[34px] font-extrabold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[46px]">
          A receptionist costs ₹18,000
          <br />
          <em className="font-display font-semibold italic text-brand-hover">and goes home at 7.</em>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-[15.5px] leading-relaxed text-ink-dim">
          Zeone answers every call — nights, Sundays, and while you&apos;re with a customer.
          All prices include GST. No setup fee, cancel any time.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`relative flex flex-col rounded-[19px] border bg-white p-6 ${
              p.popular ? "border-brand/40 shadow-[0_18px_44px_#6d4ed81f]" : "border-line"
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white">
                Most chosen
              </span>
            )}

            <h2 className="text-[17px] font-extrabold tracking-tight text-ink">{p.name}</h2>
            <p className="mt-1.5 min-h-[40px] text-[13px] leading-relaxed text-ink-dim">{p.blurb}</p>

            <div className="mb-5 mt-4">
              {p.price === null ? (
                <span className="text-[30px] font-semibold tracking-tight text-ink">Custom</span>
              ) : (
                <>
                  <span className="text-[36px] font-semibold tabular-nums tracking-tight text-ink">
                    {rupees(p.price)}
                  </span>
                  <span className="text-[14px] text-ink-ghost">/month</span>
                  <span className="mt-1 block text-[12px] text-ink-faint">including GST</span>
                </>
              )}
            </div>

            <div className="mb-4 rounded-xl bg-paper-tint px-4 py-3 text-[13px] text-ink-soft">
              <div className="font-semibold text-ink">{p.minutes}</div>
              <div className="mt-0.5 text-ink-faint">{p.concurrent}</div>
              {p.overage && <div className="mt-0.5 text-ink-faint">{p.overage}</div>}
            </div>

            <ul className="mb-7 flex-1 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-[13.5px] leading-snug text-ink-soft">
                  <Check className="mt-[3px] h-[15px] w-[15px] shrink-0 text-leaf" strokeWidth={3} />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={`/order?plan=${p.id}`}
              className={`flex h-[50px] items-center justify-center gap-2 rounded-xl text-[14.5px] font-bold transition-colors ${
                p.popular
                  ? "bg-brand text-white hover:bg-brand-hover"
                  : "border border-line-strong text-ink hover:border-brand/40 hover:text-brand"
              }`}
            >
              {p.price === null ? "Talk to us" : `Get ${p.name}`}
            </Link>
          </div>
        ))}
      </div>

      {/* Honest about what happens next — nothing activates the moment you pay. */}
      <section className="mt-12 rounded-[19px] border border-line bg-white p-7">
        <h2 className="text-[17px] font-extrabold tracking-tight text-ink">What happens after you choose</h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            ["1", "You tell us where to call", "Your name, WhatsApp number, and the business line you want answered."],
            ["2", "We send a payment link", "On WhatsApp, usually within a couple of hours. UPI, card or netbanking."],
            ["3", "Your number goes live", "We connect it and make a test call together — same day, or the next morning."],
          ].map(([n, h, d]) => (
            <li key={n} className="flex gap-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-[12.5px] font-bold text-brand">
                {n}
              </span>
              <span>
                <span className="block text-[14px] font-bold text-ink">{h}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-ink-dim">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10 text-center">
        <p className="text-[13.5px] text-ink-dim">Not sure yet? Hear it answer with your own details first.</p>
        <Link
          href="/start"
          prefetch
          className="mt-3 inline-flex h-[50px] items-center gap-2 rounded-xl bg-ink px-7 text-[14.5px] font-bold text-white transition-opacity hover:opacity-90"
        >
          <Mic className="h-4 w-4" />
          Talk to your AI receptionist
        </Link>
      </div>
    </main>
  );
}
