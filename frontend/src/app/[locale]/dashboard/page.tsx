"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getDashboard, getChapterProgress, getProfile, type DashboardStats, type ChapterProgress } from "@/lib/api";
import { SkeletonList, SkeletonCard } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import SubscriptionGate from "@/components/SubscriptionGate";

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chapters, setChapters] = useState<ChapterProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subDaysLeft, setSubDaysLeft] = useState<number | null>(null);
  const [subExpiresAt, setSubExpiresAt] = useState<string | null>(null);

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
      getProfile(token),
    ])
      .then(([dash, chaps, profile]) => {
        setStats(dash);
        setChapters(chaps);
        if (profile.subscription?.expiresAt) {
          const expires = new Date(profile.subscription.expiresAt);
          const now = new Date();
          const days = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (days <= 7 && days > 0) {
            setSubDaysLeft(days);
            setSubExpiresAt(profile.subscription.expiresAt);
          }
        }
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
    <SubscriptionGate>
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold tracking-tight mb-6">{isAr ? "لوحة التقدم" : "I tuoi progressi"}</h1>

      {/* Subscription expiry warning — only shown in last 7 days */}
      {subDaysLeft !== null && (
        <div className={`card p-4 mb-6 border ${subDaysLeft <= 2 ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30" : "border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${subDaysLeft <= 2 ? "bg-red-100 dark:bg-red-900 text-red-600" : "bg-amber-100 dark:bg-amber-900 text-amber-600"}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {isAr
                  ? `ينتهي اشتراكك خلال ${subDaysLeft} ${subDaysLeft === 1 ? "يوم" : "أيام"}`
                  : `Il tuo abbonamento scade tra ${subDaysLeft} giorn${subDaysLeft === 1 ? "o" : "i"}`}
              </p>
              {subExpiresAt && (
                <p className="text-xs text-[var(--muted)]">
                  {new Date(subExpiresAt).toLocaleString(isAr ? "ar" : "it", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              )}
            </div>
            <Link href="/activate" className="text-xs font-semibold text-gradient shrink-0">
              {isAr ? "تجديد" : "Rinnova"}
            </Link>
          </div>
        </div>
      )}

      {/* Virtual License Card */}
      <VirtualLicense stats={stats} isAr={isAr} />

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
                  <span className="text-[11px] text-[var(--muted)] mt-1 block">
                    {day.date.slice(-2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
    </SubscriptionGate>
  );
}

function VirtualLicense({ stats, isAr }: { stats: DashboardStats; isAr: boolean }) {
  // Calculate level based on questions answered + accuracy
  const coverage = Math.min(stats.uniqueQuestions / 6845, 1); // % of all questions seen
  const accuracyFactor = stats.accuracy / 100;
  const examFactor = stats.totalExams > 0 ? Math.min(stats.passedExams / stats.totalExams, 1) : 0;
  const score = Math.round((coverage * 40 + accuracyFactor * 40 + examFactor * 20));

  const level = score >= 90 ? 5 : score >= 70 ? 4 : score >= 50 ? 3 : score >= 25 ? 2 : 1;
  const stars = Array.from({ length: 5 }, (_, i) => i < level);

  const levelLabels = isAr
    ? ["مبتدئ", "طالب", "ممارس", "متقدم", "جاهز للامتحان"]
    : ["Principiante", "Studente", "Praticante", "Avanzato", "Pronto all'esame"];

  const levelColors = [
    "from-gray-400 to-gray-500",
    "from-blue-400 to-blue-600",
    "from-cyan-400 to-blue-500",
    "from-purple-400 to-indigo-600",
    "from-amber-400 to-yellow-500",
  ];

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${levelColors[level - 1]} p-[1px] mb-6`}>
      <div className="bg-gray-950/80 backdrop-blur-sm rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-1">
              {isAr ? "رخصة قيادة افتراضية" : "Patente Virtuale"}
            </p>
            <p className="text-lg font-bold text-white">{levelLabels[level - 1]}</p>
          </div>
          <div className="text-end">
            <p className="text-3xl font-black text-white">{score}</p>
            <p className="text-[11px] text-gray-400">/100</p>
          </div>
        </div>

        {/* Stars */}
        <div className="flex gap-1 mb-4">
          {stars.map((filled, i) => (
            <svg key={i} className={`w-5 h-5 ${filled ? "text-yellow-400" : "text-gray-700"}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>

        {/* Progress breakdown */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-gray-400">{isAr ? "التغطية" : "Copertura"}</p>
            <p className="text-sm font-bold text-white">{Math.round(coverage * 100)}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{isAr ? "الدقة" : "Precisione"}</p>
            <p className="text-sm font-bold text-white">{stats.accuracy}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{isAr ? "الاختبارات" : "Esami"}</p>
            <p className="text-sm font-bold text-white">{stats.passedExams}/{stats.totalExams}</p>
          </div>
        </div>

        {/* Streak badge */}
        {stats.streak > 0 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 bg-orange-500/20 rounded-full py-1 px-3">
            <span className="text-orange-400">🔥</span>
            <span className="text-xs font-medium text-orange-300">
              {stats.streak} {isAr ? "يوم متتالي" : "giorni consecutivi"}
            </span>
          </div>
        )}
      </div>
    </div>
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
