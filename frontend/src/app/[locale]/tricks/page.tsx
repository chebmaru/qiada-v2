"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getKeywordHints, type KeywordHint } from "@/lib/api";

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
    return <div className="max-w-3xl mx-auto px-4 py-8 text-center text-gray-500">{t("title")}...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
      <p className="text-gray-500 mb-8">{t("subtitle")}</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Always TRUE */}
        <div className="bg-green-50 dark:bg-green-950 rounded-xl p-6 border border-green-200 dark:border-green-800">
          <h2 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-4">
            {t("alwaysTrue")}
          </h2>
          <div className="space-y-3">
            {keywords.onlyTrue.map((kw) => (
              <div key={kw.word} className="flex items-center justify-between">
                <span className="font-medium text-green-800 dark:text-green-300">{kw.word}</span>
                <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">
                  {kw.count}x
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Always FALSE */}
        <div className="bg-red-50 dark:bg-red-950 rounded-xl p-6 border border-red-200 dark:border-red-800">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4">
            {t("alwaysFalse")}
          </h2>
          <div className="space-y-3">
            {keywords.onlyFalse.map((kw) => (
              <div key={kw.word} className="flex items-center justify-between">
                <span className="font-medium text-red-800 dark:text-red-300">{kw.word}</span>
                <span className="text-xs text-red-600 bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded">
                  {kw.count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
