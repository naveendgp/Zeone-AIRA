"use client";

import { useCallback, useRef, useState } from "react";
import { answer as localAnswer, type Confidence } from "../../_lib/engine";
import type { Draft } from "../../_lib/schema";
import { sessionId } from "../../_lib/track";

export interface Turn {
  id: string;
  role: "caller" | "assistant";
  text: string;
  confidence?: Confidence;
  source?: string;
  /** How long the answer took, so the stats panel isn't inventing a number. */
  ms?: number;
  /** "gemini" once the real model answered; "local" when we fell back. */
  engine?: string;
  /** The opening line. Spoken, but not an answer — kept out of the stats. */
  greeting?: boolean;
}

/** Shared by the voice and chat tabs so the stats count both. */
export function useConversation(draft: Draft) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const seq = useRef(0);
  const historyRef = useRef<{ role: "caller" | "assistant"; text: string }[]>([]);
  const nextId = () => `t${++seq.current}`;

  const ask = useCallback(
    async (text: string): Promise<Turn | void> => {
      const q = text.trim();
      if (!q) return;

      setTurns((t) => [...t, { id: nextId(), role: "caller", text: q }]);
      setThinking(true);
      const started = performance.now();

      let payload: { text: string; confidence: Confidence; source?: string; engine?: string };
      try {
        const res = await fetch("/api/demo-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft, question: q, messages: historyRef.current.slice(-8), sid: sessionId() }),
        });
        if (!res.ok) throw new Error(String(res.status));
        payload = await res.json();
      } catch {
        // Network died — answer from the deterministic engine rather than showing nothing.
        const a = localAnswer(draft, q);
        payload = { ...a, engine: "local" };
      }

      const turn: Turn = {
        id: nextId(),
        role: "assistant",
        text: payload.text,
        confidence: payload.confidence,
        source: payload.source,
        engine: payload.engine,
        ms: Math.round(performance.now() - started),
      };

      historyRef.current = [...historyRef.current, { role: "caller", text: q }, { role: "assistant", text: turn.text }];
      setTurns((t) => [...t, turn]);
      setThinking(false);
      return turn;
    },
    [draft]
  );

  /** Drop the opening line in without a round-trip — it's fixed text, not a reply. */
  const greet = useCallback((text: string) => {
    setTurns((t) => (t.some((x) => x.greeting) ? t : [...t, { id: nextId(), role: "assistant", text, greeting: true }]));
  }, []);

  const reset = useCallback(() => {
    setTurns([]);
    historyRef.current = [];
  }, []);

  const exchanges = turns.filter((t) => t.role === "assistant" && !t.greeting);
  const grounded = exchanges.filter((t) => t.confidence === "grounded").length;
  const missed = exchanges.filter((t) => t.confidence === "unknown");
  const avgMs = exchanges.length
    ? Math.round(exchanges.reduce((s, t) => s + (t.ms ?? 0), 0) / exchanges.length)
    : 0;
  const usingGemini = exchanges.some((t) => t.engine === "gemini");

  return {
    turns, thinking, ask, greet, reset, usingGemini,
    stats: {
      exchanges: exchanges.length,
      grounded,
      groundedPct: exchanges.length ? Math.round((grounded / exchanges.length) * 100) : 0,
      missed,
      avgMs,
    },
  };
}
