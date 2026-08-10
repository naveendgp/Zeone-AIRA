"use client";

import type { Confidence } from "../../_lib/engine";
import { cn } from "../ui";

const META: Record<Confidence, { dot: string; ring: string; label: string }> = {
  grounded: { dot: "bg-leaf", ring: "border-leaf-line bg-leaf-soft text-leaf", label: "From business knowledge" },
  general: { dot: "bg-amber-500", ring: "border-amber-200 bg-amber-50 text-amber-700", label: "General response" },
  unknown: { dot: "bg-rose-500", ring: "border-rose-200 bg-rose-50 text-rose-600", label: "Information not available" },
};

export function ConfidenceBadge({
  confidence, source, className,
}: { confidence: Confidence; source?: string; className?: string }) {
  const m = META[confidence];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[10.5px] font-medium", m.ring, className)}
      title={source}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
      {source && <span className="hidden opacity-60 sm:inline">· {source}</span>}
    </span>
  );
}

export { META as CONFIDENCE_META };
