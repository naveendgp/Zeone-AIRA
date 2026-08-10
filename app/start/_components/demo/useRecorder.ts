"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Records one caller turn and hands the audio to /api/stt.
 *
 * This replaces the browser's Web Speech API so the web demo has the same shape as the
 * phone agent: capture audio → server-side ASR → text. The agent uses Silero VAD to know
 * when a turn ends; here that job is done by an RMS threshold on an AnalyserNode. Cruder,
 * but the same purpose — stop recording when the caller stops talking, without making
 * them press a button twice.
 */
const SILENCE_RMS = 0.012;      // below this counts as silence
const SILENCE_MS = 1100;        // hang up the turn after this much quiet
const MIN_SPEECH_MS = 300;      // ignore a cough or a click
const MAX_TURN_MS = 60_000;     // safety stop only, so a stuck mic cannot record forever

export type RecorderState = "idle" | "listening" | "transcribing";

export interface RecorderError {
  kind: "permission" | "unsupported" | "network" | "empty";
  message: string;
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<RecorderError | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const abortRef = useRef(false);

  const release = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    recRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setLevel(0);
  }, []);

  /** Abandon the current turn without transcribing (hang up, trial expired). */
  const cancel = useCallback(() => {
    abortRef.current = true;
    try { recRef.current?.stop(); } catch { /* already stopped */ }
    release();
    setState("idle");
  }, [release]);

  /**
   * Listen until the caller stops talking, then transcribe.
   * Resolves with the transcript, or "" if there was nothing usable.
   */
  const listenOnce = useCallback(
    async (lang: string, prompt = ""): Promise<string> => {
      setError(null);
      abortRef.current = false;

      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setError({ kind: "unsupported", message: "This browser can't record audio. Try Chrome or Safari." });
        return "";
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        setError({ kind: "permission", message: "Microphone blocked. Allow mic access in your browser, then press Speak." });
        return "";
      }
      streamRef.current = stream;

      const chunks: Blob[] = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4" // Safari
          : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

      const stopped = new Promise<void>((resolve) => { rec.onstop = () => resolve(); });

      // --- endpointing: watch loudness, stop after a stretch of silence ---
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      // An AudioContext created outside a user gesture starts suspended, and a suspended
      // analyser reports pure silence — so endpointing never fired and every turn came
      // back empty. This is the gesture-less path (we get here after `await speak()`).
      if (ctx.state === "suspended") { try { await ctx.resume(); } catch { /* keep going */ } }
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);

      const startedAt = performance.now();
      let speechAt: number | null = null;
      let quietSince: number | null = null;

      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        setLevel(rms);

        const now = performance.now();
        if (rms > SILENCE_RMS) {
          if (speechAt === null) speechAt = now;
          quietSince = null;
        } else if (speechAt !== null && now - speechAt > MIN_SPEECH_MS) {
          quietSince ??= now;
          if (now - quietSince > SILENCE_MS) { try { rec.stop(); } catch {} return; }
        }
        if (now - startedAt > MAX_TURN_MS) { try { rec.stop(); } catch {} return; }
        rafRef.current = requestAnimationFrame(tick);
      };

      setState("listening");
      rec.start(120);
      rafRef.current = requestAnimationFrame(tick);
      await stopped;
      release();

      if (abortRef.current) { setState("idle"); return ""; }
      if (speechAt === null || !chunks.length) {
        // Nothing above the noise floor. Say so rather than looking broken.
        setState("idle");
        setError({ kind: "empty", message: "Didn't hear anything — check your microphone, then press Speak." });
        return "";
      }

      setState("transcribing");
      try {
        const form = new FormData();
        form.append("audio", new Blob(chunks, { type: mime || "audio/webm" }), "turn.webm");
        form.append("lang", lang);
        if (prompt) form.append("prompt", prompt);
        const res = await fetch("/api/stt", { method: "POST", body: form });
        const data = (await res.json()) as { text?: string; error?: string };
        setState("idle");
        if (!res.ok) {
          setError({
            kind: "network",
            message:
              data.error === "whisper_offline"
                ? "The local Whisper service isn't running. Start it with: ./venv/bin/python whisper_server.py"
                : data.error === "rate_limited"
                  ? "Too many requests just now — wait a moment and press Speak."
                  : "Couldn't hear that clearly. Press Speak and try again.",
          });
          return "";
        }
        return (data.text ?? "").trim();
      } catch {
        setState("idle");
        setError({ kind: "network", message: "Lost connection while sending your audio." });
        return "";
      }
    },
    [release]
  );

  return { listenOnce, cancel, state, level, error, setError };
}
