"use client";

import { useTTS } from "@/hooks/useTTS";

interface TTSButtonProps {
  text: string;
  lang: "it" | "ar";
  className?: string;
}

export default function TTSButton({ text, lang, className = "" }: TTSButtonProps) {
  const { speak, stop, isSpeaking, isSupported } = useTTS();

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={() => (isSpeaking ? stop() : speak(text, lang))}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition ${className}`}
      aria-label={isSpeaking ? "Stop" : "Play"}
    >
      {isSpeaking ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
