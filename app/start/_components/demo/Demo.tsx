"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BookOpen, CalendarCheck, MessageSquare, Pencil, Phone, RotateCcw } from "lucide-react";
import type { Draft } from "../../_lib/schema";
import { coverage, knowledgeCount } from "../../_lib/engine";
import { Button, Eyebrow, cn } from "../ui";
import { Chat } from "./Chat";
import { Voice } from "./Voice";
import { Knowledge } from "./Knowledge";
import { useConversation } from "./useConversation";
import { Provision } from "./Provision";

const TABS = [
  { key: "voice", label: "Voice call", icon: Phone },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "knowledge", label: "Knowledge", icon: BookOpen },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const STATS_AFTER = 3;

function Stat({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div>
      <div className={cn("text-[26px] font-extrabold tabular-nums leading-none tracking-tight text-ink", tone)}>
        {value}
      </div>
      <div className="mt-2 text-[11.5px] leading-tight text-ink-faint">{label}</div>
    </div>
  );
}

export function Demo({ draft, who, onEdit }: { draft: Draft; who: string; onEdit: () => void }) {
  const [tab, setTab] = useState<TabKey>("voice");
  const { turns, thinking, ask, greet, reset, stats } = useConversation(draft);
  const showStats = stats.exchanges >= STATS_AFTER;

  return (
    <div className="mx-auto w-full max-w-[980px] px-5 pb-24 pt-16 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Eyebrow>Your AI front desk is ready</Eyebrow>
        <h1 className="mt-4 text-[38px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[50px]">
          Meet <em className="font-display font-semibold italic text-brand-hover">{who}.</em>
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-dim">
          {who} knows {knowledgeCount(draft)} things about{" "}
          <span className="font-bold text-ink">{draft.name || "your business"}</span> — and nothing else.
          Call or type, and watch where every answer comes from.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit what {who} knows
          </Button>
          {turns.length > 0 && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" />
              Start over
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12 }}
        className="mt-10"
      >
        <div
          role="tablist"
          aria-label="Try your assistant"
          className="inline-flex rounded-2xl border border-line bg-paper-tint p-1"
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors",
                  active ? "text-ink" : "text-ink-faint hover:text-ink-dim"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tabpill"
                    className="absolute inset-0 rounded-xl bg-white shadow-[0_2px_10px_#2924380f]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <t.icon className="relative h-4 w-4" />
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-white p-4 shadow-[0_20px_45px_#2924380d] sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tab === "voice" && <Voice draft={draft} who={who} turns={turns} thinking={thinking} onAsk={ask} onGreet={greet} />}
              {tab === "chat" && <Chat draft={draft} who={who} turns={turns} thinking={thinking} onAsk={ask} />}
              {tab === "knowledge" && <Knowledge draft={draft} who={who} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-12"
          >
            <Eyebrow>What just happened</Eyebrow>
            <h2 className="mt-3 text-[24px] font-extrabold tracking-[-0.02em] text-ink">
              {who} handled {stats.exchanges} questions
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-6 rounded-2xl border border-line bg-white p-6 shadow-[0_20px_45px_#2924380d] sm:grid-cols-4">
              <Stat value={`${stats.avgMs} ms`} label="Average response time" />
              <Stat
                value={`${stats.groundedPct}%`}
                label="Answered from your knowledge"
                tone={stats.groundedPct >= 70 ? "text-leaf" : undefined}
              />
              <Stat value={`${coverage(draft)}%`} label="Knowledge coverage" />
              <Stat
                value={String(stats.missed.length)}
                label="Questions it couldn't answer"
                tone={stats.missed.length ? "text-amber-600" : undefined}
              />
            </div>

            {stats.missed.length > 0 && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-[13px] font-bold text-amber-800">
                  Missed opportunities — this is revenue walking away
                </p>
                <ul className="mt-3 space-y-1.5">
                  {stats.missed.slice(0, 4).map((m, i) => {
                    const asked = turns[turns.findIndex((t) => t.id === m.id) - 1];
                    return (
                      <li key={m.id} className="flex gap-2.5 text-[12.5px] text-ink-dim">
                        <span className="tabular-nums text-amber-700/70">{i + 1}.</span>
                        <span>&ldquo;{asked?.text ?? "—"}&rdquo;</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
                  On a real phone line you&apos;d never hear about these. Add them to your knowledge and {who}
                  {" "}answers them from the next call onward.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Writes profiles/<slug>.json for the Python agent on this machine, so it only
          means anything locally — /api/provision refuses in production. Hidden rather than
          left to fail, so a hosted visitor never meets a button that can't work. */}
      {process.env.NODE_ENV !== "production" && <Provision draft={draft} who={who} />}

      {/* closing CTA — mirrors the landing page's gradient ROI card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-14 overflow-hidden rounded-[19px] bg-gradient-to-br from-brand-mist to-[#d9f3eb] p-8 sm:p-12"
      >
        <h2 className="max-w-lg text-[26px] font-extrabold leading-[1.1] tracking-[-0.025em] text-ink sm:text-[32px]">
          Ready to put {who} on your{" "}
          <em className="font-display font-semibold italic text-brand-hover">business phone?</em>
        </h2>
        <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ink-dim">
          Your customers keep calling the same number. {who} picks up — nights, Sundays, and while
          you&apos;re with a customer.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button size="lg">
            <Phone className="h-[18px] w-[18px]" />
            Connect my phone number
          </Button>
          <Button variant="outline" size="lg">
            <CalendarCheck className="h-[18px] w-[18px]" />
            Book a live demo
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
