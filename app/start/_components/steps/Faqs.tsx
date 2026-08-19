"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Sparkles, X } from "lucide-react";
import { uid, type Draft } from "../../_lib/schema";
import { PRESETS } from "../../_lib/presets";
import { Ask, InputSm, Label, Textarea } from "../ui";
import { Profile } from "./Profile";

export function Faqs() {
  const { control, register } = useFormContext<Draft>();
  const type = useWatch({ control, name: "type" });
  const preset = type ? PRESETS[type] : PRESETS.clinic;
  const { fields, append, remove } = useFieldArray({ control, name: "faqs" });

  return (
    <>
      <Ask
        title="What do people ask you every single day?"
        hint="Answer in your own words — this is exactly what Zeone says back, so these take priority over everything else it knows."
      />

      {/* The ones we can guess for this trade, then anything we couldn't. Same destination:
          both become grounded FAQs the assistant is allowed to answer from. */}
      <Profile />

      <div className="mb-3 mt-10 flex items-end justify-between gap-3 border-t border-line pt-8">
        <h2 className="text-[19px] font-bold tracking-[-0.02em] text-ink">
          Anything else people ask?
        </h2>
        {fields.length > 0 && (
          <span className="text-[12px] tabular-nums text-ink-faint">{fields.length} added</span>
        )}
      </div>

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {fields.map((f, i) => (
            <motion.div
              key={f.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-line bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.14em] text-ink-ghost">Question {i + 1}</span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove question ${i + 1}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-ghost transition-colors hover:bg-black/[0.04] hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-3.5">
                <div>
                  <Label>They ask</Label>
                  <InputSm {...register(`faqs.${i}.q`)} placeholder={preset.sampleFaq.q} />
                </div>
                <div>
                  <Label>Zeone answers</Label>
                  <Textarea {...register(`faqs.${i}.a`)} placeholder={preset.sampleFaq.a} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Always available, so writing your own is never gated behind the template. */}
      <button
        type="button"
        onClick={() => append({ id: uid(), q: "", a: "" })}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3.5 text-[13.5px] text-ink-faint transition-colors hover:border-line-strong hover:text-ink"
      >
        <Plus className="h-4 w-4" />
        {fields.length ? "Add another question" : "Add your own question"}
      </button>

      {fields.length === 0 && (
        <button
          type="button"
          onClick={() => append({ id: uid(), q: preset.sampleFaq.q, a: preset.sampleFaq.a })}
          className="mx-auto mt-4 flex items-center gap-2 text-[12.5px] text-ink-faint underline-offset-4 transition-colors hover:text-brand hover:underline"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Or start from a typical one
        </button>
      )}
    </>
  );
}
