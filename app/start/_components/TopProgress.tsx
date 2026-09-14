"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

/** Hairline bar pinned to the very top — the only chrome the flow gets. */
export function TopProgress({
  current, total, onBack, onSkip, skipLabel = "Skip",
}: { current: number; total: number; onBack?: () => void; onSkip?: () => void; skipLabel?: string }) {
  const pct = Math.round((current / total) * 100);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-line">
        <motion.div
          className="h-full bg-brand"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 32 }}
        />
      </div>

      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-5 sm:px-8">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-black/[0.04] hover:text-ink"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <Link href="/" className="flex items-center gap-2 text-[19px] font-extrabold tracking-[-1px] text-ink">
            <span className="grid h-[27px] w-[27px] place-items-center rounded-[9px] bg-brand font-display text-[15px] font-bold italic text-white shadow-[0_5px_13px_#7254ef55]">
              F
            </span>
            frontline
          </Link>
        )}

        <div className="flex items-center gap-4">
          {/* optional steps can be left without scrolling to the bottom first */}
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full border border-line bg-white/80 px-3.5 py-1.5 text-[13px] font-semibold text-ink-dim backdrop-blur transition-colors hover:border-line-strong hover:text-ink"
            >
              {skipLabel}
            </button>
          )}
          <span className="font-mono text-[11px] tabular-nums text-ink-ghost">
            {current} / {total}
          </span>
        </div>
      </div>
    </>
  );
}
