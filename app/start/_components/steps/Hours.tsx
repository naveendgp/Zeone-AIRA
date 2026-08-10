"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { DAYS, type Draft } from "../../_lib/schema";
import { Ask, Switch, cn } from "../ui";

export function Hours() {
  const { control, setValue, register } = useFormContext<Draft>();
  const hours = useWatch({ control, name: "hours" });

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
        hint="Zeone refuses to book anything outside these hours, so callers never turn up to a closed door."
      />

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={applyToAll}
          className="text-[12.5px] text-ink-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Same as Monday for every day
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
                <span className={cn("text-[12px]", closed ? "text-ink-ghost" : "text-ink-ghost")}>
                  {closed ? "Closed" : ""}
                </span>
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
    </>
  );
}
