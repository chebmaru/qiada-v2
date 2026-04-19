"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getConfusingPairs, type ConfusingPair } from "@/lib/api";
import TTSButton from "@/components/TTSButton";

export default function ConfusingPage() {
  const t = useTranslations("confusing");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [pairs, setPairs] = useState<ConfusingPair[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  useEffect(() => {
    getConfusingPairs({ limit: LIMIT, offset: page * LIMIT }).then((res) => {
      setPairs(res.data);
      setTotal(res.total);
    });
  }, [page]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
      <p className="text-gray-500 mb-6">
        {t("subtitle")} ({total})
      </p>

      <div className="space-y-6">
        {pairs.map((pair, i) => (
          <div
            key={`${pair.trueQuestion.code}-${pair.falseQuestion.code}`}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-800">
              {/* TRUE */}
              <div className="p-4">
                <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">
                  {t("questionTrue")}
                </span>
                <p className="mt-2 text-sm" dir={isAr ? "rtl" : "ltr"}>
                  {isAr ? pair.trueQuestion.textAR : pair.trueQuestion.textIT}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <TTSButton
                    text={isAr ? pair.trueQuestion.textAR : pair.trueQuestion.textIT}
                    lang={isAr ? "ar" : "it"}
                  />
                  <span className="text-xs text-gray-400">{pair.trueQuestion.code}</span>
                </div>
              </div>

              {/* FALSE */}
              <div className="p-4">
                <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded">
                  {t("questionFalse")}
                </span>
                <p className="mt-2 text-sm" dir={isAr ? "rtl" : "ltr"}>
                  {isAr ? pair.falseQuestion.textAR : pair.falseQuestion.textIT}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <TTSButton
                    text={isAr ? pair.falseQuestion.textAR : pair.falseQuestion.textIT}
                    lang={isAr ? "ar" : "it"}
                  />
                  <span className="text-xs text-gray-400">{pair.falseQuestion.code}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-30"
          >
            &larr;
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            {page + 1} / {Math.ceil(total / LIMIT)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * LIMIT >= total}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-30"
          >
            &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
