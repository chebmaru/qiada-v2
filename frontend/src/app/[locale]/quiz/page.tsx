import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function QuizPage() {
  const t = useTranslations();

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">{t("quiz.title")}</h1>

      <div className="space-y-3">
        {/* Exam simulation — primary CTA */}
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

        {/* By chapter */}
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

        {/* By topic */}
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
      </div>
    </main>
  );
}
