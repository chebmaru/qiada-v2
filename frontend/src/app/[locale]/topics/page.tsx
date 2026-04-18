"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getTopics, type Topic } from "@/lib/api";

export default function TopicsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopics()
      .then((data) => setTopics(data))
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
      <h1 className="text-2xl font-bold mb-6">{t("common.topics")}</h1>

      <div className="space-y-2">
        {topics.map((topic) => (
          <Link
            key={topic.id}
            href={`/topics/${topic.topicKey}`}
            className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium">
                  {isAr ? topic.titleAr : topic.titleIt}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {topic.questionCount} {t("common.questions")}
                </p>
              </div>
              {topic.imageUrl && (
                <img
                  src={topic.imageUrl}
                  alt=""
                  className="w-12 h-12 rounded object-cover ms-3"
                />
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
