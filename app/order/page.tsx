import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { planById, PLANS } from "../_lib/plans";
import { OrderForm } from "./OrderForm";

export const metadata = { title: "Zeone — get started" };

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: id } = await searchParams;
  // An unknown or missing ?plan lands on Starter rather than erroring — a broken link
  // should never be the reason someone gives up at the buying step.
  const plan = planById(id) ?? PLANS[0];

  return (
    <main className="mx-auto max-w-[560px] px-5 pb-24 pt-14 sm:px-8">
      <Link
        href="/pricing"
        className="mb-8 inline-flex items-center gap-2 text-[13.5px] text-ink-faint transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All plans
      </Link>

      <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink">
        Where should we send
        <br />
        <em className="font-display font-semibold italic text-brand-hover">the payment link?</em>
      </h1>
      <p className="mt-4 text-[14.5px] leading-relaxed text-ink-dim">
        Four details and you&apos;re done. We&apos;ll WhatsApp you a link, and once it&apos;s paid we
        connect your number and call you to test it together.
      </p>

      <div className="mt-9">
        <OrderForm plan={plan} />
      </div>
    </main>
  );
}
