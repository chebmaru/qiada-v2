"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { startExam, startPractice, submitQuiz, type QuizQuestion, type QuizResult } from "@/lib/api";

type Phase = "loading" | "active" | "submitting" | "result";

export default function ExamPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAr = locale === "ar";

  const topicKey = searchParams.get("topic") || undefined;
  const chapterId = searchParams.get("chapter") ? Number(searchParams.get("chapter")) : undefined;
  const isPractice = !!(topicKey || chapterId);

  const [phase, setPhase] = useState<Phase>("loading");
  const [attemptId, setAttemptId] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Map<number, boolean>>(new Map());
  const [timeLeft, setTimeLeft] = useState(1800);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");

  // Start exam or practice on mount
  useEffect(() => {
    const start = isPractice
      ? startPractice({ topicKey, chapterId, count: 20 })
      : startExam();

    start
      .then((data) => {
        setAttemptId(data.attemptId);
        setQuestions(data.questions);
        setTimeLeft(data.timeLimitSeconds || 0);
        setPhase("active");
      })
      .catch((e) => setError(e.message));
  }, []);

  // Timer (only for exam mode)
  useEffect(() => {
    if (phase !== "active" || isPractice) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft, isPractice]);

  const handleAnswer = (answer: boolean) => {
    setAnswers((prev) => new Map(prev).set(questions[current].id, answer));
  };

  const handleSubmit = useCallback(async () => {
    if (phase !== "active") return;
    setPhase("submitting");
    try {
      const answerArray = questions.map((q) => ({
        questionId: q.id,
        answer: answers.get(q.id) ?? false,
      }));
      const res = await submitQuiz(attemptId, answerArray);
      setResult(res);
      setPhase("result");
    } catch (e: any) {
      setError(e.message);
      setPhase("active");
    }
  }, [phase, questions, answers, attemptId]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const q = questions[current];

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg">
            {t("common.retry")}
          </button>
        </div>
      </main>
    );
  }

  if (phase === "loading") {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-xl">{t("common.loading")}</p>
      </main>
    );
  }

  // RESULT PHASE
  if (phase === "result" && result) {
    return (
      <main className="flex-1 flex flex-col items-center p-6">
        <div className="w-full max-w-lg text-center">
          <div className={`text-6xl font-bold mb-4 ${result.passed ? "text-green-500" : "text-red-500"}`}>
            {result.score}%
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${result.passed ? "text-green-600" : "text-red-600"}`}>
            {result.passed ? t("quiz.passed") : t("quiz.failed")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {result.correctCount}/{result.totalQuestions} — {result.wrongCount}{" "}
            {isAr ? "أخطاء" : "errori"} ({isAr ? "الحد الأقصى" : "max"} {result.maxErrorsToPass})
          </p>

          {/* Review wrong answers */}
          <div className="text-start space-y-4 mb-8">
            {result.details
              .filter((d) => !d.isCorrect)
              .map((d) => {
                const question = questions.find((q) => q.id === d.questionId);
                return (
                  <div key={d.questionId} className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="font-medium mb-1">
                      {isAr ? question?.textAr : question?.textIt}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {isAr ? "إجابتك" : "La tua risposta"}: {d.userAnswer === null ? "—" : d.userAnswer ? t("common.true") : t("common.false")}
                      {" → "}
                      {d.correctAnswer ? t("common.true") : t("common.false")}
                    </p>
                    {(isAr ? d.explanationAr : d.explanationIt) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {isAr ? d.explanationAr : d.explanationIt}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
            >
              {isAr ? "اختبار جديد" : "Nuovo quiz"}
            </button>
            <button
              onClick={() => router.push("/quiz")}
              className="bg-gray-200 dark:bg-gray-800 px-6 py-3 rounded-lg font-medium"
            >
              {t("common.back")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ACTIVE QUIZ PHASE
  return (
    <main className="flex-1 flex flex-col">
      {/* Header: timer + progress */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <span className={`font-mono text-lg font-bold ${timeLeft < 300 ? "text-red-500" : ""}`}>
            {formatTime(timeLeft)}
          </span>
          <span className="text-sm text-gray-500">
            {current + 1} / {questions.length}
          </span>
          <button
            onClick={handleSubmit}
            disabled={phase === "submitting"}
            className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {phase === "submitting" ? t("common.loading") : isAr ? "تسليم" : "Consegna"}
          </button>
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(answers.size / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      {q && (
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4">
          <div className="flex-1 flex flex-col justify-center">
            {q.imageUrl && (
              <div className="flex justify-center mb-4">
                <img
                  src={q.imageUrl}
                  alt=""
                  className="max-h-48 rounded-lg border border-gray-200 dark:border-gray-700"
                />
              </div>
            )}

            <p className="text-lg font-medium mb-2" dir="ltr">
              {q.textIt}
            </p>
            <p className="text-lg font-medium mb-6 text-gray-600 dark:text-gray-400" dir="rtl">
              {q.textAr}
            </p>

            {/* V/F buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => handleAnswer(true)}
                className={`flex-1 py-4 rounded-xl text-xl font-bold transition ${
                  answers.get(q.id) === true
                    ? "bg-blue-600 text-white ring-2 ring-blue-400"
                    : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {t("common.true")}
              </button>
              <button
                onClick={() => handleAnswer(false)}
                className={`flex-1 py-4 rounded-xl text-xl font-bold transition ${
                  answers.get(q.id) === false
                    ? "bg-blue-600 text-white ring-2 ring-blue-400"
                    : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {t("common.false")}
              </button>
            </div>
          </div>

          {/* Navigation dots */}
          <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition ${
                  i === current
                    ? "bg-blue-600 text-white"
                    : answers.has(questions[i].id)
                    ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Prev/Next */}
          <div className="flex justify-between mt-4 mb-2">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 disabled:opacity-30"
            >
              {t("common.back")}
            </button>
            <button
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              disabled={current === questions.length - 1}
              className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 disabled:opacity-30"
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
