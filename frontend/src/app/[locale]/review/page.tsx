"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getReviewQuestions, getWeakQuestions, startPractice, type ReviewQuestion } from "@/lib/api";
import TTSButton from "@/components/TTSButton";

type Tab = "due" | "weak";

export default function ReviewPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [tab, setTab] = useState<Tab>("due");
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError(isAr ? "يجب تسجيل الدخول" : "Devi accedere per vedere le revisioni");
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetcher = tab === "due" ? getReviewQuestions : getWeakQuestions;
    fetcher(token, 30)
      .then(setQuestions)
      .catch(() => setError(isAr ? "خطأ في تحميل البيانات" : "Errore nel caricamento"))
      .finally(() => setLoading(false));
  }, [tab]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return <main className="flex-1 flex items-center justify-center"><p>{t("common.loading")}</p></main>;
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          {t("common.login")}
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-2">{isAr ? "المراجعة" : "Revisione"}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {isAr
          ? "أسئلة تحتاج مراجعة بناء على أدائك السابق"
          : "Domande da ripassare in base al tuo rendimento"}
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("due")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
            tab === "due"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          }`}
        >
          {isAr ? "موعد المراجعة" : "Da ripassare"}
          {tab === "due" && ` (${questions.length})`}
        </button>
        <button
          onClick={() => setTab("weak")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
            tab === "weak"
              ? "bg-orange-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          }`}
        >
          {isAr ? "نقاط الضعف" : "Punti deboli"}
          {tab === "weak" && ` (${questions.length})`}
        </button>
      </div>

      {/* Empty state */}
      {questions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">{tab === "due" ? "🎉" : "💪"}</p>
          <p className="text-lg font-medium mb-2">
            {tab === "due"
              ? isAr ? "لا توجد أسئلة للمراجعة الآن" : "Nessuna domanda da ripassare!"
              : isAr ? "لا توجد نقاط ضعف" : "Nessun punto debole!"}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {tab === "due"
              ? isAr ? "استمر في التدريب وستظهر هنا الأسئلة" : "Continua a esercitarti e le domande appariranno qui"
              : isAr ? "أنت بارع في كل شيء" : "Sei preparato su tutto"}
          </p>
          <Link href="/quiz" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium">
            {isAr ? "ابدأ اختبار" : "Fai un quiz"}
          </Link>
        </div>
      )}

      {/* Question list */}
      {questions.length > 0 && (
        <>
          {/* Start practice with these questions */}
          <Link
            href={`/quiz/exam?review=${tab}`}
            className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-medium mb-4 hover:bg-blue-700 transition"
          >
            {isAr
              ? `تدرب على ${Math.min(questions.length, 20)} سؤال`
              : `Esercitati su ${Math.min(questions.length, 20)} domande`}
          </Link>

          <div className="space-y-3">
            {questions.map((q) => {
              const isOpen = expanded.has(q.id);
              const errorRate = q.timesCorrect + q.timesWrong > 0
                ? Math.round((q.timesWrong / (q.timesCorrect + q.timesWrong)) * 100)
                : 0;

              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(q.id)}
                    className="w-full text-start p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {q.imageUrl && (
                          <img
                            src={q.imageUrl}
                            alt=""
                            className="h-12 rounded mb-2 border border-gray-200 dark:border-gray-700"
                          />
                        )}
                        <p className="text-sm font-medium line-clamp-2" dir="ltr">
                          {q.textIt}
                        </p>
                        <p className="text-sm text-gray-500 line-clamp-1 mt-1" dir="rtl">
                          {q.textAr}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          q.isTrue
                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                            : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                        }`}>
                          {q.isTrue ? t("common.true") : t("common.false")}
                        </span>
                        {tab === "weak" && (
                          <span className="text-xs text-red-500 font-medium">
                            {errorRate}% {isAr ? "خطأ" : "err"}
                          </span>
                        )}
                        {tab === "due" && q.interval > 0 && (
                          <span className="text-xs text-gray-400">
                            {q.interval}d
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-950">
                      <div className="flex items-center gap-2 mb-2">
                        <TTSButton text={q.textIt} lang="it" />
                        <span className="text-xs text-gray-400">{q.code}</span>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-4 text-xs text-gray-500 mb-3">
                        <span>✅ {q.timesCorrect}</span>
                        <span>❌ {q.timesWrong}</span>
                        <span>EF: {q.easeFactor.toFixed(1)}</span>
                        <span>Rep: {q.repetitions}</span>
                      </div>

                      {/* Explanation */}
                      {(q.explanationIt || q.explanationAr) && (
                        <div className="text-sm">
                          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t("common.explanation")}:
                          </p>
                          <p dir="ltr" className="text-gray-600 dark:text-gray-400 mb-1">
                            {q.explanationIt}
                          </p>
                          {q.explanationAr && (
                            <p dir="rtl" className="text-gray-500">
                              {q.explanationAr}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
