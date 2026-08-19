"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { uid, type Draft } from "../../_lib/schema";
import { PRESETS } from "../../_lib/presets";
import { InputSm, Label, Section } from "../ui";

export function Staff() {
  const { control, register } = useFormContext<Draft>();
  const type = useWatch({ control, name: "type" });
  const preset = type ? PRESETS[type] : PRESETS.clinic;
  const { fields, append, remove } = useFieldArray({ control, name: "staff" });

  // Restaurants and shops don't route calls to a named person; the wizard skips this entirely.
  if (!preset.staffNoun) return null;

  const noun = preset.staffNoun.toLowerCase();

  return (
    <>
      {/* A section of the hours step now: "when are you open" and "who can they ask for"
          are the same question to a caller. */}
      <Section
        title="Who can callers ask for?"
        hint={`Zeone reads these names out when someone asks who's available. Optional — add more later.`}
      />

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
                <span className="text-[11px] uppercase tracking-[0.14em] text-ink-ghost">
                  {preset.staffNoun} {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${noun} ${i + 1}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-ghost transition-colors hover:bg-black/[0.04] hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <InputSm {...register(`staff.${i}.name`)} placeholder="Dr. Anand" />
                </div>
                <div>
                  <Label optional>{preset.roleLabel}</Label>
                  <InputSm {...register(`staff.${i}.role`)} placeholder={preset.rolePlaceholder} />
                </div>
                {preset.hasFee && (
                  <div>
                    <Label optional>Fee</Label>
                    <InputSm {...register(`staff.${i}.fee`)} placeholder="300" inputMode="numeric" />
                  </div>
                )}
                <div>
                  <Label optional>Hours</Label>
                  <InputSm {...register(`staff.${i}.hours`)} placeholder="10 AM – 7 PM, Mon to Sat" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => append({ id: uid(), name: "", role: "", fee: "", hours: "" })}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong py-4 text-[13.5px] text-ink-faint transition-colors hover:border-line-strong hover:text-ink"
      >
        <Plus className="h-4 w-4" />
        Add {noun}
      </button>
    </>
  );
}
