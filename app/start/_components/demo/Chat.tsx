"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft } from "lucide-react";
import type { Draft } from "../../_lib/schema";
import { PRESETS } from "../../_lib/presets";
import { Button, cn } from "../ui";
import { ConfidenceBadge } from "./Confidence";
import type { Turn } from "./useConversation";

function suggestionsFor(draft: Draft): string[] {
  const preset = draft.type ? PRESETS[draft.type] : PRESETS.clinic;
  const svc = draft.services?.find((s) => s.name?.trim() && s.price?.trim());
  const out = [
    svc ? `How much is ${svc.name}?` : `What ${preset.serviceNoun.toLowerCase()}s do you have?`,
    "What time do you open?",
    "Can I book an appointment?",
  ];
  if (preset.staffNoun && draft.staff?.some((s) => s.name?.trim())) {
    out.push(`Which ${preset.staffNoun.toLowerCase()} is available?`);
  }
  out.push("Do you do MRI scans?");
  return out;
}

export function Chat({
  draft, who, turns, thinking, onAsk,
}: {
  draft: Draft; who: string; turns: Turn[]; thinking: boolean;
  onAsk: (t: string) => void;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, thinking]);

  const send = (v?: string) => {
    const q = (v ?? text).trim();
    if (!q || thinking) return;
    onAsk(q);
    setText("");
  };

  return (
    <div className="flex h-[540px] flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2">
        {turns.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-[14px] font-medium text-ink-dim">Ask {who} anything a customer would</p>
            <p className="mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-ink-ghost">
              Every reply is tagged so you can see exactly where the answer came from.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {turns.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className={cn("flex", t.role === "caller" ? "justify-end" : "justify-start")}
            >
              <div className={cn("max-w-[82%]", t.role === "caller" && "text-right")}>
                <div
                  className={cn(
                    "inline-block rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed",
                    t.role === "caller"
                      ? "rounded-br-md bg-brand text-white"
                      : "rounded-bl-md border border-line bg-paper-soft text-ink"
                  )}
                >
                  {t.text}
                </div>
                {t.role === "assistant" && t.confidence && (
                  <div className="mt-1.5">
                    <ConfidenceBadge confidence={t.confidence} source={t.source} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {thinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-bl-md border border-line bg-paper-soft px-4 py-3.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-ink-ghost"
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16 }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2 px-1 pb-3">
          {suggestionsFor(draft).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] text-ink-dim transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-line pt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder={`Message ${who}…`}
          aria-label="Message"
          className="h-11 flex-1 rounded-xl border border-line bg-white px-4 text-[14px] text-ink outline-none placeholder:text-ink-ghost/70 focus:border-brand/60"
        />
        <Button size="icon" onClick={() => send()} disabled={!text.trim() || thinking} aria-label="Send" className="h-11 w-11">
          <CornerDownLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
