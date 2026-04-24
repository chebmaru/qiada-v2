"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getTopics, getChapters, getTopicStats, type Topic, type Chapter, type TopicStat } from "@/lib/api";
import { SkeletonList } from "@/components/Skeleton";
import AuthGate from "@/components/AuthGate";

type SortMode = "default" | "alpha" | "questions" | "accuracy";

export default function TopicsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [topics, setTopics] = useState<Topic[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [stats, setStats] = useState<Map<string, TopicStat>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [sort, setSort] = useState<SortMode>("default");
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem("token");
    const promises: Promise<void>[] = [
      getTopics().then(setTopics),
      getChapters().then(setChapters),
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

  // Expand all chapters by default once loaded
  useEffect(() => {
    if (chapters.length > 0 && expandedChapters.size === 0) {
      setExpandedChapters(new Set(chapters.map((c) => c.id)));
    }
  }, [chapters]);

  const visibleTopics = useMemo(() => {
    let filtered = topics.filter((topic) => topic.questionCount > 0);

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (topic) =>
          topic.titleIt.toLowerCase().includes(q) ||
          topic.titleAr.includes(q) ||
          topic.topicKey.includes(q)
      );
    }

    // Chapter filter
    if (selectedChapter !== null) {
      filtered = filtered.filter((topic) => topic.chapterId === selectedChapter);
    }

    // Sort
    if (sort === "alpha") {
      filtered.sort((a, b) => (isAr ? a.titleAr : a.titleIt).localeCompare(isAr ? b.titleAr : b.titleIt));
    } else if (sort === "questions") {
      filtered.sort((a, b) => b.questionCount - a.questionCount);
    } else if (sort === "accuracy") {
      filtered.sort((a, b) => {
        const pA = stats.get(a.topicKey);
        const pB = stats.get(b.topicKey);
        const accA = pA && pA.totalSeen > 0 ? pA.totalCorrect / pA.totalSeen : -1;
        const accB = pB && pB.totalSeen > 0 ? pB.totalCorrect / pB.totalSeen : -1;
        return accA - accB; // worst first
      });
    }

    return filtered;
  }, [topics, search, selectedChapter, sort, stats, isAr]);

  // Group topics by chapter
  const groupedTopics = useMemo(() => {
    if (selectedChapter !== null || sort !== "default" || search.trim()) {
      return null; // flat list when filtering/searching/sorting
    }
    const groups = new Map<number, Topic[]>();
    for (const topic of visibleTopics) {
      const existing = groups.get(topic.chapterId) || [];
      existing.push(topic);
      groups.set(topic.chapterId, existing);
    }
    return groups;
  }, [visibleTopics, selectedChapter, sort, search]);

  const toggleChapter = (id: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalQuestions = visibleTopics.reduce((sum, t) => sum + t.questionCount, 0);

  if (loading) {
    return (
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-4" />
        <SkeletonList count={10} />
      </main>
    );
  }

  return (
    <AuthGate>
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-24">
      <h1 className="text-2xl font-bold mb-1">{t("common.topics")}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {visibleTopics.length} {t("common.topics").toLowerCase()} — {totalQuestions} {t("common.questions").toLowerCase()}
      </p>

      {/* Search bar */}
      <div className="relative mb-3">
        <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAr ? "ابحث عن موضوع..." : "Cerca argomento..."}
          className="w-full ps-9 pe-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Chapter filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setSelectedChapter(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
            selectedChapter === null
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          {isAr ? "الكل" : "Tutti"}
        </button>
        {chapters.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setSelectedChapter(selectedChapter === ch.id ? null : ch.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
              selectedChapter === ch.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
            }`}
          >
            {ch.number}. {isAr ? ch.nameAr : ch.nameIt}
          </button>
        ))}
      </div>

      {/* Sort options */}
      <div className="flex gap-1.5 mb-4">
        {([
          ["default", isAr ? "ترتيب" : "Ordine"],
          ["alpha", "A-Z"],
          ["questions", isAr ? "أسئلة" : "Domande"],
          ["accuracy", isAr ? "صعوبة" : "Difficoltà"],
        ] as [SortMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setSort(mode)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
              sort === mode
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Topics list */}
      {visibleTopics.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">{isAr ? "لا توجد نتائج" : "Nessun risultato"}</p>
        </div>
      ) : groupedTopics ? (
        // Grouped by chapter
        <div className="space-y-2">
          {chapters
            .filter((ch) => groupedTopics.has(ch.id))
            .map((ch) => {
              const chapterTopics = groupedTopics.get(ch.id)!;
              const isExpanded = expandedChapters.has(ch.id);
              const chapterQuestions = chapterTopics.reduce((s, t) => s + t.questionCount, 0);

              return (
                <div key={ch.id}>
                  <button
                    onClick={() => toggleChapter(ch.id)}
                    className="w-full flex items-center justify-between py-2.5 px-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-start"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex-shrink-0 w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                        {ch.number}
                      </span>
                      <span className="font-medium text-sm truncate">
                        {isAr ? ch.nameAr : ch.nameIt}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">
                        {chapterTopics.length} · {chapterQuestions}q
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-1 space-y-1 ms-2">
                      {chapterTopics.map((topic) => (
                        <TopicRow key={topic.id} topic={topic} stat={stats.get(topic.topicKey)} isAr={isAr} t={t} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        // Flat list (when searching/filtering/sorting)
        <div className="space-y-1.5">
          {visibleTopics.map((topic) => (
            <TopicRow key={topic.id} topic={topic} stat={stats.get(topic.topicKey)} isAr={isAr} t={t} />
          ))}
        </div>
      )}
    </main>
    </AuthGate>
  );
}

function TopicRow({ topic, stat, isAr, t }: { topic: Topic; stat?: TopicStat; isAr: boolean; t: ReturnType<typeof useTranslations> }) {
  const pct = stat && stat.totalSeen > 0 ? Math.round((stat.totalCorrect / stat.totalSeen) * 100) : 0;
  const hasStat = stat && stat.totalSeen > 0;

  return (
    <Link
      href={`/topics/${topic.topicKey}`}
      className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
    >
      <div className="flex items-start gap-3">
        <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
          hasStat && pct >= 80
            ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
            : hasStat
            ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
        }`}>
          {hasStat && pct >= 80 ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm">{isAr ? topic.titleAr : topic.titleIt}</h3>
          <div className="flex items-center gap-2 mt-1">
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
            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1.5">
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
}
