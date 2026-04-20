"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getConfusingPairs, type ConfusingPair } from "@/lib/api";
import TTSButton from "@/components/TTSButton";
import { SkeletonList } from "@/components/Skeleton";

export default function ConfusingPage() {
  const t = useTranslations("confusing");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [pairs, setPairs] = useState<ConfusingPair[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const LIMIT = 10;

  useEffect(() => {
    setLoading(true);
    getConfusingPairs({ limit: LIMIT, offset: page * LIMIT })
      .then((res) => {
        setPairs(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  if (loading && pairs.length === 0) {
    return (
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <div className="h-8 w-60 skeleton rounded mb-2" />
        <div className="h-5 w-40 skeleton rounded mb-6" />
        <SkeletonList />
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold tracking-tight mb-2">{t("title")}</h1>
      <p className="text-[var(--muted)] text-sm mb-6">
        {t("subtitle")} ({total})
      </p>

      <div className="space-y-4">
        {pairs.map((pair) => (
          <div
            key={`${pair.trueQuestion.code}-${pair.falseQuestion.code}`}
            className="card overflow-hidden"
          >
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--card-border)]">
              {/* TRUE */}
              <div className="p-4">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/50 px-2.5 py-1 rounded-full">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {t("questionTrue")}
                </span>
                <p className="mt-2.5 text-sm leading-relaxed" dir={isAr ? "rtl" : "ltr"}>
                  {isAr ? pair.trueQuestion.textAR : pair.trueQuestion.textIT}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <TTSButton text={pair.trueQuestion.textIT} lang="it" />
                  <span className="text-xs text-[var(--muted)]">{pair.trueQuestion.code}</span>
                </div>
              </div>

              {/* FALSE */}
              <div className="p-4">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/50 px-2.5 py-1 rounded-full">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  {t("questionFalse")}
                </span>
                <p className="mt-2.5 text-sm leading-relaxed" dir={isAr ? "rtl" : "ltr"}>
                  {isAr ? pair.falseQuestion.textAR : pair.falseQuestion.textIT}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <TTSButton text={pair.falseQuestion.textIT} lang="it" />
                  <span className="text-xs text-[var(--muted)]">{pair.falseQuestion.code}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm text-[var(--muted)] font-medium">
            {page + 1} / {Math.ceil(total / LIMIT)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * LIMIT >= total}
            className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}
    </main>
  );
}
