"use client";

import { useState, useEffect, use } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getTopics, getQuestions, getTricks, type Topic, type Question, type TopicTricks } from "@/lib/api";
import TTSButton from "@/components/TTSButton";

export default function TopicDetailPage({ params }: { params: Promise<{ topicKey: string }> }) {
  const { topicKey } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState<Set<number>>(new Set());
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [tricks, setTricks] = useState<TopicTricks | null>(null);

  useEffect(() => {
    Promise.all([
      getTopics().then((data) => {
        const found = data.find((t) => t.topicKey === topicKey);
        setTopic(found || null);
      }),
      getQuestions({ topicKey, limit: 100 }).then((data) => setQuestions(data.data)),
      fetch("/didattica/topic-signs.json")
        .then((r) => r.json())
        .then((map: Record<string, string>) => setSignUrl(map[topicKey] || null))
        .catch(() => {}),
      getTricks(topicKey).then(setTricks).catch(() => {}),
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

      {/* Topic sign */}
      {signUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={signUrl} alt="" className="h-24 mx-auto mb-4" />
      )}

      {/* Didactic illustration */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/didattica/${topicKey}.svg`}
        alt=""
        className="w-full rounded-lg mb-4 hidden"
        onLoad={(e) => (e.currentTarget.className = "w-full rounded-lg mb-4")}
      />

      {/* Didactic content */}
      {(isAr ? topic.contentAr : topic.contentIt) && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="whitespace-pre-line text-sm">
            {isAr ? topic.contentAr : topic.contentIt}
          </p>
        </div>
      )}

      {/* Tricks section */}
      {tricks && (tricks.truePatternsIT || tricks.falsePatternsIT || tricks.memoryRuleIT) && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-1">
            {isAr ? "حيل وأنماط" : "Trucchi e pattern"}
          </h2>

          {(isAr ? tricks.truePatternsAR : tricks.truePatternsIT) && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                {isAr ? "أنماط صحيح" : "Pattern VERO"}
              </p>
              <p className="text-sm whitespace-pre-line" dir={isAr ? "rtl" : "ltr"}>
                {isAr ? tricks.truePatternsAR : tricks.truePatternsIT}
              </p>
            </div>
          )}

          {(isAr ? tricks.falsePatternsAR : tricks.falsePatternsIT) && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                {isAr ? "أنماط خطأ" : "Pattern FALSO"}
              </p>
              <p className="text-sm whitespace-pre-line" dir={isAr ? "rtl" : "ltr"}>
                {isAr ? tricks.falsePatternsAR : tricks.falsePatternsIT}
              </p>
            </div>
          )}

          {(isAr ? tricks.memoryRuleAR : tricks.memoryRuleIT) && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                {isAr ? "قاعدة للتذكر" : "Regola da ricordare"}
              </p>
              <p className="text-sm" dir={isAr ? "rtl" : "ltr"}>
                {isAr ? tricks.memoryRuleAR : tricks.memoryRuleIT}
              </p>
            </div>
          )}

          {(isAr ? tricks.commonMistakeAR : tricks.commonMistakeIT) && (
            <div>
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">
                {isAr ? "خطأ شائع" : "Errore comune"}
              </p>
              <p className="text-sm" dir={isAr ? "rtl" : "ltr"}>
                {isAr ? tricks.commonMistakeAR : tricks.commonMistakeIT}
              </p>
            </div>
          )}
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
            <div className="flex items-start gap-1" dir="ltr">
              <TTSButton text={q.textIt} lang="it" />
              <p className="font-medium">{q.textIt}</p>
            </div>
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
