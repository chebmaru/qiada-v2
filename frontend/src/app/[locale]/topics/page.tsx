"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getTopics, getTopicStats, type Topic, type TopicStat } from "@/lib/api";
import { SkeletonList } from "@/components/Skeleton";

export default function TopicsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [topics, setTopics] = useState<Topic[]>([]);
  const [stats, setStats] = useState<Map<string, TopicStat>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    const promises: Promise<void>[] = [
      getTopics().then(setTopics),
    ];

    if (token) {
      promises.push(
        getTopicStats(token)
          .then((data) => setStats(new Map(data.map((s) => [s.topicKey, s]))))
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
        <SkeletonList count={10} />
      </main>
    );
  }

  const visibleTopics = topics.filter((topic) => topic.questionCount > 0);

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-1">{t("common.topics")}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {visibleTopics.length} {t("common.topics").toLowerCase()} — {visibleTopics.reduce((sum, t) => sum + t.questionCount, 0)} {t("common.questions").toLowerCase()}
      </p>

      <div className="space-y-2">
        {visibleTopics.map((topic) => {
          const stat = stats.get(topic.topicKey);
          const pct = stat ? Math.round((stat.totalCorrect / stat.totalSeen) * 100) : 0;
          const hasStat = stat && stat.totalSeen > 0;

          return (
            <Link
              key={topic.id}
              href={`/topics/${topic.topicKey}`}
              className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <div className="flex items-start gap-3">
                {topic.imageUrl ? (
                  <img
                    src={topic.imageUrl}
                    alt=""
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    hasStat && pct >= 80
                      ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                      : hasStat
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  }`}>
                    {hasStat && pct >= 80 ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    )}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">
                    {isAr ? topic.titleAr : topic.titleIt}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-500">
                      {topic.questionCount} {t("common.questions").toLowerCase()}
                    </span>
                    {hasStat && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className={`text-xs font-medium ${
                          pct >= 80 ? "text-green-600 dark:text-green-400" : pct >= 60 ? "text-blue-600 dark:text-blue-400" : "text-gray-500"
                        }`}>
                          {pct}%
                        </span>
                      </>
                    )}
                  </div>
                  {hasStat && (
                    <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-gray-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
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
