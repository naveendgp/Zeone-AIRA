"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, MapPin, PenLine, Search, Wand2 } from "lucide-react";
import type { PlaceSummary } from "../../../_lib/places";
import { Ask, cn } from "../ui";

interface Suggestion { id: string; main: string; secondary: string }

/**
 * Step one is a search box, not a form.
 *
 * The owner types the name the way it appears on Google Maps and picks it. Name, category,
 * address, phone, website and hours all come from that one pick — they confirm on the next
 * screen instead of typing. If it isn't there, the way out sits right under the box and
 * keeps what they typed.
 */
export function Find({
  onPlace, onManual, onSample, resumeName, onResume, onStartOver,
}: {
  onPlace: (p: PlaceSummary) => void;
  onManual: (typedName?: string) => void;
  onSample: () => void;
  resumeName?: string;
  onResume?: () => void;
  onStartOver?: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [state, setState] = useState<"idle" | "searching" | "unavailable" | "error">("idle");
  const [picking, setPicking] = useState<string | null>(null);
  const session = useRef("");

  useEffect(() => {
    session.current = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setResults([]);
      setState((s) => (s === "searching" ? "idle" : s));
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setState("searching");
      try {
        const res = await fetch(
          `/api/places/search?q=${encodeURIComponent(term)}&session=${session.current}`,
          { signal: ctl.signal }
        );
        if (res.status === 503) { setResults([]); setState("unavailable"); return; }
        const d = await res.json();
        setResults(d.results ?? []);
        setState(res.ok ? "idle" : "error");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState("error");
      }
    }, 300);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  const pick = async (s: Suggestion) => {
    setPicking(s.id);
    try {
      const res = await fetch(`/api/places/details?id=${encodeURIComponent(s.id)}&session=${session.current}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "details");
      onPlace(d as PlaceSummary);
    } catch {
      setPicking(null);
      setState("error");
    }
  };

  const typed = q.trim();
  const noMatch = typed.length >= 3 && state === "idle" && results.length === 0;
  // search can't help: make typing-it-in the obvious next step, not a footnote
  const searchFailed = noMatch || state === "unavailable" || state === "error";

  const manualRow = (
    <button
      type="button"
      onClick={() => onManual(typed)}
      disabled={!!picking}
      className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-paper-tint disabled:opacity-50"
    >
      <PenLine className="h-[18px] w-[18px] shrink-0 text-brand" />
      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
        Not listed? Add <strong className="font-bold">&ldquo;{typed}&rdquo;</strong> yourself
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-brand" />
    </button>
  );

  return (
    <>
      <Ask
        title="Let's find your business."
        hint="Type its name the way it shows on Google Maps. We'll fill in the rest — you just check it."
      />

      {resumeName && onResume && (
        <div className="mb-5 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 rounded-2xl border border-brand/30 bg-brand-soft/60 py-2 pl-5 pr-2">
          <span className="min-w-0 basis-full py-1 text-[14px] text-ink sm:flex-1 sm:basis-auto sm:truncate">
            You started setting up <strong className="font-bold">{resumeName}</strong>
          </span>
          {onStartOver && (
            <button
              type="button"
              onClick={onStartOver}
              className="shrink-0 rounded-xl px-3 py-2 text-[13px] font-semibold text-ink-dim transition-colors hover:text-ink"
            >
              Start over
            </button>
          )}
          <button
            type="button"
            onClick={onResume}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-[13px] font-bold text-brand shadow-sm transition-colors hover:bg-paper-tint"
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-ghost" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (results[0]) void pick(results[0]);
            else if (searchFailed && typed) onManual(typed);
          }}
          placeholder="Anand Dental Care, Coimbatore"
          autoFocus
          aria-label="Search your business on Google Maps"
          className="h-[62px] w-full rounded-2xl border border-line bg-white pl-14 pr-12 text-[16.5px] text-ink shadow-[0_10px_30px_#2924380a] outline-none transition-colors placeholder:text-ink-ghost focus:border-brand/50 focus:ring-2 focus:ring-brand/15"
        />
        {state === "searching" && (
          <Loader2 className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-brand" />
        )}
      </div>

      {typed.length >= 3 && (results.length > 0 || state !== "searching") && (
        <div className="mt-2.5 overflow-hidden rounded-2xl border border-line bg-white">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={!!picking}
              onClick={() => pick(r)}
              className={cn(
                "flex w-full items-center gap-3.5 border-b border-line px-5 py-3.5 text-left transition-colors",
                picking === r.id ? "bg-brand-soft" : "hover:bg-paper-tint disabled:opacity-50"
              )}
            >
              {picking === r.id
                ? <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin text-brand" />
                : <MapPin className="h-[18px] w-[18px] shrink-0 text-ink-ghost" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-bold text-ink">{r.main}</span>
                <span className="block truncate text-[12.5px] text-ink-faint">
                  {picking === r.id ? "Getting your details…" : r.secondary}
                </span>
              </span>
            </button>
          ))}

          {searchFailed && (
            <p className="border-b border-line bg-paper-tint px-5 py-2.5 text-[12.5px] text-ink-dim">
              {state === "error"
                ? "Couldn't reach Google just now."
                : state === "unavailable"
                  ? "Google Maps search isn't available right now."
                  : "No match on Google Maps. Try adding your area, or add it yourself."}
            </p>
          )}
          {manualRow}
        </div>
      )}

      <div className="my-8 flex items-center gap-4 text-[12px] uppercase tracking-[0.14em] text-ink-ghost">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onManual(typed)}
          className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-line-strong"
        >
          <PenLine className="h-5 w-5 shrink-0 text-ink-faint" />
          <span>
            <span className="block text-[14px] font-bold text-ink">Not on Google Maps</span>
            <span className="block text-[12.5px] text-ink-faint">Enter your details yourself</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onSample}
          className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-line-strong"
        >
          <Wand2 className="h-5 w-5 shrink-0 text-brand" />
          <span>
            <span className="block text-[14px] font-bold text-ink">Just show me</span>
            <span className="block text-[12.5px] text-ink-faint">Try it with a sample dental clinic</span>
          </span>
        </button>
      </div>
    </>
  );
}
