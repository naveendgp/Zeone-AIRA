"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Check, Loader2, Pencil, Star } from "lucide-react";
import type { Draft } from "../../_lib/schema";
import { typeLabel } from "../../_lib/presets";
import { Ask, cn } from "../ui";
import { Business } from "./Business";
import { Hours } from "./Hours";
import { Services } from "./Services";

export type EnrichState =
  | { status: "idle" }
  | { status: "loading"; website: boolean }
  | { status: "done"; services: number; staff: number; answers: number; website: boolean; readWebsite: boolean }
  | { status: "failed"; website: boolean };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** What the background read of the website and reviews is doing, in plain words. */
function EnrichBanner({ enrich }: { enrich: EnrichState }) {
  if (enrich.status === "idle") return null;

  if (enrich.status === "loading") {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-brand-soft/70 px-5 py-3.5 text-[13.5px] text-ink-soft">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />
        Reading {enrich.website ? "your website and " : ""}Google reviews for services, prices and staff…
      </div>
    );
  }

  const found = enrich.status === "done" ? [
    enrich.services && plural(enrich.services, "service"),
    enrich.staff && plural(enrich.staff, "staff member"),
    enrich.answers && plural(enrich.answers, "answer"),
  ].filter(Boolean) : [];

  if (found.length) {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-leaf-line bg-leaf-soft/60 px-5 py-3.5 text-[13.5px] text-ink-soft">
        <Check className="h-4 w-4 shrink-0 text-leaf" strokeWidth={3} />
        <span>Found {found.join(", ")}. Check them below — add any missing prices.</span>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl bg-paper-tint px-5 py-3.5 text-[13.5px] text-ink-dim">
      {enrich.website
        ? "Couldn't read much from your website — add your services and prices below."
        : "There's no website on your Google listing — add your services and prices below."}
    </div>
  );
}

/**
 * The confirm screen. Everything is already filled in from Google Maps and the website;
 * the owner only fixes what's wrong and adds what couldn't be found (usually prices).
 */
export function Found({ enrich }: { enrich: EnrichState }) {
  const { control } = useFormContext<Draft>();
  const d = useWatch({ control }) as Draft;
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Ask
        title="Here's what we found."
        hint="Check it's right — tap anything to change it."
      />

      <EnrichBanner enrich={enrich} />

      <div className={cn("rounded-2xl border bg-white p-5 transition-colors", editing ? "border-brand/30" : "border-line")}>
        <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} className="flex w-full items-start gap-4 text-left">
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-extrabold tracking-tight text-ink">{d.name || "Your business"}</span>
            <span className="mt-0.5 block text-[13px] text-ink-dim">
              {typeLabel(d.type, d.otherType)}
              {d.rating ? (
                <span className="ml-2 inline-flex items-center gap-1 text-ink-faint">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {d.rating.toFixed(1)}{d.reviewCount ? ` · ${d.reviewCount} reviews` : ""}
                </span>
              ) : null}
            </span>
            {d.address && <span className="mt-2 block text-[13px] leading-relaxed text-ink-soft">{d.address}</span>}
            <span className="mt-1 block text-[13px] text-ink-soft">
              {[d.phone, d.website?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-brand">
            <Pencil className="h-3.5 w-3.5" />
            {editing ? "Done" : "Edit"}
          </span>
        </button>
        {editing && (
          <div className="mt-5 border-t border-line pt-5">
            <Business embedded />
          </div>
        )}
      </div>

      <Hours embedded />
      <Services embedded />
    </>
  );
}
