"use client";

import { useState, useEffect, use } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getTopics, getQuestions, type Topic, type Question } from "@/lib/api";

export default function TopicDetailPage({ params }: { params: Promise<{ topicKey: string }> }) {
  const { topicKey } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([
      getTopics().then((data) => {
        const found = data.find((t) => t.topicKey === topicKey);
        setTopic(found || null);
      }),
      getQuestions({ topicKey, limit: 100 }).then((data) => setQuestions(data.data)),
    ]).finally(() => setLoading(false));
  }, [topicKey]);

  const toggleAnswer = (id: number) => {
    setShowAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  if (!topic) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p>{t("common.error")}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <Link href="/topics" className="text-blue-600 text-sm mb-4 inline-block">
        ← {t("common.back")}
      </Link>

      <h1 className="text-2xl font-bold mb-2">
        {isAr ? topic.titleAr : topic.titleIt}
      </h1>

      {/* Didactic content */}
      {(isAr ? topic.contentAr : topic.contentIt) && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="whitespace-pre-line text-sm">
            {isAr ? topic.contentAr : topic.contentIt}
          </p>
        </div>
      )}

      {/* Practice button */}
      <Link
        href={`/quiz/exam?topic=${encodeURIComponent(topicKey)}`}
        className="block text-center bg-blue-600 text-white py-3 rounded-lg font-medium mb-6"
      >
        {isAr ? `تدرب على ${questions.length} سؤال` : `Esercitati su ${questions.length} domande`}
      </Link>

      {/* Questions list */}
      <h2 className="text-lg font-bold mb-3">
        {t("common.questions")} ({questions.length})
      </h2>

      <div className="space-y-3">
        {questions.map((q) => (
          <div
            key={q.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4"
          >
            {q.imageUrl && (
              <img src={q.imageUrl} alt="" className="max-h-32 rounded mb-2" />
            )}
            <p className="font-medium" dir="ltr">{q.textIt}</p>
            <p className="text-gray-600 dark:text-gray-400 mt-1" dir="rtl">{q.textAr}</p>

            <button
              onClick={() => toggleAnswer(q.id)}
              className="text-sm text-blue-600 mt-2"
            >
              {showAnswers.has(q.id)
                ? (isAr ? "إخفاء الإجابة" : "Nascondi risposta")
                : (isAr ? "أظهر الإجابة" : "Mostra risposta")}
            </button>

            {showAnswers.has(q.id) && (
              <div className={`mt-2 p-2 rounded text-sm ${q.isTrue ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}>
                <p className="font-medium">
                  {q.isTrue ? t("common.true") : t("common.false")}
                </p>
                {(isAr ? q.explanationAr : q.explanationIt) && (
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {isAr ? q.explanationAr : q.explanationIt}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
