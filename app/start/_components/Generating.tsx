"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "./ui";

const STAGES = [
  "Reading your business details",
  "Building the knowledge base",
  "Creating the receptionist profile",
  "Preparing conversations",
  "Almost ready",
];

const STEP_MS = 780;

export function Generating({ who, onDone }: { who: string; onDone: () => void }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= STAGES.length) {
      const t = setTimeout(onDone, 420);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStage((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [stage, onDone]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="relative mx-auto mb-10 h-24 w-24">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border border-brand/30"
              animate={{ scale: [1, 1.55], opacity: [0.6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
            />
          ))}
          <motion.div
            className="absolute inset-2 rounded-full bg-gradient-to-br from-brand-hover to-brand shadow-[0_16px_40px_#6d4ed855]"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 grid place-items-center text-[22px] font-extrabold text-white">
            {who.charAt(0)}
          </div>
        </div>

        <h1 className="text-center text-[26px] font-extrabold tracking-[-0.02em] text-ink">
          Teaching {who} your business
        </h1>
        <p className="mt-2 text-center text-[13.5px] text-ink-dim">This only takes a moment.</p>

        <ol className="mt-9 space-y-1">
          {STAGES.map((label, i) => {
            const done = i < stage;
            const active = i === stage;
            return (
              <motion.li
                key={label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: done || active ? 1 : 0.35, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <AnimatePresence mode="wait" initial={false}>
                    {done ? (
                      <motion.span
                        key="done"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-leaf-soft text-leaf"
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </motion.span>
                    ) : active ? (
                      <motion.span key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Loader2 className="h-4 w-4 animate-spin text-brand" />
                      </motion.span>
                    ) : (
                      <span key="idle" className="h-1.5 w-1.5 rounded-full bg-line-strong" />
                    )}
                  </AnimatePresence>
                </span>
                <span className={cn("text-[13.5px]", done ? "text-ink-dim" : active ? "font-semibold text-ink" : "text-ink-ghost")}>
                  {label}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
