"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "qiada_onboarding_done";

const steps = [
  {
    icon: (
      <svg className="w-16 h-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    titleKey: "onboarding.step1Title" as const,
    descKey: "onboarding.step1Desc" as const,
  },
  {
    icon: (
      <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    titleKey: "onboarding.step2Title" as const,
    descKey: "onboarding.step2Desc" as const,
  },
  {
    icon: (
      <svg className="w-16 h-16 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    titleKey: "onboarding.step3Title" as const,
    descKey: "onboarding.step3Desc" as const,
  },
];

export default function Onboarding() {
  const t = useTranslations();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 pb-8 shadow-xl">
        {/* Skip */}
        <div className="flex justify-end mb-4">
          <button onClick={dismiss} className="text-xs text-gray-400 hover:text-gray-600 transition">
            {t("onboarding.skip")}
          </button>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">{current.icon}</div>
          <h2 className="text-xl font-bold mb-2">{t(current.titleKey)}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {t(current.descKey)}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-blue-600" : "w-1.5 bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={isLast ? dismiss : () => setStep((s) => s + 1)}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition"
        >
          {isLast ? t("onboarding.start") : t("common.next")}
        </button>
      </div>
    </div>
  );
}
