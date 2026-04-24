"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSubscription } from "@/hooks/useSubscription";

export default function QuizPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const sub = useSubscription();

  const canAccess = sub.loading || sub.hasSubscription || sub.isAdmin;

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">{t("quiz.title")}</h1>

      <div className="space-y-3">
        {/* Demo — always visible, free */}
        <Link
          href="/quiz/exam?demo=1"
          className="flex items-center gap-4 p-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition"
        >
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold">{isAr ? "جرب الآن" : "Prova ora"}</p>
            <p className="text-sm text-emerald-100">{isAr ? "5 أسئلة عشوائية بدون تسجيل" : "5 domande casuali senza registrazione"}</p>
          </div>
        </Link>

        {/* Exam simulation — gated */}
        {canAccess ? (
          <Link
            href="/quiz/exam"
            className="flex items-center gap-4 p-5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold">{t("quiz.random")}</p>
              <p className="text-sm text-blue-100">{t("home.examSimulationDesc")}</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-4 p-5 rounded-xl bg-gray-200 dark:bg-gray-800 opacity-60 relative">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold">{t("quiz.random")}</p>
              <p className="text-sm text-gray-500">{isAr ? "يتطلب اشتراك فعال" : "Richiede abbonamento attivo"}</p>
            </div>
          </div>
        )}

        {/* By chapter — gated */}
        {canAccess ? (
          <Link
            href="/chapters"
            className="flex items-center gap-4 p-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold">{t("quiz.byChapter")}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">25 {t("common.chapter").toLowerCase()}</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-4 p-5 rounded-xl bg-gray-200 dark:bg-gray-800 opacity-60">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold">{t("quiz.byChapter")}</p>
              <p className="text-sm text-gray-500">{isAr ? "يتطلب اشتراك فعال" : "Richiede abbonamento attivo"}</p>
            </div>
          </div>
        )}

        {/* By topic — gated */}
        {canAccess ? (
          <Link
            href="/topics"
            className="flex items-center gap-4 p-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold">{t("quiz.byTopic")}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">393 {t("common.topics").toLowerCase()}</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-4 p-5 rounded-xl bg-gray-200 dark:bg-gray-800 opacity-60">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold">{t("quiz.byTopic")}</p>
              <p className="text-sm text-gray-500">{isAr ? "يتطلب اشتراك فعال" : "Richiede abbonamento attivo"}</p>
            </div>
          </div>
        )}

        {/* CTA to activate/register if not subscribed */}
        {!sub.loading && !canAccess && (
          <div className="text-center pt-4">
            <Link
              href={sub.isLoggedIn ? "/activate" : "/register"}
              className="text-sm font-semibold text-gradient hover:underline"
            >
              {sub.isLoggedIn
                ? (isAr ? "أدخل كود التفعيل" : "Inserisci il codice di attivazione")
                : (isAr ? "سجل الآن واحصل على كود" : "Registrati e attiva il tuo codice")}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
