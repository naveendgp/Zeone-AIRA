"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil } from "lucide-react";
import { DAYS, type Draft } from "../../_lib/schema";
import { Ask, Switch, cn } from "../ui";
import { Staff } from "./Staff";

/** "09:00" -> "9:00 AM", so the summary reads the way someone would say it out loud. */
function pretty(hhmm: string): string {
  const [h, m] = (hhmm ?? "").split(":").map(Number);
  if (Number.isNaN(h)) return hhmm ?? "";
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${period}` : `${h12} ${period}`;
}

/**
 * One line describing the whole week, e.g. "Mon–Sat 9 AM – 8 PM · Closed Sunday".
 * Collapses runs of identical days so the common case stays short.
 */
function summarise(hours: Draft["hours"]): string {
  const open = DAYS.filter((d) => !hours?.[d]?.closed);
  const closed = DAYS.filter((d) => hours?.[d]?.closed);
  if (!open.length) return "Closed every day";

  const short = (d: string) => d.slice(0, 3);
  const times = new Set(open.map((d) => `${hours[d].open}-${hours[d].close}`));

  let when: string;
  if (times.size === 1) {
    const first = hours[open[0]];
    // Contiguous run of open days reads as a range; anything else gets listed.
    const idx = open.map((d) => DAYS.indexOf(d));
    const contiguous = idx.every((n, i) => i === 0 || n === idx[i - 1] + 1);
    const days = open.length === 7 ? "Every day"
      : contiguous && open.length > 2 ? `${short(open[0])}–${short(open[open.length - 1])}`
      : open.map(short).join(", ");
    when = `${days} ${pretty(first.open)} – ${pretty(first.close)}`;
  } else {
    when = `${open.length} days, hours vary`;
  }

  return closed.length ? `${when} · Closed ${closed.map(short).join(", ")}` : when;
}

export function Hours() {
  const { control, setValue, register } = useFormContext<Draft>();
  const hours = useWatch({ control, name: "hours" }) as Draft["hours"];
  // Most shops match the 9–8, closed-Sunday default, so the seven-row grid is hidden until
  // someone actually wants to change it. Confirming beats filling in.
  const [editing, setEditing] = useState(false);

  const applyToAll = () => {
    const src = hours?.Monday;
    if (!src) return;
    for (const d of DAYS) {
      if (d === "Monday") continue;
      setValue(`hours.${d}.open`, src.open, { shouldDirty: true });
      setValue(`hours.${d}.close`, src.close, { shouldDirty: true });
    }
  };

  return (
    <>
      <Ask
        title="When are you open?"
        hint="Zeone refuses to book anything outside these hours, so callers never turn up at a closed door."
      />

      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        aria-expanded={editing}
        className={cn(
          "flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left transition-colors",
          editing ? "border-brand/30" : "border-line hover:border-line-strong"
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf-soft text-leaf">
          <Check className="h-[18px] w-[18px]" strokeWidth={3} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold text-ink">{summarise(hours)}</span>
          <span className="mt-0.5 block text-[12.5px] text-ink-faint">
            {editing ? "Set each day below" : "Looks right? Carry on. Tap to change."}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-brand">
          <Pencil className="h-3.5 w-3.5" />
          {editing ? "Done" : "Edit"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            key="grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={applyToAll}
                  className="text-[12.5px] text-ink-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  Use Monday&apos;s hours for every day
                </button>
              </div>

              <div className="space-y-1.5">
                {DAYS.map((d) => {
                  const closed = hours?.[d]?.closed;
                  return (
                    <div
                      key={d}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                        closed ? "border-line bg-transparent" : "border-line bg-white"
                      )}
                    >
                      <span className={cn("w-[86px] shrink-0 text-[14px]", closed ? "text-ink-ghost" : "text-ink")}>
                        {d}
                      </span>

                      <div className={cn("flex items-center gap-1.5 transition-opacity", closed && "pointer-events-none opacity-0")}>
                        <input
                          type="time"
                          aria-label={`${d} opening time`}
                          {...register(`hours.${d}.open`)}
                          className="h-9 rounded-lg bg-paper-tint px-2 text-[13px] tabular-nums text-ink outline-none focus:ring-2 focus:ring-brand/25"
                        />
                        <span className="text-ink-ghost">–</span>
                        <input
                          type="time"
                          aria-label={`${d} closing time`}
                          {...register(`hours.${d}.close`)}
                          className="h-9 rounded-lg bg-paper-tint px-2 text-[13px] tabular-nums text-ink outline-none focus:ring-2 focus:ring-brand/25"
                        />
                      </div>

                      <div className="ml-auto flex items-center gap-3">
                        <span className="text-[12px] text-ink-ghost">{closed ? "Closed" : ""}</span>
                        <Switch
                          label={`${d} open`}
                          checked={!closed}
                          onChange={(v) => setValue(`hours.${d}.closed`, !v, { shouldDirty: true })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Renders nothing for restaurants and shops — they never route a call to a person. */}
      <Staff />
    </>
  );
}
