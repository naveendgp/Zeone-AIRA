"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, Phone, PhoneOff } from "lucide-react";
import type { Draft } from "../../_lib/schema";
import { Button, cn } from "../ui";
import { ConfidenceBadge } from "./Confidence";
import type { Turn } from "./useConversation";
import { greetingFor } from "../../_lib/presets";
import { useSpeech } from "./useSpeech";
import { useRecorder } from "./useRecorder";

export function Voice({
  draft, who, turns, thinking, onAsk, onGreet,
}: {
  draft: Draft; who: string; turns: Turn[]; thinking: boolean;
  onAsk: (t: string) => Promise<Turn | void>;
  onGreet: (text: string) => void;
}) {
  const [onCall, setOnCall] = useState(false);
  /** Sarvam transcribes one language per turn, so the caller picks. */
  const [lang, setLang] = useState<"ta-IN" | "en-IN">("ta-IN");

  const { speak, cancel: stopSpeaking, speaking } = useSpeech();
  const { listenOnce, cancel: stopRecording, state: recState, level, error: recError, setError } = useRecorder();

  /**
   * Vocabulary hint for Whisper — the same trick agent.py uses with initial_prompt, so
   * "blood test" and "ECG" survive as English inside Tamil speech instead of being
   * transcribed phonetically.
   */
  const sttPrompt = useMemo(() => {
    const services = (draft.services ?? []).map((s) => s.name?.trim()).filter(Boolean).slice(0, 12);
    const staff = (draft.staff ?? []).map((s) => s.name?.trim()).filter(Boolean).slice(0, 6);
    return [
      `${draft.name?.trim() ?? ""} தொலைபேசி அழைப்பு.`,
      [...services, ...staff].join(", "),
      "appointment, booking, timing, price, நாளைக்கு, காலை, மாலை, மணி.",
    ].filter(Boolean).join(" ").slice(0, 500);
  }, [draft.name, draft.services, draft.staff]);

  const onCallRef = useRef(onCall);
  const langRef = useRef(lang);
  const promptRef = useRef(sttPrompt);
  useEffect(() => { onCallRef.current = onCall; langRef.current = lang; promptRef.current = sttPrompt; });

  const hangUp = useCallback(() => {
    setOnCall(false);
    onCallRef.current = false;
    stopRecording();
    stopSpeaking();
  }, [stopRecording, stopSpeaking]);

  useEffect(() => () => { stopRecording(); stopSpeaking(); }, [stopRecording, stopSpeaking]);

  /**
   * One caller turn: listen → transcribe → answer → speak → listen again.
   * Recording can never overlap playback because each step awaits the last.
   */
  const turnLoop = useCallback(async () => {
    while (onCallRef.current) {
      const said = await listenOnce(langRef.current, promptRef.current);
      if (!onCallRef.current) return;
      if (!said) return; // silence or an error — wait for them to press Speak
      const reply = await onAsk(said);
      if (!onCallRef.current) return;
      if (reply) await speak(reply.text);
    }
  }, [listenOnce, onAsk, speak]);

  const answerCall = useCallback(async () => {
    setOnCall(true);
    onCallRef.current = true;
    setError(null);
    const hello = greetingFor(draft.name ?? "");
    onGreet(hello);
    await speak(hello); // resolves when she actually stops talking
    if (onCallRef.current) void turnLoop();
  }, [draft.name, onGreet, speak, turnLoop, setError]);

  const last = [...turns].reverse().find((t) => t.role === "assistant");
  const lastCaller = [...turns].reverse().find((t) => t.role === "caller");
  const status = !onCall
    ? "Ready to take your call"
    : speaking
      ? `${who} is speaking…`
      : recState === "listening"
        ? "Listening…"
        : recState === "transcribing"
          ? "Getting that down…"
          : thinking
            ? "Thinking…"
            : "On call";

  return (
    <div className="flex h-[540px] flex-col items-center justify-center px-4">
      <div className="relative mb-7 h-28 w-28">
        <AnimatePresence>
          {(recState !== "idle" || thinking || speaking) &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className={cn("absolute inset-0 rounded-full border",
                  recState === "listening" ? "border-leaf/50" : "border-brand/40")}
                initial={{ scale: 1, opacity: 0.55 }}
                animate={{ scale: 1.6, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.9, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
              />
            ))}
        </AnimatePresence>
        <motion.div
          className="absolute inset-3 rounded-full bg-gradient-to-br from-brand-hover to-brand shadow-[0_16px_40px_#6d4ed855]"
          // While listening the orb breathes with the caller's own voice.
          animate={recState === "listening"
            ? { scale: 1 + Math.min(level * 6, 0.18) }
            : onCall ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={recState === "listening" ? { duration: 0.08 } : { duration: 2.2, repeat: Infinity }}
        />
        <div className="absolute inset-0 grid place-items-center text-[26px] font-extrabold text-white">
          {who.charAt(0)}
        </div>
      </div>

      <p className="text-[16px] font-semibold text-ink">{who}</p>
      <p className="mt-1 text-[12.5px] tabular-nums text-ink-faint">{status}</p>

      <div className="mt-7 min-h-[124px] w-full max-w-md">
        <AnimatePresence mode="popLayout">
          {lastCaller && (
            <motion.p
              key={lastCaller.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-3 text-center text-[13.5px] text-ink-faint"
            >
              You said: &ldquo;{lastCaller.text}&rdquo;
            </motion.p>
          )}
          {last && !thinking && (
            <motion.div
              key={last.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <p className="rounded-2xl border border-line bg-paper-soft px-4 py-3 text-center text-[14px] leading-relaxed text-ink">
                {last.text}
              </p>
              {last.confidence && <ConfidenceBadge confidence={last.confidence} source={last.source} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sarvam transcribes one language per turn — Tamil sent as English comes back
          as nonsense, so this has to be the caller's choice. */}
      <div className="mb-4 inline-flex rounded-full border border-line bg-paper-tint p-0.5">
          {([["ta-IN", "தமிழ்"], ["en-IN", "English"]] as const).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                lang === code ? "bg-white text-ink shadow-[0_1px_4px_#2924380f]" : "text-ink-faint hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
      </div>

      {recError && (
        <p className="mb-3 max-w-sm text-center text-[12px] leading-relaxed text-amber-700">{recError.message}</p>
      )}

      <div className="mt-1 flex items-center gap-3">
        {!onCall ? (
          <Button size="lg" onClick={answerCall} className="rounded-full px-8">
            <Phone className="h-[18px] w-[18px]" />
            Call {who}
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-6"
              disabled={recState !== "idle" || speaking || thinking}
              onClick={() => void turnLoop()}
            >
              <Mic className="h-[18px] w-[18px]" />
              Speak
            </Button>
            <Button
              size="lg"
              onClick={hangUp}
              className="rounded-full bg-rose-500 px-6 text-white shadow-[0_10px_20px_#f43f5e33] hover:bg-rose-400"
            >
              <PhoneOff className="h-[18px] w-[18px]" />
              End
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
