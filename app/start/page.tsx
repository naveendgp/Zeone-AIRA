"use client";

import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import { DAYS, draftSchema, emptyDraft, uid, type Draft, type PolicyKey } from "./_lib/schema";
import { PRESETS, SAMPLES, SAMPLE_PROFILES, assistantNameFor } from "./_lib/presets";
import { Button, EnterHint, cn } from "./_components/ui";
import { TopProgress } from "./_components/TopProgress";
import { Business } from "./_components/steps/Business";
import { Hours } from "./_components/steps/Hours";
import { Services } from "./_components/steps/Services";
import { Faqs } from "./_components/steps/Faqs";
import { Review } from "./_components/steps/Review";
import { Generating } from "./_components/Generating";
import { Demo } from "./_components/demo/Demo";
import { track } from "./_lib/track";

const STORAGE_KEY = "zeone.onboarding.v2";

interface Step {
  key: string;
  /** Validated before the step will let you continue. */
  fields?: FieldPath<Draft>[];
  /** Optional steps get a Skip link and no validation. */
  skippable?: boolean;
  /** Wording for the skip link — "Skip" alone is vague on a page full of questions. */
  skipLabel?: string;
  /** Selecting an option IS the answer — no Continue button. */
  autoAdvance?: boolean;
  /** Wider column for list-shaped steps. */
  wide?: boolean;
  cta?: string;
}

const STEPS: Step[] = [
  // Five screens, down from ten. Name/category/address were three separate pages; hours and
  // team are one question to a caller ("when, and who?"); services and facilities are the
  // other ("what, and how much?"). The welcome splash asked nothing and the review screen
  // showed exactly what the demo's Knowledge tab already shows.
  { key: "business", fields: ["name", "type"], wide: true },
  { key: "hours", wide: true },
  { key: "services", fields: ["services"], wide: true },
  { key: "faqs", skippable: true, skipLabel: "Skip these questions", wide: true },
  { key: "review", wide: true, cta: "Create my AI receptionist" },
];

type Phase = "form" | "generating" | "demo";

export default function StartPage() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [phase, setPhase] = useState<Phase>("form");
  const [restored, setRestored] = useState(false);

  const form = useForm<Draft>({
    resolver: zodResolver(draftSchema),
    defaultValues: emptyDraft(),
    mode: "onTouched",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) form.reset({ ...emptyDraft(), ...JSON.parse(raw) });
    } catch {
      /* corrupt or unavailable storage — start clean */
    }
    setRestored(true);
    track("session");
  }, [form]);

  const values = useWatch({ control: form.control }) as Draft;

  useEffect(() => {
    if (!restored) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      } catch {
        /* quota or private mode — persistence is a nicety */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [values, restored]);

  const visible = STEPS;
  const idx = Math.min(step, visible.length - 1);
  const meta = visible[idx];
  const isLast = idx === visible.length - 1;
  const who = assistantNameFor(values?.type, values?.name || "Zeone");

  const go = useCallback((n: number) => { setDir(n > idx ? 1 : -1); setStep(n); }, [idx]);

  const next = useCallback(async () => {
    if (meta.fields?.length) {
      const ok = await form.trigger(meta.fields);
      if (!ok) return;
    }
    if (isLast) {
      track("generated", { draft: form.getValues() });
      setPhase("generating");
      return;
    }
    go(idx + 1);
  }, [meta, isLast, form, idx, go]);

  /** Load the ready-made business for this niche and skip to the summary. */
  const useSample = useCallback(() => {
    const t = form.getValues("type");
    const sample = t ? SAMPLES[t] : undefined;
    if (!t || !sample) return;
    const preset = PRESETS[t];
    const current = form.getValues();

    form.reset({
      ...current,
      address: current.address?.trim() || sample.address,
      phone: current.phone?.trim() || sample.phone,
      hours: Object.fromEntries(
        DAYS.map((d) => [d, { closed: d === "Sunday", open: "09:00", close: "20:00" }])
      ) as Draft["hours"],
      staff: sample.staff.map((x) => ({ id: uid(), ...x })),
      services: preset.sampleServices.map((x) => ({ id: uid(), name: x.name, price: x.price })),
      policies: Object.fromEntries(
        (Object.keys(current.policies ?? {}) as PolicyKey[]).map((k) => [
          k, { on: sample.policies.includes(k), note: "" },
        ])
      ) as Draft["policies"],
      faqs: sample.faqs.map((x) => ({ id: uid(), ...x })),
      profile: { ...(current.profile ?? {}), ...(SAMPLE_PROFILES[t] ?? {}) },
    });

    const reviewIdx = visible.findIndex((s) => s.key === "review");
    if (reviewIdx >= 0) go(reviewIdx);
  }, [form, visible, go]);


  const back = useCallback(() => idx > 0 && go(idx - 1), [idx, go]);
  const jumpTo = useCallback((key: string) => {
    const i = visible.findIndex((s) => s.key === key);
    if (i >= 0) go(i);
  }, [visible, go]);

  // Enter advances; Shift+Enter and textareas are left alone.
  useEffect(() => {
    if (phase !== "form") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.tagName === "TEXTAREA" || el?.tagName === "BUTTON") return;
      e.preventDefault();
      void next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, phase]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [idx, phase]);

  // Step arrivals are what make the drop-off funnel possible: the last step a session
  // reports is the step it abandoned.
  useEffect(() => {
    if (phase !== "form" || !restored) return;
    track("step", { key: meta.key, index: idx, total: visible.length });
  }, [meta.key, idx, visible.length, phase, restored]);

  if (!restored) return <div className="min-h-screen" />;
  if (phase === "generating") return <Generating who={who} onDone={() => setPhase("demo")} />;
  if (phase === "demo") {
    return <Demo draft={values} who={who} onEdit={() => { setPhase("form"); go(0); }} />;
  }

  return (
    <FormProvider {...form}>
      <TopProgress current={idx + 1} total={visible.length} onBack={idx > 0 ? back : undefined} />

      {/* my-auto centres short steps and collapses to zero on tall ones, so nothing
          ever gets clipped above the fold */}
      <div className="flex min-h-screen flex-col px-5 pb-20 pt-28 sm:px-8">
        <div className={cn("my-auto w-full", meta.wide ? "max-w-[700px]" : "max-w-[540px]", "mx-auto")}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={meta.key}
              custom={dir}
              initial={{ opacity: 0, x: dir * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <>
                {meta.key === "business" && <Business onUseSample={useSample} />}
                {meta.key === "hours" && <Hours />}
                {meta.key === "services" && <Services />}
                {meta.key === "faqs" && <Faqs />}
                {meta.key === "review" && <Review onJump={jumpTo} />}
              </>
            </motion.div>
          </AnimatePresence>

          {!meta.autoAdvance && (
            <div className="mt-10 flex items-center gap-4">
              <Button size="lg" onClick={next} className={isLast ? "" : "min-w-[132px]"}>
                {isLast ? <><Sparkles className="h-[18px] w-[18px]" /> {meta.cta}</> : "Continue"}
                {!isLast && <ArrowRight className="h-4 w-4" />}
              </Button>

              {meta.skippable && (
                <button
                  type="button"
                  onClick={() => go(idx + 1)}
                  className="text-[13.5px] font-semibold text-ink-dim underline-offset-4 transition-colors hover:text-brand hover:underline"
                >
                  {meta.skipLabel ?? "Skip"}
                </button>
              )}
              <div className="ml-auto"><EnterHint /></div>
            </div>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
