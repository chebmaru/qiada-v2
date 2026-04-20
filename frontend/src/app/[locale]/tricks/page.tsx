"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getKeywordHints, type KeywordHint } from "@/lib/api";
import { SkeletonList } from "@/components/Skeleton";

export default function TricksPage() {
  const t = useTranslations("tricks");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [keywords, setKeywords] = useState<{
    onlyTrue: KeywordHint[];
    onlyFalse: KeywordHint[];
  } | null>(null);

  useEffect(() => {
    getKeywordHints().then(setKeywords);
  }, []);

  if (!keywords) {
    return (
      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        <div className="h-8 w-40 skeleton rounded mb-2" />
        <div className="h-5 w-60 skeleton rounded mb-8" />
        <SkeletonList />
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold tracking-tight mb-2">{t("title")}</h1>
      <p className="text-[var(--muted)] text-sm mb-8">{t("subtitle")}</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Always TRUE */}
        <div className="card p-6 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-green-700 dark:text-green-400">
              {t("alwaysTrue")}
            </h2>
          </div>
          <div className="space-y-2.5">
            {keywords.onlyTrue.map((kw) => (
              <div key={kw.word} className="flex items-center justify-between p-2.5 rounded-lg bg-white/60 dark:bg-green-900/30">
                <span className="font-medium text-green-800 dark:text-green-300 text-sm">{kw.word}</span>
                <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded-full font-medium">
                  {kw.count}x
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Always FALSE */}
        <div className="card p-6 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
              {t("alwaysFalse")}
            </h2>
          </div>
          <div className="space-y-2.5">
            {keywords.onlyFalse.map((kw) => (
              <div key={kw.word} className="flex items-center justify-between p-2.5 rounded-lg bg-white/60 dark:bg-red-900/30">
                <span className="font-medium text-red-800 dark:text-red-300 text-sm">{kw.word}</span>
                <span className="text-xs text-red-600 bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded-full font-medium">
                  {kw.count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
