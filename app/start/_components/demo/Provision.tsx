"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Loader2, Radio, TriangleAlert } from "lucide-react";
import type { Draft } from "../../_lib/schema";
import { Button, cn } from "../ui";

interface Result {
  ok?: boolean;
  profilePath?: string;
  businessId?: number | null;
  dbNote?: string | null;
  command?: string;
  summary?: Record<string, string | number>;
  error?: string;
  issues?: string[];
}

/** Hands the finished setup to the Python voice agent that answers real calls. */
export function Provision({ draft, who }: { draft: Draft; who: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const send = async () => {
    setState("busy");
    try {
      const res = await fetch("/api/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data: Result = await res.json();
      setResult(data);
      setState(res.ok ? "done" : "error");
    } catch (e) {
      setResult({ error: (e as Error).message });
      setState("error");
    }
  };

  const copy = () => {
    if (!result?.command) return;
    void navigator.clipboard.writeText(result.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-[0_20px_45px_#2924380d]">
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
            state === "done" ? "bg-leaf-soft text-leaf" : "bg-brand text-white shadow-[0_8px_18px_#6d4ed82e]"
          )}
        >
          {state === "done" ? <Check className="h-5 w-5" strokeWidth={3} /> : <Radio className="h-5 w-5" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold tracking-tight text-ink">
            {state === "done" ? `${who} is live on your agent` : `Put ${who} on the real phone agent`}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-dim">
            {state === "done"
              ? "Everything above has been written to your agent's config. Start the agent and it will answer calls with exactly these facts."
              : "This sends everything you just set up to the Frontline voice agent on this machine — the one that does Tamil speech, checks the calendar and writes bookings to your dashboard."}
          </p>

          {state !== "done" && (
            <Button className="mt-4" onClick={send} disabled={state === "busy"}>
              {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              {state === "busy" ? "Sending…" : "Send to my voice agent"}
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {state === "done" && result?.command && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-4">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                {Object.entries(result.summary ?? {}).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10.5px] uppercase tracking-[0.1em] text-ink-ghost">
                      {k.replace(/([A-Z])/g, " $1")}
                    </dt>
                    <dd className="mt-0.5 text-[13.5px] font-bold tabular-nums text-ink">{String(v) || "—"}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <p className="mb-2 text-[12px] text-ink-faint">
                  Written to{" "}
                  <code className="rounded bg-paper-tint px-1.5 py-0.5 font-mono text-[11.5px] text-ink-dim">
                    {result.profilePath}
                  </code>
                  {result.businessId ? ` · registered in your dashboard as business #${result.businessId}` : ""}
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-line bg-paper-soft p-3">
                  <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12.5px] text-ink">
                    {result.command}
                  </code>
                  <button
                    type="button"
                    onClick={copy}
                    aria-label="Copy command"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-black/[0.04] hover:text-ink"
                  >
                    {copied ? <Check className="h-4 w-4 text-leaf" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {result.dbNote && (
                <p className="flex items-start gap-2 text-[12px] leading-relaxed text-amber-700">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {result.dbNote}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
            <p className="text-[13px] font-semibold text-rose-600">{result?.error ?? "Something went wrong."}</p>
            {result?.issues?.length ? (
              <ul className="mt-1.5 space-y-1">
                {result.issues.map((i) => (
                  <li key={i} className="text-[12.5px] text-ink-dim">
                    · {i}
                  </li>
                ))}
              </ul>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
