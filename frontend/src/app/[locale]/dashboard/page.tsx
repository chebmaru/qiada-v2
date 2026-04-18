"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getDashboard, getChapterProgress, type DashboardStats, type ChapterProgress } from "@/lib/api";

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
    return <main className="flex-1 flex items-center justify-center"><p>{t("common.loading")}</p></main>;
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/quiz" className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          {isAr ? "ابدأ بدون حساب" : "Inizia senza account"}
        </Link>
      </main>
    );
  }

  if (!stats) return null;

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">{isAr ? "لوحة التقدم" : "I tuoi progressi"}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          label={isAr ? "أسئلة مجابة" : "Domande risposte"}
          value={stats.totalAnswered}
        />
        <StatCard
          label={isAr ? "الدقة" : "Precisione"}
          value={`${stats.accuracy}%`}
          color={stats.accuracy >= 80 ? "text-green-600" : stats.accuracy >= 60 ? "text-yellow-600" : "text-red-600"}
        />
        <StatCard
          label={isAr ? "اختبارات ناجحة" : "Esami superati"}
          value={`${stats.passedExams}/${stats.totalExams}`}
        />
        <StatCard
          label={isAr ? "سلسلة أيام" : "Streak"}
          value={`${stats.streak} ${isAr ? "يوم" : "gg"}`}
          color={stats.streak >= 3 ? "text-orange-500" : ""}
        />
      </div>

      {/* Average score */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-6 text-center">
        <p className="text-sm text-gray-500 mb-1">{isAr ? "متوسط النتيجة" : "Punteggio medio"}</p>
        <p className={`text-4xl font-bold ${stats.avgScore >= 90 ? "text-green-500" : stats.avgScore >= 75 ? "text-blue-500" : "text-yellow-500"}`}>
          {stats.avgScore}%
        </p>
      </div>

      {/* Chapter progress */}
      <h2 className="text-lg font-bold mb-3">{isAr ? "تقدم الفصول" : "Progresso capitoli"}</h2>
      <div className="space-y-2 mb-6">
        {chapters.map((ch) => (
          <div key={ch.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">
                {ch.number}. {isAr ? ch.nameAr : ch.nameIt}
              </span>
              <span className="text-xs text-gray-500">
                {ch.answeredCorrectly}/{ch.totalQuestions}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  ch.percentage >= 80 ? "bg-green-500" : ch.percentage >= 50 ? "bg-blue-500" : "bg-gray-400"
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
          <div className="flex gap-2 mb-6">
            {stats.recentActivity.map((day) => (
              <div key={day.date} className="flex-1 text-center">
                <div
                  className={`h-8 rounded ${
                    day.questionsAnswered > 20 ? "bg-green-500" : day.questionsAnswered > 0 ? "bg-green-300" : "bg-gray-200"
                  }`}
                />
                <span className="text-xs text-gray-500 mt-1 block">
                  {day.date.slice(-2)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
    </div>
  );
}
