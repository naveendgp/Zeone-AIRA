"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { cn } from "./ui";

/**
 * Speak an answer instead of typing it.
 *
 * Tap to start, tap to stop. The audio goes to the same /api/stt the demo uses, so the
 * owner can answer "Do you have parking?" in Tamil while standing at the counter.
 */
const MAX_MS = 30_000;

export function MicButton({ onText, lang = "ta-IN", label = "Speak your answer" }: {
  onText: (text: string) => void;
  lang?: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "recording" | "busy" | "error">("idle");
  const recRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = () => {
    setState("error");
    setTimeout(() => setState("idle"), 1800);
  };

  const start = async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return flash();
    }
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearTimeout(timerRef.current);
      setState("busy");
      try {
        const form = new FormData();
        form.append("audio", new Blob(chunks, { type: rec.mimeType || "audio/webm" }), "answer.webm");
        form.append("lang", lang);
        const res = await fetch("/api/stt", { method: "POST", body: form });
        const d = await res.json();
        if (!res.ok || !d.text?.trim()) return flash();
        onText(d.text.trim());
        setState("idle");
      } catch {
        flash();
      }
    };
    recRef.current = rec;
    rec.start();
    setState("recording");
    timerRef.current = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_MS);
  };

  const stop = () => recRef.current?.state === "recording" && recRef.current.stop();

  return (
    <button
      type="button"
      onClick={state === "recording" ? stop : state === "idle" ? start : undefined}
      disabled={state === "busy"}
      aria-label={state === "recording" ? "Stop recording" : label}
      title={state === "error" ? "Couldn't hear that — try again" : label}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
        state === "recording" && "animate-pulse bg-rose-500 text-white",
        state === "busy" && "bg-brand-soft text-brand",
        state === "error" && "bg-rose-50 text-rose-600",
        state === "idle" && "bg-paper-tint text-ink-faint hover:bg-brand-soft hover:text-brand"
      )}
    >
      {state === "recording" ? <Square className="h-3.5 w-3.5" fill="currentColor" />
        : state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" />
        : <Mic className="h-4 w-4" />}
    </button>
  );
}
