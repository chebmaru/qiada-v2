"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getReviewQuestions, getWeakQuestions, startPractice, type ReviewQuestion } from "@/lib/api";
import TTSButton from "@/components/TTSButton";
import { SkeletonList } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import SignImage from "@/components/SignImage";

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
    return (
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="h-8 w-40 skeleton rounded mb-2" />
        <div className="h-5 w-64 skeleton rounded mb-4" />
        <div className="flex gap-2 mb-6">
          <div className="flex-1 h-10 skeleton rounded-xl" />
          <div className="flex-1 h-10 skeleton rounded-xl" />
        </div>
        <SkeletonList />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <EmptyState
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
          title={error}
        />
        <Link href="/login" className="btn-primary px-6 py-2.5 text-sm mt-4">
          {t("common.login")}
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold tracking-tight mb-2">{isAr ? "المراجعة" : "Revisione"}</h1>
      <p className="text-sm text-[var(--muted)] mb-4">
        {isAr
          ? "أسئلة تحتاج مراجعة بناء على أدائك السابق"
          : "Domande da ripassare in base al tuo rendimento"}
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("due")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
            tab === "due"
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25"
              : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)]"
          }`}
        >
          {isAr ? "موعد المراجعة" : "Da ripassare"}
          {tab === "due" && ` (${questions.length})`}
        </button>
        <button
          onClick={() => setTab("weak")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
            tab === "weak"
              ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25"
              : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)]"
          }`}
        >
          {isAr ? "نقاط الضعف" : "Punti deboli"}
          {tab === "weak" && ` (${questions.length})`}
        </button>
      </div>

      {/* Empty state */}
      {questions.length === 0 && (
        <EmptyState
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {tab === "due"
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              }
            </svg>
          }
          title={
            tab === "due"
              ? isAr ? "لا توجد أسئلة للمراجعة الآن" : "Nessuna domanda da ripassare!"
              : isAr ? "لا توجد نقاط ضعف" : "Nessun punto debole!"
          }
          description={
            tab === "due"
              ? isAr ? "استمر في التدريب وستظهر هنا الأسئلة" : "Continua a esercitarti e le domande appariranno qui"
              : isAr ? "أنت بارع في كل شيء" : "Sei preparato su tutto"
          }
          action={
            <Link href="/quiz" className="btn-primary px-6 py-2.5 text-sm">
              {isAr ? "ابدأ اختبار" : "Fai un quiz"}
            </Link>
          }
        />
      )}

      {/* Question list */}
      {questions.length > 0 && (
        <>
          <Link
            href={`/quiz/exam?review=${tab}`}
            className="btn-primary flex items-center justify-center gap-2 py-3 mb-4 text-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
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
                <div key={q.id} className="card overflow-hidden">
                  <button
                    onClick={() => toggleExpand(q.id)}
                    className="w-full text-start p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {q.imageUrl && (
                          <SignImage src={q.imageUrl} size="sm" className="rounded-lg mb-2 border border-[var(--card-border)]" />
                        )}
                        <p className="text-sm font-medium line-clamp-2" dir="ltr">
                          {q.textIt}
                        </p>
                        <p className="text-sm text-[var(--muted)] line-clamp-1 mt-1" dir="rtl">
                          {q.textAr}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          q.isTrue
                            ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                            : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                        }`}>
                          {q.isTrue ? t("common.true") : t("common.false")}
                        </span>
                        {tab === "weak" && (
                          <span className="text-xs text-red-500 font-medium">
                            {errorRate}% {isAr ? "خطأ" : "err"}
                          </span>
                        )}
                        {tab === "due" && q.interval > 0 && (
                          <span className="text-xs text-[var(--muted)]">
                            {q.interval}d
                          </span>
                        )}
                        <svg className={`w-4 h-4 text-[var(--muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-[var(--card-border)] px-4 py-3 bg-black/[0.02] dark:bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-2">
                        <TTSButton text={q.textIt} lang="it" />
                        <span className="text-xs text-[var(--muted)]">{q.code}</span>
                      </div>

                      <div className="flex gap-4 text-xs text-[var(--muted)] mb-3">
                        <span className="text-emerald-600">+{q.timesCorrect}</span>
                        <span className="text-red-500">-{q.timesWrong}</span>
                        <span>EF: {q.easeFactor.toFixed(1)}</span>
                        <span>Rep: {q.repetitions}</span>
                      </div>

                      {(q.explanationIt || q.explanationAr) && (
                        <div className="text-sm">
                          <p className="font-medium mb-1">
                            {t("common.explanation")}:
                          </p>
                          <p dir="ltr" className="text-[var(--muted)] mb-1">
                            {q.explanationIt}
                          </p>
                          {q.explanationAr && (
                            <p dir="rtl" className="text-[var(--muted)]">
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
