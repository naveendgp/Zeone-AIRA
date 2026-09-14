"use client";

import { useEffect, useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Sparkles, X } from "lucide-react";
import { uid, type Draft } from "../../_lib/schema";
import { PRESETS } from "../../_lib/presets";
import { Ask, InputSm, Section, cn } from "../ui";
import { Policies } from "./Policies";

/**
 * One service: a name, and either a rupee amount or — for anything that genuinely has no
 * fixed price — what it depends on. Gold rates move daily, tailoring depends on the design,
 * an audit depends on the size of the books.
 *
 * The choice is spelled out as two visible options. It used to hide behind a tap on the ₹
 * sign, which nobody discovered, so owners with no fixed prices thought they had to invent one.
 */
function ServiceRow({ index, noun, highlight, onRemove }: {
  index: number; noun: string; highlight: boolean; onRemove: () => void;
}) {
  const { control, register, setValue, getValues } = useFormContext<Draft>();
  const name = useWatch({ control, name: `services.${index}.name` });
  const price = useWatch({ control, name: `services.${index}.price` });
  // The choice is its own state rather than read from the note. A placeholder " " used to
  // mark "varies" before anything was typed, and that hidden space hid the input's hint.
  // A varies row left empty behaves like an empty price: callers hear the team will confirm.
  const [varies, setVaries] = useState(() => !!getValues(`services.${index}.priceNote`)?.trim());
  const [justSwitched, setJustSwitched] = useState(false);
  // Auto-filled services usually arrive without a price — that is the one gap to point at.
  const missing = highlight && !varies && !!name?.trim() && !price?.trim();

  const setMode = (toVaries: boolean) => {
    if (toVaries === varies) return;
    setValue(`services.${index}.priceNote`, "", { shouldDirty: true });
    if (toVaries) setValue(`services.${index}.price`, "", { shouldDirty: true });
    setVaries(toVaries);
    setJustSwitched(true);
  };

  const option = (active: boolean) =>
    cn(
      "rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors",
      active ? "bg-brand-soft text-brand" : "text-ink-faint hover:text-ink"
    );

  return (
    <div className="rounded-2xl border border-line bg-white/60 p-2.5">
      <div className="flex items-center gap-2">
        <InputSm
          {...register(`services.${index}.name`)}
          placeholder={`${noun} name`}
          className="flex-1"
          aria-label={`${noun} ${index + 1} name`}
        />
        {!varies && (
          <div className="relative w-[124px] shrink-0">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14.5px] text-ink-ghost">₹</span>
            <InputSm
              {...register(`services.${index}.price`)}
              placeholder={missing ? "Add price" : "Optional"}
              inputMode="numeric"
              className={cn("pl-7 tabular-nums", missing && "border-amber-300 bg-amber-50/70")}
              aria-label={`${noun} ${index + 1} price`}
            />
          </div>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${noun} ${index + 1}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-ghost transition-colors hover:bg-black/[0.04] hover:text-rose-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1 pl-1" role="radiogroup" aria-label={`${noun} ${index + 1} pricing`}>
        <button type="button" role="radio" aria-checked={!varies} onClick={() => setMode(false)} className={option(!varies)}>
          Fixed price
        </button>
        <button type="button" role="radio" aria-checked={varies} onClick={() => setMode(true)} className={option(varies)}>
          Price varies
        </button>
      </div>

      {varies && (
        <div className="mt-2">
          <InputSm
            {...register(`services.${index}.priceNote`)}
            autoFocus={justSwitched}
            placeholder="What does the price depend on?"
            aria-label={`${noun} ${index + 1} — what the price depends on`}
            aria-describedby={`service-${index}-varies-hint`}
          />
          <p id={`service-${index}-varies-hint`} className="mt-1.5 pl-1 text-[12px] leading-relaxed text-ink-faint">
            Callers hear this instead of a price — e.g. &ldquo;It depends on how big the job is, we&apos;ll
            give you an exact quote.&rdquo; Leave it empty and they&apos;re told your team will confirm the price.
          </p>
        </div>
      )}
    </div>
  );
}

export function Services({ embedded = false }: { embedded?: boolean } = {}) {
  const { control, formState: { errors } } = useFormContext<Draft>();
  const type = useWatch({ control, name: "type" });
  const preset = type ? PRESETS[type] : PRESETS.clinic;
  const { fields, append, remove, replace } = useFieldArray({ control, name: "services" });
  const seeded = useRef(false);

  // Open with one empty row. Without it the step showed a heading and no inputs, and for
  // "Something else" (no template) nothing to start from.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (fields.length === 0) append({ id: uid(), name: "", price: "", priceNote: "" }, { shouldFocus: false });
  }, [fields.length, append]);

  // Unconditional — short-circuiting a useWatch() call would break the rules of hooks.
  const firstName = useWatch({ control, name: "services.0.name" });
  const onlyBlank = fields.length === 0 || (fields.length === 1 && !firstName?.trim());

  const title = "What do you offer, and what does it cost?";
  const hint =
    "Frontline only ever quotes the prices you add here. No fixed price? Choose “Price varies” and say what it depends on — or leave the price empty and callers are told your team will confirm it.";

  return (
    <>
      {embedded ? <Section title={title} hint={hint} /> : <Ask title={title} hint={hint} />}

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
            >
              <ServiceRow index={i} noun={preset.serviceNoun} highlight={embedded} onRemove={() => remove(i)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => append({ id: uid(), name: "", price: "", priceNote: "" })}
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
        <p className="mt-3 text-[13px] text-rose-600">{errors.services.message ?? "Check your services"}</p>
      )}
      <Policies />
    </>
  );
}
