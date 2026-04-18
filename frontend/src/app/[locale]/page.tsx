import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HomePage() {
  const t = useTranslations();

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-bold mb-4">{t("common.appName")}</h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-md">
        {t("home.subtitle")}
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link
          href="/quiz"
          className="bg-blue-600 text-white py-3 px-6 rounded-lg text-lg font-medium hover:bg-blue-700 transition"
        >
          {t("home.startQuiz")}
        </Link>

        <Link
          href="/topics"
          className="bg-gray-200 dark:bg-gray-800 py-3 px-6 rounded-lg text-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition"
        >
          {t("home.studyTopics")}
        </Link>
      </div>

      <div className="mt-12 flex gap-4">
        <Link href="/" locale="ar" className="text-sm text-gray-500 hover:text-gray-700">
          العربية
        </Link>
        <span className="text-gray-300">|</span>
        <Link href="/" locale="it" className="text-sm text-gray-500 hover:text-gray-700">
          Italiano
        </Link>
      </div>
    </main>
  );
}
