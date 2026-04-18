import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function QuizPage() {
  const t = useTranslations();

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-8">{t("quiz.title")}</h1>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link
          href="/quiz/exam"
          className="bg-blue-600 text-white py-4 px-6 rounded-xl text-lg font-medium hover:bg-blue-700 transition text-center"
        >
          {t("quiz.random")}
        </Link>

        <Link
          href="/chapters"
          className="bg-gray-200 dark:bg-gray-800 py-4 px-6 rounded-xl text-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition text-center"
        >
          {t("quiz.byChapter")}
        </Link>

        <Link
          href="/topics"
          className="bg-gray-200 dark:bg-gray-800 py-4 px-6 rounded-xl text-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition text-center"
        >
          {t("quiz.byTopic")}
        </Link>
      </div>
    </main>
  );
}
