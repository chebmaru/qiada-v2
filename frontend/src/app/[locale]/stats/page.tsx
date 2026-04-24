"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getTopicStats, getChapterProgress, getDashboard, type TopicStat, type ChapterProgress, type DashboardStats } from "@/lib/api";
import { SkeletonList, SkeletonCard } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import SubscriptionGate from "@/components/SubscriptionGate";

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
    return (
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="h-8 w-40 skeleton rounded mb-2" />
        <div className="h-5 w-60 skeleton rounded mb-6" />
        <div className="grid grid-cols-3 gap-3 mb-6">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <SkeletonList />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <EmptyState
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
          title={error}
        />
        <Link href="/login" className="btn-primary px-6 py-2.5 text-sm mt-4">{t("common.login")}</Link>
      </main>
    );
  }

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
    <SubscriptionGate>
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold tracking-tight mb-2">{isAr ? "الإحصائيات" : "Statistiche"}</h1>
      <p className="text-sm text-[var(--muted)] mb-6">
        {isAr ? "تحليل مفصل لأدائك" : "Analisi dettagliata del tuo rendimento"}
      </p>

      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card p-3 text-center">
            <p className="text-xs text-[var(--muted)]">{isAr ? "أسئلة فريدة" : "Domande viste"}</p>
            <p className="text-xl font-bold">{stats.uniqueQuestions}</p>
            <p className="text-xs text-[var(--muted)]">/6845</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xs text-[var(--muted)]">{isAr ? "الدقة" : "Precisione"}</p>
            <p className={`text-xl font-bold ${stats.accuracy >= 80 ? "text-emerald-600" : stats.accuracy >= 60 ? "text-amber-600" : "text-red-500"}`}>
              {stats.accuracy}%
            </p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xs text-[var(--muted)]">{isAr ? "نقاط ضعف" : "Punti deboli"}</p>
            <p className="text-xl font-bold text-red-500">{weakTopics.length}</p>
          </div>
        </div>
      )}

      {/* Prediction */}
      {stats && stats.totalExams >= 3 && (
        <div className={`card p-4 mb-6 text-center ${
          stats.avgScore >= 83
            ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
            : "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30"
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
          <h2 className="text-sm font-bold text-emerald-600 mb-2">
            {isAr ? `نقاط القوة (${strongTopics.length})` : `Punti forti (${strongTopics.length})`}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {strongTopics.slice(0, 10).map((t) => (
              <span key={t.topicKey} className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full font-medium">
                {isAr ? t.titleAr : t.titleIt} {t.accuracy}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-red-500 mb-2">
            {isAr ? `نقاط الضعف (${weakTopics.length})` : `Punti deboli (${weakTopics.length})`}
          </h2>
          <div className="space-y-2">
            {weakTopics.map((t) => (
              <Link
                key={t.topicKey}
                href={`/topics/${t.topicKey}`}
                className="card flex items-center justify-between p-3 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30"
              >
                <span className="text-sm font-medium">{isAr ? t.titleAr : t.titleIt}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-red-500 font-bold">{t.accuracy}%</span>
                  <span className="text-[var(--muted)]">{t.totalWrong} err</span>
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
          <span className="text-xs text-[var(--muted)]">{filtered.length} {isAr ? "موضوع" : "argomenti"}</span>
        </div>

        {/* Sort + filter */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="text-xs px-3 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="accuracy">{isAr ? "الأقل دقة" : "Meno precisi"}</option>
            <option value="totalWrong">{isAr ? "الأكثر أخطاء" : "Più errori"}</option>
            <option value="totalSeen">{isAr ? "الأكثر تدريب" : "Più visti"}</option>
          </select>
          <select
            value={filterChapter ?? ""}
            onChange={(e) => setFilterChapter(e.target.value ? Number(e.target.value) : null)}
            className="text-xs px-3 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
        <EmptyState
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
          title={isAr ? "لا توجد إحصائيات بعد" : "Nessuna statistica ancora"}
          description={isAr ? "ابدأ بالتدريب لرؤية تقدمك" : "Inizia a esercitarti per vedere i tuoi progressi"}
          action={
            <Link href="/quiz" className="btn-primary px-6 py-2.5 text-sm">
              {isAr ? "ابدأ اختبار" : "Fai un quiz"}
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Link
              key={t.topicKey}
              href={`/topics/${t.topicKey}`}
              className="card flex items-center justify-between p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{isAr ? t.titleAr : t.titleIt}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {t.totalSeen} {isAr ? "سؤال" : "dom"} · <span className="text-emerald-600">{t.totalCorrect}</span> · <span className="text-red-500">{t.totalWrong}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      t.accuracy >= 90 ? "bg-emerald-500" : t.accuracy >= 70 ? "bg-blue-500" : t.accuracy >= 50 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${t.accuracy}%` }}
                  />
                </div>
                <span className={`text-xs font-bold w-8 text-end ${
                  t.accuracy >= 90 ? "text-emerald-600" : t.accuracy >= 70 ? "text-blue-600" : "text-red-500"
                }`}>
                  {t.accuracy}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
    </SubscriptionGate>
  );
}
