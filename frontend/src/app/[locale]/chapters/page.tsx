"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getChapters, type Chapter } from "@/lib/api";

export default function ChaptersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChapters()
      .then(setChapters)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">
        {isAr ? "الفصول" : "Capitoli"}
      </h1>

      <div className="space-y-2">
        {chapters.map((ch) => (
          <Link
            key={ch.id}
            href={`/topics?chapter=${ch.id}`}
            className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                {ch.number}
              </span>
              <div>
                <h3 className="font-medium">
                  {isAr ? ch.nameAr : ch.nameIt}
                </h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
