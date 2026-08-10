"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Wand2 } from "lucide-react";
import { BUSINESS_TYPES, type Draft } from "../../_lib/schema";
import { PRESETS, SAMPLES } from "../../_lib/presets";
import { Ask, Button, Choice, Input } from "../ui";

export function Type({ onNext, onUseSample }: { onNext: () => void; onUseSample: () => void }) {
  const { control, register, formState: { errors } } = useFormContext<Draft>();
  const type = useWatch({ control, name: "type" });
  const isOther = type === "other";
  const sample = type ? SAMPLES[type] : undefined;
  const preset = type ? PRESETS[type] : undefined;

  // Describe exactly what the button will do, counted from the real sample —
  // no vague "autofill", and no number that could drift out of date.
  const parts = sample && preset
    ? [
        `${preset.sampleServices.length} ${preset.serviceNoun.toLowerCase()}s with prices`,
        sample.staff.length
          ? `${sample.staff.length} ${preset.staffNoun?.toLowerCase() ?? "staff"}${sample.staff.length > 1 ? "s" : ""}`
          : null,
        "working hours",
        `${sample.policies.length} policies`,
        `${sample.faqs.length} common questions`,
      ].filter(Boolean)
    : [];

  return (
    <>
      <Ask
        title="What kind of business is it?"
        hint="This decides what we ask next — no point asking a restaurant for consultation fees."
      />
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {BUSINESS_TYPES.map((t) => {
              const p = PRESETS[t];
              return (
                <Choice
                  key={t}
                  selected={field.value === t}
                  icon={p.icon}
                  title={p.label}
                  blurb={p.blurb}
                  onClick={() => field.onChange(t)}
                />
              );
            })}
          </div>
        )}
      />

      <AnimatePresence initial={false} mode="wait">
        {isOther && (
          <motion.div
            key="other"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-5">
              <Input
                {...register("otherType")}
                placeholder="Photo studio, tailoring, courier…"
                aria-label="What kind of business"
                autoFocus
              />
              <p className="mt-2.5 text-[12.5px] text-ink-faint">
                We don&apos;t have a template for this one, so the next few steps stay generic — you fill in
                everything yourself.
              </p>
            </div>
          </motion.div>
        )}

        {sample && preset && (
          <motion.div
            key="sample"
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-6 rounded-2xl border border-brand/25 bg-brand-soft p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_8px_18px_#6d4ed82e]">
                  <Wand2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold tracking-tight text-ink">
                    Don&apos;t want to type all this?
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-dim">
                    We&apos;ll fill in a ready-made {preset.label.toLowerCase()} — {parts.join(", ")} — and
                    take you straight to the end so you can talk to it now.
                    <span className="text-ink-faint"> It&apos;s only sample data; change anything afterwards.</span>
                  </p>
                  <Button className="mt-4" onClick={onUseSample}>
                    <Wand2 className="h-4 w-4" />
                    Fill it in with sample data
                  </Button>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[12.5px] text-ink-faint">
              Or press <span className="font-semibold text-ink-dim">Continue</span> to enter your real details.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {errors.type && <p className="mt-3 text-[13px] text-rose-600">{errors.type.message}</p>}
    </>
  );
}
