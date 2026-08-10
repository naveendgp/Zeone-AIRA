"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speaks a line through ElevenLabs. One voice, one clip at a time.
 *
 * There is deliberately NO browser-speech fallback. Having two engines meant a failed or
 * slow ElevenLabs play could start `speechSynthesis` while the audio element was still
 * going, and the two talked over each other. If ElevenLabs can't speak, we stay silent
 * and say so in the UI — overlapping voices are worse than no voice.
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  /**
   * Mirrors `speaking` but updated synchronously. The React state lands a render later,
   * and callers act the instant `speak()` resolves — reading the state ref there still
   * saw "speaking", so the mic never reopened.
   */
  const speakingRef = useRef(false);
  const mark = useCallback((v: boolean) => { speakingRef.current = v; setSpeaking(v); }, []);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  /** Bumped on every new utterance; anything holding a stale token gives up. */
  const tokenRef = useRef(0);

  const teardown = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      // Detach handlers first — pausing fires events that would otherwise resolve
      // the old promise and flip `speaking` back on.
      a.onplay = null;
      a.onended = null;
      a.onerror = null;
      a.pause();
      a.removeAttribute("src");
      a.load();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    tokenRef.current++;
    teardown();
    mark(false);
  }, [teardown, mark]);

  useEffect(() => cancel, [cancel]);

  /** Resolves when the line has finished playing (or immediately if it can't). */
  const speak = useCallback(
    async (text: string): Promise<void> => {
      cancel(); // whatever was playing stops before anything new begins
      const token = ++tokenRef.current;
      if (!text.trim()) return;

      let blob: Blob | null = null;
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (res.ok && res.status !== 204) {
          const b = await res.blob();
          if (b.size > 0) blob = b;
        }
      } catch {
        /* offline or blocked */
      }

      if (token !== tokenRef.current) return; // superseded while we were fetching

      if (!blob) {
        setUnavailable(true);
        return; // silent, by design
      }
      setUnavailable(false);

      return new Promise<void>((resolve) => {
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          if (token === tokenRef.current) mark(false);
          resolve();
        };

        audio.onplay = () => { if (token === tokenRef.current) mark(true); };
        audio.onended = finish;
        audio.onerror = finish;
        audio.play().catch(finish);
      });
    },
    [cancel, mark]
  );

  /** Synchronous — safe to call the instant speak() resolves. */
  const isSpeaking = useCallback(() => speakingRef.current, []);

  return { speak, cancel, speaking, isSpeaking, unavailable };
}
