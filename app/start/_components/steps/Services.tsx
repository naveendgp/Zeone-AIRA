"use client";

import { useEffect, useRef } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Sparkles, X } from "lucide-react";
import { uid, type Draft } from "../../_lib/schema";
import { PRESETS } from "../../_lib/presets";
import { Ask, InputSm } from "../ui";

export function Services() {
  const { control, register, formState: { errors } } = useFormContext<Draft>();
  const type = useWatch({ control, name: "type" });
  const preset = type ? PRESETS[type] : PRESETS.clinic;
  const { fields, append, remove, replace } = useFieldArray({ control, name: "services" });
  const seeded = useRef(false);

  // Open with one empty row. Without it the step showed a heading, a "add at least one"
  // error and no inputs — and for "Something else" (no template) there was no way at all
  // to satisfy a required field.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (fields.length === 0) append({ id: uid(), name: "", price: "" }, { shouldFocus: false });
  }, [fields.length, append]);

  // Unconditional — short-circuiting a useWatch() call would break the rules of hooks.
  const firstName = useWatch({ control, name: "services.0.name" });
  const onlyBlank = fields.length === 0 || (fields.length === 1 && !firstName?.trim());

  return (
    <>
      <Ask
        title="What do you offer, and what does it cost?"
        hint="The price you set here is the only price Zeone will ever quote. Leave it blank if it varies."
      />

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {fields.map((f, i) => (
            <motion.div
              key={f.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <InputSm
                {...register(`services.${i}.name`)}
                placeholder={`${preset.serviceNoun} name`}
                className="flex-1"
                aria-label={`${preset.serviceNoun} ${i + 1} name`}
              />
              <div className="relative w-[124px] shrink-0">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[14.5px] text-ink-ghost">₹</span>
                <InputSm
                  {...register(`services.${i}.price`)}
                  placeholder="Price"
                  inputMode="numeric"
                  className="pl-8 tabular-nums"
                  aria-label={`${preset.serviceNoun} ${i + 1} price`}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${preset.serviceNoun} ${i + 1}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-ghost transition-colors hover:bg-black/[0.04] hover:text-rose-600"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Always available — never hide the only way to satisfy a required field. */}
      <button
        type="button"
        onClick={() => append({ id: uid(), name: "", price: "" })}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3.5 text-[13.5px] text-ink-faint transition-colors hover:border-line-strong hover:text-ink"
      >
        <Plus className="h-4 w-4" />
        Add another
      </button>

      {/* "Something else" has no template, so there is nothing honest to prefill. */}
      {preset.sampleServices.length > 0 && onlyBlank && (
        <button
          type="button"
          onClick={() => replace(preset.sampleServices.map((s) => ({ id: uid(), name: s.name, price: s.price })))}
          className="mx-auto mt-4 flex items-center gap-2 text-[12.5px] text-ink-faint underline-offset-4 transition-colors hover:text-brand hover:underline"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Or fill a typical {preset.label.toLowerCase()} list for me
        </button>
      )}

      {errors.services && (
        <p className="mt-3 text-[13px] text-rose-600">{errors.services.message ?? "Add at least one"}</p>
      )}
    </>
  );
}
