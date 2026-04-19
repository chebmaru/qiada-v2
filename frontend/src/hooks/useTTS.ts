"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/**
 * TTS via Google Web Speech API (100% gratuito, nessun limite).
 * Priorità voce: Google > Natural/Premium > Cloud > qualsiasi disponibile.
 * Generation counter per evitare race condition stop/speak.
 */

function findBestVoice(langCode: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const prefix = langCode.split("-")[0];
  const matching = voices.filter((v) => v.lang.startsWith(prefix));
  if (matching.length === 0) return null;
  return (
    matching.find((v) => v.name.toLowerCase().includes("google")) ||
    matching.find((v) => /natural|premium|enhanced/i.test(v.name)) ||
    matching.find((v) => !v.localService) ||
    matching[0]
  );
}

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const genRef = useRef(0);

  // Aspetta che Chrome carichi le voci (asincrono)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const check = () => {
      if (window.speechSynthesis.getVoices().length > 0) setVoicesReady(true);
    };
    check();
    window.speechSynthesis.addEventListener("voiceschanged", check);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", check);
  }, []);

  const stop = useCallback(() => {
    genRef.current++;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  // Stop su tab change e unmount
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) stop();
    };
    const handleBeforeUnload = () => stop();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      stop();
    };
  }, [stop]);

  const speak = useCallback(
    (text: string, lang: "ar" | "it") => {
      stop();
      const myGen = ++genRef.current;

      if (typeof window === "undefined" || !window.speechSynthesis) return;

      const langCode = lang === "ar" ? "ar-SA" : "it-IT";
      const voice = findBestVoice(langCode);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 1;
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        if (genRef.current === myGen) setSpeaking(true);
      };
      utterance.onend = () => {
        if (genRef.current === myGen) setSpeaking(false);
      };
      utterance.onerror = () => {
        if (genRef.current === myGen) setSpeaking(false);
      };

      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [stop],
  );

  /** Parla prima italiano poi arabo */
  const speakBoth = useCallback(
    (textIT: string, textAR: string) => {
      stop();
      const myGen = ++genRef.current;

      if (typeof window === "undefined" || !window.speechSynthesis) return;

      const voiceIT = findBestVoice("it-IT");
      const voiceAR = findBestVoice("ar-SA");

      const uttIT = new SpeechSynthesisUtterance(textIT);
      uttIT.lang = "it-IT";
      uttIT.rate = 1;
      if (voiceIT) uttIT.voice = voiceIT;

      const uttAR = new SpeechSynthesisUtterance(textAR);
      uttAR.lang = "ar-SA";
      uttAR.rate = 1;
      if (voiceAR) uttAR.voice = voiceAR;

      uttIT.onstart = () => {
        if (genRef.current === myGen) setSpeaking(true);
      };
      // Quando finisce IT, parte AR
      uttIT.onend = () => {
        if (genRef.current !== myGen) return;
        window.speechSynthesis.speak(uttAR);
      };
      uttIT.onerror = () => {
        if (genRef.current === myGen) setSpeaking(false);
      };

      uttAR.onend = () => {
        if (genRef.current === myGen) setSpeaking(false);
      };
      uttAR.onerror = () => {
        if (genRef.current === myGen) setSpeaking(false);
      };

      setSpeaking(true);
      window.speechSynthesis.speak(uttIT);
    },
    [stop],
  );

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  return {
    speak,
    speakBoth,
    stop,
    speaking,
    isSpeaking: speaking,
    supported: isSupported,
  };
}
