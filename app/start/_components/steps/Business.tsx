"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Wand2 } from "lucide-react";
import { BUSINESS_TYPES, type Draft } from "../../_lib/schema";
import { PRESETS, SAMPLES } from "../../_lib/presets";
import { Ask, Button, Choice, Input, Label, cn } from "../ui";

/**
 * Name, category and (optionally) where you are — the whole identity of the business on
 * one screen.
 *
 * These used to be three separate steps. Name was a single text field with an entire page
 * to itself, and the address was asked before the caller had any reason to care. Together
 * they're one scroll, and the two mandatory fields sit side by side where they belong.
 */
export function Business({ onUseSample }: { onUseSample: () => void }) {
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
        title="First, tell us about your business."
        hint="Two minutes from here to hearing your own receptionist answer a call."
      />

      <div className="mb-7">
        <Label>Business name</Label>
        <Input
          {...register("name")}
          placeholder="Anand Dental Care"
          autoFocus
          autoComplete="organization"
          aria-label="Business name"
        />
        {errors.name && <p className="mt-2 text-[13px] text-rose-600">{errors.name.message}</p>}
      </div>

      <Label>What kind of business is it?</Label>
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {BUSINESS_TYPES.filter((t) => t !== "other").map((t) => {
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

            {/* Full width and dashed so it reads as "none of the above" rather than an
                eleventh category nobody scans down to. */}
            <button
              type="button"
              onClick={() => field.onChange("other")}
              aria-pressed={field.value === "other"}
              className={cn(
                "mt-2.5 flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed p-4 transition-colors",
                field.value === "other"
                  ? "border-brand/45 bg-brand-soft text-ink"
                  : "border-line-strong text-ink-dim hover:border-brand/40 hover:text-ink"
              )}
            >
              <Sparkles className="h-[18px] w-[18px] text-brand" />
              <span className="text-[14px] font-bold tracking-tight">My business isn&apos;t listed</span>
              <span className="text-[12.5px] text-ink-faint">— tell us what you do</span>
            </button>
          </>
        )}
      />
      {errors.type && <p className="mt-3 text-[13px] text-rose-600">{errors.type.message}</p>}

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
                We don&apos;t have a template for this one, so we&apos;ll write your caller questions
                for you and you fill in the answers.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {sample && preset && (
          <motion.div
            key="sample"
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-7 rounded-2xl border border-brand/25 bg-brand-soft p-5">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Where are you?" is a real caller question, but never worth a screen of its own. */}
      <div className="mt-8 border-t border-line pt-6">
        <div className="space-y-5">
          <div>
            <Label optional>Address</Label>
            <Input {...register("address")} placeholder="21, Bazaar Road, Mylapore, Chennai" autoComplete="street-address" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label optional>Phone</Label>
              <Input {...register("phone")} placeholder="+91 98400 00000" inputMode="tel" autoComplete="tel" />
            </div>
            <div>
              <Label optional>Website</Label>
              <Input {...register("website")} placeholder="anand.care" inputMode="url" />
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
