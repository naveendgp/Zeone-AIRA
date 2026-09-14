"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import { DAYS, draftSchema, emptyDraft, uid, type BusinessType, type Draft, type PolicyKey } from "./_lib/schema";
import { PRESETS, SAMPLES, SAMPLE_PROFILES, assistantNameFor, questionsFor, typeLabel } from "./_lib/presets";
import type { PlaceSummary } from "../_lib/places";
import { Button, EnterHint, cn } from "./_components/ui";
import { TopProgress } from "./_components/TopProgress";
import { Find } from "./_components/steps/Find";
import { Found, type EnrichState } from "./_components/steps/Found";
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
  skipLabel?: string;
  /** The step advances itself (a pick, not a Continue button). */
  autoAdvance?: boolean;
  wide?: boolean;
  cta?: string;
}

/**
 * Three screens when the business is on Google Maps: find it, confirm what we found, answer
 * what callers ask. The owner types almost nothing — the pick fills the business details,
 * and the website and reviews fill services, staff and draft answers in the background.
 */
const MAPS_STEPS: Step[] = [
  { key: "find", autoAdvance: true, wide: true },
  { key: "found", fields: ["name", "type", "services"], wide: true },
  { key: "faqs", wide: true, cta: "Create my AI receptionist" },
];

/** The typed flow, for businesses not on Google Maps. */
const MANUAL_STEPS: Step[] = [
  { key: "find", autoAdvance: true, wide: true },
  { key: "business", fields: ["name", "type"], wide: true },
  { key: "hours", wide: true },
  { key: "services", fields: ["services"], wide: true },
  { key: "faqs", skippable: true, skipLabel: "Skip these questions", wide: true },
  { key: "review", wide: true, cta: "Create my AI receptionist" },
];

type Phase = "form" | "generating" | "demo";

interface EnrichResponse {
  services?: { name: string; price: string; priceNote: string; source: string }[];
  staff?: { name: string; role: string; source: string }[];
  answers?: { id: string; answer: string; source: string }[];
  read?: { websiteChars: number };
}

export default function StartPage() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [phase, setPhase] = useState<Phase>("form");
  const [restored, setRestored] = useState(false);
  const [enrich, setEnrich] = useState<EnrichState>({ status: "idle" });
  const enrichFor = useRef<string | null>(null);

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

  const visible = values?.setupMode === "manual" ? MANUAL_STEPS : MAPS_STEPS;
  const idx = Math.min(step, visible.length - 1);
  const meta = visible[idx];
  const isLast = idx === visible.length - 1;
  const who = assistantNameFor(values?.type, values?.name || "Frontline");

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

  /**
   * Read the website and reviews in the background while the owner looks at what Maps gave
   * us. Results only fill what is still empty, so anything typed meanwhile is never
   * overwritten, and drafted answers are marked as suggestions until confirmed.
   */
  const runEnrich = useCallback(async (p: PlaceSummary) => {
    enrichFor.current = p.placeId;
    setEnrich({ status: "loading", website: !!p.website });
    try {
      const questions = questionsFor({ type: p.type, generatedQuestions: [] }).map(({ id, ask }) => ({ id, ask }));
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: p.website, reviews: p.reviews, name: p.name,
          type: typeLabel(p.type, p.otherType), questions,
        }),
      });
      const d = (await res.json()) as EnrichResponse;
      if (enrichFor.current !== p.placeId) return; // they picked a different business meanwhile
      if (!res.ok) { setEnrich({ status: "failed", website: !!p.website }); return; }

      const cur = form.getValues();
      const noServices = !(cur.services ?? []).some((s) => s.name?.trim());
      const noStaff = !(cur.staff ?? []).some((s) => s.name?.trim());
      const found = { services: noServices ? d.services ?? [] : [], staff: noStaff ? d.staff ?? [] : [] };

      const profile = { ...(cur.profile ?? {}) };
      const suggested = { ...(cur.suggested ?? {}) };
      let answers = 0;
      for (const a of d.answers ?? []) {
        if (profile[a.id]?.trim()) continue;
        profile[a.id] = a.answer;
        suggested[`profile.${a.id}`] = a.source;
        answers++;
      }

      // reset (not setValue) so the mounted field arrays pick up the new rows.
      form.reset(
        {
          ...cur,
          services: found.services.length
            ? found.services.map((s) => ({ id: uid(), name: s.name, price: s.price, priceNote: s.priceNote, source: s.source }))
            : cur.services,
          staff: found.staff.length
            ? found.staff.map((s) => ({ id: uid(), name: s.name, role: s.role, fee: "", hours: "", source: s.source }))
            : cur.staff,
          profile,
          suggested,
        },
        { keepErrors: true, keepDirty: true, keepTouched: true }
      );
      setEnrich({
        status: "done",
        services: found.services.length, staff: found.staff.length, answers,
        website: !!p.website, readWebsite: (d.read?.websiteChars ?? 0) > 200,
      });
    } catch {
      if (enrichFor.current === p.placeId) setEnrich({ status: "failed", website: !!p.website });
    }
  }, [form]);

  const onPlace = useCallback((p: PlaceSummary) => {
    const current = form.getValues();
    // A different business than last time: don't carry the old one's services and answers.
    const base = current.placeId && current.placeId !== p.placeId ? emptyDraft() : current;
    const policies = Object.fromEntries(
      (Object.keys(base.policies) as PolicyKey[]).map((k) => [
        k, { on: p.policies[k] ?? base.policies[k]?.on ?? false, note: base.policies[k]?.note ?? "" },
      ])
    ) as Draft["policies"];

    form.reset({
      ...base,
      setupMode: "maps",
      placeId: p.placeId,
      name: p.name,
      type: p.type,
      otherType: p.otherType,
      address: p.address,
      phone: p.phone,
      website: p.website,
      rating: p.rating ?? undefined,
      reviewCount: p.reviewCount ?? undefined,
      hours: p.hours ?? base.hours,
      policies,
    });
    track("step", { key: "picked", source: "maps", category: p.type });
    setDir(1);
    setStep(1);
    void runEnrich(p);
  }, [form, runEnrich]);

  /** Manual setup; whatever they typed in the search box becomes the business name. */
  const goManual = useCallback((typedName?: string) => {
    const name = typedName?.trim();
    const current = form.getValues();
    // a new name means a new business: don't carry an old draft's details into it
    const base = name && current.name?.trim() && current.name.trim() !== name ? emptyDraft() : current;
    form.reset({ ...base, setupMode: "manual", placeId: undefined, name: name || base.name });
    setDir(1);
    setStep(1);
  }, [form]);

  /** Throw away a remembered half-finished setup. */
  const startOver = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
    enrichFor.current = null;
    setEnrich({ status: "idle" });
    form.reset(emptyDraft());
  }, [form]);

  /**
   * Load a ready-made business and jump to the summary.
   * `fresh` ignores any remembered draft ("Just show me"); otherwise the sample fills in
   * around what they've already entered. Types without a sample (e.g. "other") use the clinic one.
   */
  const useSample = useCallback((fallbackType?: BusinessType, fresh = false) => {
    const current = fresh ? emptyDraft() : form.getValues();
    const wanted = (fresh ? fallbackType : current.type ?? fallbackType) as BusinessType | undefined;
    const t: BusinessType = wanted && SAMPLES[wanted] && PRESETS[wanted] ? wanted : "clinic";
    const sample = SAMPLES[t]!;
    const preset = PRESETS[t];

    form.reset({
      ...current,
      setupMode: "manual",
      type: t,
      name: current.name?.trim() || (t === "dental" ? "Anand Dental Care" : `My ${preset.label}`),
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
      suggested: {},
    });
    setDir(1);
    setStep(MANUAL_STEPS.findIndex((s) => s.key === "review"));
  }, [form]);

  const back = useCallback(() => idx > 0 && go(idx - 1), [idx, go]);
  const jumpTo = useCallback((key: string) => {
    const i = visible.findIndex((s) => s.key === key);
    if (i >= 0) go(i);
  }, [visible, go]);

  // Enter advances; Shift+Enter, textareas and self-advancing steps are left alone.
  useEffect(() => {
    if (phase !== "form" || meta.autoAdvance) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.tagName === "TEXTAREA" || el?.tagName === "BUTTON") return;
      e.preventDefault();
      void next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, phase, meta.autoAdvance]);

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

  const resumable = values?.name?.trim() && (values.placeId || values.setupMode === "manual");

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
              {meta.key === "find" && (
                <Find
                  onPlace={onPlace}
                  onManual={goManual}
                  onSample={() => useSample("dental", true)}
                  resumeName={resumable ? values.name : undefined}
                  onResume={() => { setDir(1); setStep(1); }}
                  onStartOver={startOver}
                />
              )}
              {meta.key === "found" && <Found enrich={enrich} />}
              {meta.key === "business" && <Business onUseSample={() => useSample()} />}
              {meta.key === "hours" && <Hours />}
              {meta.key === "services" && <Services />}
              {meta.key === "faqs" && <Faqs />}
              {meta.key === "review" && <Review onJump={jumpTo} />}
            </motion.div>
          </AnimatePresence>

          {!meta.autoAdvance && (
            <div className="mt-10 flex items-center gap-4">
              <Button size="lg" onClick={next} className={isLast ? "" : "min-w-[132px]"}>
                {isLast ? <><Sparkles className="h-[18px] w-[18px]" /> {meta.cta}</> : meta.key === "found" ? "Looks right" : "Continue"}
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
