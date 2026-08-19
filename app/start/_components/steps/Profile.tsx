"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Loader2, RefreshCw } from "lucide-react";
import type { Draft } from "../../_lib/schema";
import { questionsFor, typeLabel } from "../../_lib/presets";
import { InputSm, cn } from "../ui";

/**
 * The caller questions we already know to ask about, answered in the owner's own words.
 *
 * Rendered as a section inside the FAQ step rather than a step of its own: these and the
 * owner's own questions are the same thing to the agent (both become grounded FAQs), so
 * splitting them across two screens only made the owner answer questions twice.
 */
export function Profile() {
  const { control, register, setValue } = useFormContext<Draft>();
  const type = useWatch({ control, name: "type" });
  const otherType = useWatch({ control, name: "otherType" });
  const generated = useWatch({ control, name: "generatedQuestions" });
  const profile = (useWatch({ control, name: "profile" }) ?? {}) as Record<string, string>;

  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const askedFor = useRef<string | null>(null);

  const label = typeLabel(type, otherType);
  const questions = questionsFor({ type, generatedQuestions: generated });

  // Unlisted trades have no hand-written list, so ask Gemini for five — once per trade.
  //
  // Staleness is judged by comparing the trade at resolve time, NOT by a cleanup flag.
  // With a flag, the effect re-running (otherType settling, or StrictMode's double
  // invoke) cancelled the in-flight request while the guard made the second run return
  // early — so nothing ever cleared `loading` and the step hung on the spinner.
  useEffect(() => {
    if (type !== "other") return;
    const trade = otherType?.trim();
    if (!trade || trade.length < 3) return;
    const mine = trade.toLowerCase();
    if (askedFor.current === mine) return;
    askedFor.current = mine;

    setLoading(true);
    fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trade }),
    })
      .then((r) => r.json())
      .then((d: { questions?: string[]; source?: string }) => {
        if (askedFor.current !== mine) return; // a newer trade superseded this one
        if (!Array.isArray(d.questions) || !d.questions.length) return;
        setValue(
          "generatedQuestions",
          d.questions.map((ask, i) => ({ id: `gen${i + 1}`, ask })),
          { shouldDirty: true }
        );
        setSource(d.source ?? null);
      })
      .catch(() => { if (askedFor.current === mine) askedFor.current = null; }) // allow a retry
      .finally(() => { if (askedFor.current === mine) setLoading(false); });
  }, [type, otherType, setValue]);

  const regenerate = () => { askedFor.current = null; setValue("generatedQuestions", [], { shouldDirty: true }); };
  const answered = questions.filter((q) => profile[q.id]?.trim()).length;

  if (loading && !questions.length) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-6 text-[13.5px] text-ink-dim">
        <Loader2 className="h-4 w-4 animate-spin text-brand" />
        Working out what {label.toLowerCase()} callers usually ask…
      </div>
    );
  }

  // Nothing to suggest (no category chosen yet) — the owner can still write their own below.
  if (!questions.length) return null;

  return (
    <>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">
          Common {label} questions
        </h2>
        <span className="text-[12px] tabular-nums text-ink-faint">
          {answered}/{questions.length} answered
        </span>
      </div>

      <div className="space-y-2.5">
        {questions.map((q) => {
          const filled = !!profile[q.id]?.trim();
          return (
            <div
              key={q.id}
              className={cn(
                "rounded-2xl border p-4 transition-colors",
                filled ? "border-brand/25 bg-brand-soft/40" : "border-line bg-white"
              )}
            >
              {/* The caller's words, in quotes — so the owner answers a person, not a form. */}
              <p className="mb-2.5 text-[13.5px] font-semibold text-ink">
                &ldquo;{q.ask}&rdquo;
              </p>
              <InputSm
                {...register(`profile.${q.id}`)}
                placeholder={q.placeholder ?? "Your answer…"}
                aria-label={q.ask}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-ink-faint">
          {answered
            ? `That's ${answered} more call your phone can finish on its own.`
            : "Leave any blank and the assistant simply won't claim to know it."}
        </p>
        {type === "other" && (
          <button
            type="button"
            onClick={regenerate}
            disabled={loading}
            className="flex items-center gap-1.5 text-[12.5px] text-ink-faint underline-offset-4 transition-colors hover:text-brand hover:underline disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Different questions
          </button>
        )}
      </div>

      {type === "other" && source === "generic" && (
        <p className="mt-2 text-[12px] text-amber-700">
          Couldn&apos;t tailor these to your trade just now, so these are general ones — edit or skip freely.
        </p>
      )}
    </>
  );
}
