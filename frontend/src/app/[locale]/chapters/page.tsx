"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getChapters, getChapterProgress, type Chapter, type ChapterProgress } from "@/lib/api";
import { SkeletonList } from "@/components/Skeleton";

export default function ChaptersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<Map<number, ChapterProgress>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    const promises: Promise<void>[] = [
      getChapters().then(setChapters),
    ];

    if (token) {
      promises.push(
        getChapterProgress(token)
          .then((data) => setProgress(new Map(data.map((p) => [p.id, p]))))
          .catch(() => {})
      );
    }

    Promise.all(promises)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
        <SkeletonList count={8} />
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">
        {isAr ? "الفصول" : "Capitoli"}
      </h1>

      <div className="space-y-2">
        {chapters.map((ch) => {
          const prog = progress.get(ch.id);
          const pct = prog?.percentage ?? 0;

          return (
            <Link
              key={ch.id}
              href={`/topics?chapter=${ch.id}`}
              className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <div className="flex items-center gap-3">
                <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  pct >= 80
                    ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                    : pct > 0
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}>
                  {pct >= 80 ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    ch.number
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{isAr ? ch.nameAr : ch.nameIt}</h3>
                  {prog && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 80 ? "bg-green-500" : pct > 0 ? "bg-blue-500" : "bg-gray-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {prog.answeredCorrectly}/{prog.totalQuestions}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
