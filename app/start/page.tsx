"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import { DAYS, draftSchema, emptyDraft, uid, type Draft, type PolicyKey } from "./_lib/schema";
import { PRESETS, SAMPLES, SAMPLE_PROFILES, assistantNameFor } from "./_lib/presets";
import { Button, EnterHint, cn } from "./_components/ui";
import { TopProgress } from "./_components/TopProgress";
import { Name } from "./_components/steps/Name";
import { Type } from "./_components/steps/Type";
import { Contact } from "./_components/steps/Contact";
import { Hours } from "./_components/steps/Hours";
import { Staff } from "./_components/steps/Staff";
import { Services } from "./_components/steps/Services";
import { Policies } from "./_components/steps/Policies";
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
  { key: "welcome" },
  { key: "name", fields: ["name"] },
  { key: "type", fields: ["type"], wide: true },
  { key: "contact", skippable: true, skipLabel: "Skip this" },
  { key: "hours", wide: true },
  { key: "staff", skippable: true, skipLabel: "Skip this", wide: true },
  { key: "services", fields: ["services"], wide: true },
  { key: "policies", skippable: true, skipLabel: "Skip this", wide: true },
  { key: "faqs", skippable: true, skipLabel: "Skip these questions", wide: true },
  { key: "review", wide: true, cta: "Create my AI receptionist" },
];

type Phase = "form" | "generating" | "demo";

export default function StartPage() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [phase, setPhase] = useState<Phase>("form");
  const [restored, setRestored] = useState(false);
  /** Once on, every remaining optional step disappears from the flow. */
  const [skipOptional, setSkipOptional] = useState(false);

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

  // Steps a given business never needs to see.
  const visible = useMemo(
    () => STEPS.filter((s) => {
      if (s.key === "staff" && values?.type && !PRESETS[values.type].staffNoun) return false;
      if (skipOptional && s.skippable) return false;
      return true;
    }),
    [values?.type, skipOptional]
  );
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

  /**
   * Drop every optional step at once. The index is computed against the list we're about
   * to switch to, because `visible` won't have shrunk until the next render.
   */
  const skipAllOptional = useCallback(() => {
    const staffless = values?.type && !PRESETS[values.type].staffNoun;
    const remaining = STEPS.filter((s) => {
      if (s.key === "staff" && staffless) return false;
      return !s.skippable;
    });
    const here = STEPS.findIndex((s) => s.key === meta.key);
    const nextKey = remaining.find((s) => STEPS.findIndex((x) => x.key === s.key) > here)?.key;
    setSkipOptional(true);
    setDir(1);
    setStep(nextKey ? remaining.findIndex((s) => s.key === nextKey) : remaining.length - 1);
  }, [values?.type, meta.key]);

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
    return <Demo draft={values} who={who} onEdit={() => { setPhase("form"); go(1); }} />;
  }

  const isWelcome = meta.key === "welcome";

  return (
    <FormProvider {...form}>
      <TopProgress current={idx} total={visible.length - 1} onBack={idx > 0 ? back : undefined} />

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
              {isWelcome ? (
                <div className="pt-[8vh]">
                  <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[56px]">
                    Let&apos;s create your
                    <br />
                    <em className="font-display font-semibold italic text-brand-hover">AI front desk.</em>
                  </h1>
                  <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink-dim">
                    About two minutes. At the end you&apos;ll be talking to your own receptionist —
                    not a video, not a sales call.
                  </p>
                </div>
              ) : (
                <>
                  {meta.key === "name" && <Name />}
                  {meta.key === "type" && <Type onNext={next} onUseSample={useSample} />}
                  {meta.key === "contact" && <Contact />}
                  {meta.key === "hours" && <Hours />}
                  {meta.key === "staff" && <Staff />}
                  {meta.key === "services" && <Services />}
                  {meta.key === "policies" && <Policies />}
                  {meta.key === "faqs" && <Faqs />}
                  {meta.key === "review" && <Review onJump={jumpTo} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {!meta.autoAdvance && (
            <div className="mt-10 flex items-center gap-4">
              <Button size="lg" onClick={next} className={isWelcome || isLast ? "" : "min-w-[132px]"}>
                {isWelcome ? "Get started" : isLast ? <><Sparkles className="h-[18px] w-[18px]" /> {meta.cta}</> : "Continue"}
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

              {/* One control for "I just want to see it work" — drops every remaining
                  optional step instead of making them press Skip four more times. */}
              {meta.skippable && (
                <button
                  type="button"
                  onClick={skipAllOptional}
                  className="text-[12.5px] text-ink-ghost underline-offset-4 transition-colors hover:text-ink-dim hover:underline"
                >
                  Skip all optional questions
                </button>
              )}
              {!isWelcome && <div className="ml-auto"><EnterHint /></div>}
            </div>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
