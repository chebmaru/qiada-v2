"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getDashboard, getChapterProgress, type DashboardStats, type ChapterProgress } from "@/lib/api";
import { SkeletonList, SkeletonCard } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chapters, setChapters] = useState<ChapterProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError(isAr ? "يجب تسجيل الدخول" : "Devi accedere");
      setLoading(false);
      return;
    }

    Promise.all([
      getDashboard(token),
      getChapterProgress(token),
    ])
      .then(([dash, chaps]) => {
        setStats(dash);
        setChapters(chaps);
      })
      .catch(() => setError(isAr ? "خطأ في تحميل البيانات" : "Errore nel caricamento"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="h-8 w-48 skeleton rounded mb-6" />
        <div className="grid grid-cols-2 gap-3 mb-6">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          title={error}
        />
        <Link href="/quiz" className="btn-primary px-6 py-2.5 text-sm mt-4">
          {isAr ? "ابدأ بدون حساب" : "Inizia senza account"}
        </Link>
      </main>
    );
  }

  if (!stats) return null;

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold tracking-tight mb-6">{isAr ? "لوحة التقدم" : "I tuoi progressi"}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          label={isAr ? "أسئلة مجابة" : "Domande risposte"}
          value={stats.totalAnswered}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          label={isAr ? "الدقة" : "Precisione"}
          value={`${stats.accuracy}%`}
          color={stats.accuracy >= 80 ? "text-emerald-600" : stats.accuracy >= 60 ? "text-amber-600" : "text-red-500"}
          gradient="from-emerald-500 to-teal-500"
        />
        <StatCard
          label={isAr ? "اختبارات ناجحة" : "Esami superati"}
          value={`${stats.passedExams}/${stats.totalExams}`}
          gradient="from-purple-500 to-pink-500"
        />
        <StatCard
          label={isAr ? "سلسلة أيام" : "Streak"}
          value={`${stats.streak} ${isAr ? "يوم" : "gg"}`}
          color={stats.streak >= 3 ? "text-orange-500" : ""}
          gradient="from-amber-500 to-orange-500"
        />
      </div>

      {/* Average score */}
      <div className="card p-5 mb-6 text-center">
        <p className="text-sm text-[var(--muted)] mb-1">{isAr ? "متوسط النتيجة" : "Punteggio medio"}</p>
        <p className={`text-4xl font-bold ${stats.avgScore >= 90 ? "text-emerald-500" : stats.avgScore >= 75 ? "text-blue-500" : "text-amber-500"}`}>
          {stats.avgScore}%
        </p>
      </div>

      {/* Chapter progress */}
      <h2 className="text-lg font-bold mb-3">{isAr ? "تقدم الفصول" : "Progresso capitoli"}</h2>
      <div className="space-y-2 mb-6">
        {chapters.map((ch) => (
          <div key={ch.id} className="card p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-medium">
                {ch.number}. {isAr ? ch.nameAr : ch.nameIt}
              </span>
              <span className="text-xs text-[var(--muted)]">
                {ch.answeredCorrectly}/{ch.totalQuestions}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  ch.percentage >= 80 ? "bg-emerald-500" : ch.percentage >= 50 ? "bg-blue-500" : "bg-gray-400"
                }`}
                style={{ width: `${ch.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      {stats.recentActivity.length > 0 && (
        <>
          <h2 className="text-lg font-bold mb-3">{isAr ? "النشاط الأخير" : "Attività recente"}</h2>
          <div className="card p-4 mb-6">
            <div className="flex gap-1.5">
              {stats.recentActivity.map((day) => (
                <div key={day.date} className="flex-1 text-center">
                  <div
                    className={`h-8 rounded-lg transition-colors ${
                      day.questionsAnswered > 20 ? "bg-emerald-500" : day.questionsAnswered > 0 ? "bg-emerald-300 dark:bg-emerald-700" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                  <span className="text-[10px] text-[var(--muted)] mt-1 block">
                    {day.date.slice(-2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function StatCard({ label, value, color, gradient }: { label: string; value: string | number; color?: string; gradient: string }) {
  return (
    <div className="card p-4 text-center">
      <div className={`w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center opacity-80`}>
        <span className="text-white text-xs font-bold">#</span>
      </div>
      <p className="text-xs text-[var(--muted)] mb-0.5">{label}</p>
      <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
    </div>
  );
}
