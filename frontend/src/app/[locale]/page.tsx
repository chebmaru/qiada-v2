"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { getDashboard, type DashboardStats } from "@/lib/api";

const DailyGoal = lazy(() => import("@/components/DailyGoal"));

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getDashboard(token).then(setStats).catch(() => {});
    }
  }, []);

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      {/* Hero */}
      <div className="text-center pt-10 pb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient mb-2">
          {t("common.appName")}
        </h1>
        <p className="text-[var(--muted)] text-sm">{t("home.subtitle")}</p>
      </div>

      {/* Progress banner */}
      {stats && (
        <Link
          href="/dashboard"
          className="card block mb-6 p-4 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gradient">
              {t("home.continueStudy")}
            </span>
            <svg className="w-4 h-4 text-[var(--muted)] rtl:rotate-180 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="flex gap-6 text-sm">
            <span className="text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">{stats.totalAnswered}</strong> {t("home.questionsAnswered")}
            </span>
            <span className="text-[var(--muted)]">
              <strong className={stats.accuracy >= 80 ? "text-emerald-600" : stats.accuracy >= 60 ? "text-amber-600" : "text-red-500"}>
                {stats.accuracy}%
              </strong> {t("home.accuracy")}
            </span>
          </div>
        </Link>
      )}

      {/* Daily goal — only for logged in users */}
      {stats && (
        <Suspense fallback={<div className="h-20 skeleton rounded-xl mb-4" />}>
          <DailyGoal />
        </Suspense>
      )}

      {/* Demo CTA — for non-logged users */}
      {!stats && (
        <Link
          href="/quiz/exam?demo=1"
          className="flex items-center gap-4 p-4 mb-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition"
        >
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <p className="font-bold">{isAr ? "جرب الآن — 5 أسئلة" : "Prova ora — 5 domande"}</p>
            <p className="text-xs text-emerald-100">{isAr ? "بدون تسجيل" : "Senza registrazione"}</p>
          </div>
        </Link>
      )}

      {/* Primary CTA */}
      <Link
        href="/quiz/exam"
        className="btn-primary flex items-center justify-center gap-3 py-4 px-6 mb-4 text-center"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-start">
          <p className="text-base font-bold">{t("home.examSimulation")}</p>
          <p className="text-xs text-white/70">{t("home.examSimulationDesc")}</p>
        </div>
      </Link>

      {/* Action cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <ActionCard
          href="/quiz"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
          title={t("home.startQuiz")}
          gradient="from-blue-500 to-cyan-500"
        />
        <ActionCard
          href="/topics"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          title={t("common.topics")}
          gradient="from-purple-500 to-pink-500"
        />
        <ActionCard
          href="/tricks"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
          title={t("common.tricks")}
          gradient="from-amber-500 to-orange-500"
        />
      </div>

      {/* Feature strip */}
      <div className="flex items-center justify-center gap-4 text-xs text-[var(--muted)] mb-6">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t("home.feature1")}</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {t("home.feature2")}</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> {t("home.feature3")}</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {t("home.feature4")}</span>
      </div>

      {/* Glossary */}
      <Link
        href="/glossary"
        className="card flex items-center justify-between p-4 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold">{t("common.glossary")}</p>
            <p className="text-xs text-[var(--muted)]">{t("home.glossaryDesc")}</p>
          </div>
        </div>
        <svg className="w-4 h-4 text-[var(--muted)] rtl:rotate-180 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </main>
  );
}

function ActionCard({
  href,
  icon,
  title,
  gradient,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  gradient: string;
}) {
  return (
    <Link href={href} className="card flex flex-col items-center gap-2.5 p-4 text-center">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm`}>
        {icon}
      </div>
      <span className="text-xs font-semibold">{title}</span>
    </Link>
  );
}
