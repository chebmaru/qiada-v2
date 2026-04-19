"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getTopicStats, getChapterProgress, getDashboard, type TopicStat, type ChapterProgress, type DashboardStats } from "@/lib/api";

type SortKey = "accuracy" | "totalWrong" | "totalSeen";

export default function StatsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [chapters, setChapters] = useState<ChapterProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("accuracy");
  const [filterChapter, setFilterChapter] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError(isAr ? "يجب تسجيل الدخول" : "Devi accedere");
      setLoading(false);
      return;
    }

    Promise.all([
      getDashboard(token),
      getTopicStats(token),
      getChapterProgress(token),
    ])
      .then(([dash, topics, chaps]) => {
        setStats(dash);
        setTopicStats(topics);
        setChapters(chaps);
      })
      .catch(() => setError(isAr ? "خطأ في تحميل البيانات" : "Errore nel caricamento"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <main className="flex-1 flex items-center justify-center"><p>{t("common.loading")}</p></main>;
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg">{t("common.login")}</Link>
      </main>
    );
  }

  // Sort and filter topics
  const filtered = topicStats
    .filter((t) => !filterChapter || t.chapterId === filterChapter)
    .sort((a, b) => {
      if (sortBy === "accuracy") return a.accuracy - b.accuracy;
      if (sortBy === "totalWrong") return b.totalWrong - a.totalWrong;
      return b.totalSeen - a.totalSeen;
    });

  const weakTopics = topicStats.filter((t) => t.accuracy < 70 && t.totalSeen >= 3);
  const strongTopics = topicStats.filter((t) => t.accuracy >= 90 && t.totalSeen >= 5);

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-2">{isAr ? "الإحصائيات" : "Statistiche"}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {isAr ? "تحليل مفصل لأدائك" : "Analisi dettagliata del tuo rendimento"}
      </p>

      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">{isAr ? "أسئلة فريدة" : "Domande viste"}</p>
            <p className="text-xl font-bold">{stats.uniqueQuestions}</p>
            <p className="text-xs text-gray-400">/6845</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">{isAr ? "الدقة" : "Precisione"}</p>
            <p className={`text-xl font-bold ${stats.accuracy >= 80 ? "text-green-600" : stats.accuracy >= 60 ? "text-yellow-600" : "text-red-600"}`}>
              {stats.accuracy}%
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">{isAr ? "نقاط ضعف" : "Punti deboli"}</p>
            <p className="text-xl font-bold text-red-600">{weakTopics.length}</p>
          </div>
        </div>
      )}

      {/* Prediction */}
      {stats && stats.totalExams >= 3 && (
        <div className={`rounded-lg p-4 mb-6 text-center border ${
          stats.avgScore >= 83
            ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
            : "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
        }`}>
          <p className="text-sm font-medium">
            {stats.avgScore >= 83
              ? isAr ? "أنت مستعد للامتحان! متوسطك فوق 83%" : "Sei pronto per l'esame! Media sopra 83%"
              : isAr ? "استمر في التدريب! تحتاج 83% للنجاح" : "Continua a studiare! Serve 83% per passare"}
          </p>
        </div>
      )}

      {/* Strong topics */}
      {strongTopics.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-green-600 mb-2">
            {isAr ? `نقاط القوة (${strongTopics.length})` : `Punti forti (${strongTopics.length})`}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {strongTopics.slice(0, 10).map((t) => (
              <span key={t.topicKey} className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                {isAr ? t.titleAr : t.titleIt} {t.accuracy}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-red-600 mb-2">
            {isAr ? `نقاط الضعف (${weakTopics.length})` : `Punti deboli (${weakTopics.length})`}
          </h2>
          <div className="space-y-2">
            {weakTopics.map((t) => (
              <Link
                key={t.topicKey}
                href={`/topics/${t.topicKey}`}
                className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <span className="text-sm font-medium">{isAr ? t.titleAr : t.titleIt}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-red-600 font-bold">{t.accuracy}%</span>
                  <span className="text-gray-500">{t.totalWrong} err</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All topics table */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">{isAr ? "جميع المواضيع" : "Tutti gli argomenti"}</h2>
          <span className="text-xs text-gray-400">{filtered.length} {isAr ? "موضوع" : "argomenti"}</span>
        </div>

        {/* Sort + filter */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <option value="accuracy">{isAr ? "الأقل دقة" : "Meno precisi"}</option>
            <option value="totalWrong">{isAr ? "الأكثر أخطاء" : "Più errori"}</option>
            <option value="totalSeen">{isAr ? "الأكثر تدريب" : "Più visti"}</option>
          </select>
          <select
            value={filterChapter ?? ""}
            onChange={(e) => setFilterChapter(e.target.value ? Number(e.target.value) : null)}
            className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <option value="">{isAr ? "جميع الفصول" : "Tutti i capitoli"}</option>
            {chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.number}. {isAr ? ch.nameAr : ch.nameIt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-lg font-medium mb-2">
            {isAr ? "لا توجد إحصائيات بعد" : "Nessuna statistica ancora"}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {isAr ? "ابدأ بالتدريب لرؤية تقدمك" : "Inizia a esercitarti per vedere i tuoi progressi"}
          </p>
          <Link href="/quiz" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium">
            {isAr ? "ابدأ اختبار" : "Fai un quiz"}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Link
              key={t.topicKey}
              href={`/topics/${t.topicKey}`}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{isAr ? t.titleAr : t.titleIt}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.totalSeen} {isAr ? "سؤال" : "dom"} · {t.totalCorrect}✓ {t.totalWrong}✗
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      t.accuracy >= 90 ? "bg-green-500" : t.accuracy >= 70 ? "bg-blue-500" : t.accuracy >= 50 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${t.accuracy}%` }}
                  />
                </div>
                <span className={`text-xs font-bold w-8 text-end ${
                  t.accuracy >= 90 ? "text-green-600" : t.accuracy >= 70 ? "text-blue-600" : "text-red-600"
                }`}>
                  {t.accuracy}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
