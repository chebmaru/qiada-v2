"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { startExam, startPractice, submitQuiz, type QuizQuestion, type QuizResult } from "@/lib/api";
import TTSButton from "@/components/TTSButton";
import { SkeletonQuizCard } from "@/components/Skeleton";
import SignImage from "@/components/SignImage";

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
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (phase !== "active" || isPractice) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft, isPractice]);

  // Clean up feedback timer
  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const handleAnswer = (answer: boolean) => {
    const q = questions[current];
    // In exam mode (or already answered in practice), just record
    if (!isPractice || answers.has(q.id)) {
      setAnswers((prev) => new Map(prev).set(q.id, answer));
      return;
    }

    // Practice mode: instant feedback
    setAnswers((prev) => new Map(prev).set(q.id, answer));
    const isCorrect = q.isTrue === answer;
    setFeedback(isCorrect ? "correct" : "wrong");
    setShowExplanation(!isCorrect);

    // Clear feedback after delay, auto-advance if correct
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      setFeedback(null);
      if (isCorrect && current < questions.length - 1) {
        setCurrent((c) => c + 1);
        setShowExplanation(false);
      }
    }, isCorrect ? 800 : 2500);
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

  const goToQuestion = (i: number) => {
    setFeedback(null);
    setShowExplanation(false);
    setCurrent(i);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const q = questions[current];

  // Practice mode: get button style based on answer correctness
  const getPracticeButtonStyle = (btnValue: boolean) => {
    const userAnswer = q ? answers.get(q.id) : undefined;
    const hasAnswered = userAnswer !== undefined;

    if (!isPractice || !hasAnswered || q?.isTrue === undefined) {
      // Exam mode or unanswered: normal blue selection
      return userAnswer === btnValue
        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]"
        : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700";
    }

    // Practice mode with answer: show correct/wrong
    if (btnValue === q.isTrue) {
      // This is the correct answer button
      return "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]";
    }
    if (userAnswer === btnValue && btnValue !== q.isTrue) {
      // User clicked this and it's wrong
      return "bg-red-500 text-white shadow-lg shadow-red-500/25 scale-[1.02]";
    }
    // Unselected button
    return "bg-gray-100 dark:bg-gray-800 opacity-50";
  };

  // Navigation dot color for practice mode
  const getDotStyle = (i: number) => {
    if (i === current) return "bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700";
    if (!answers.has(questions[i].id)) return "bg-gray-200 dark:bg-gray-700 text-gray-500";

    if (isPractice && questions[i].isTrue !== undefined) {
      const userAns = answers.get(questions[i].id);
      const correct = userAns === questions[i].isTrue;
      return correct
        ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200"
        : "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200";
    }

    return "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200";
  };

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary px-6 py-2.5">
            {t("common.retry")}
          </button>
        </div>
      </main>
    );
  }

  // LOADING — skeleton
  if (phase === "loading") {
    return (
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="h-12 mb-4" />
        <SkeletonQuizCard />
      </main>
    );
  }

  // RESULT PHASE
  if (phase === "result" && result) {
    const pct = result.score;
    const passed = result.passed;

    return (
      <main className="flex-1 flex flex-col items-center p-6">
        <div className="w-full max-w-lg text-center">
          {/* Score circle */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
              <circle
                cx="60" cy="60" r="54" fill="none" strokeWidth="8"
                strokeDasharray={`${(pct / 100) * 339.3} 339.3`}
                strokeLinecap="round"
                className={passed ? "text-emerald-500" : "text-red-500"}
                stroke="currentColor"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-bold ${passed ? "text-emerald-600" : "text-red-600"}`}>
                {pct}%
              </span>
            </div>
          </div>

          <h2 className={`text-2xl font-bold mb-2 ${passed ? "text-emerald-600" : "text-red-600"}`}>
            {passed ? t("quiz.passed") : t("quiz.failed")}
          </h2>
          <p className="text-[var(--muted)] mb-8">
            {result.correctCount}/{result.totalQuestions} — {result.wrongCount}{" "}
            {isAr ? "أخطاء" : "errori"} ({isAr ? "الحد الأقصى" : "max"} {result.maxErrorsToPass})
          </p>

          {/* Review wrong answers */}
          {result.details.filter((d) => !d.isCorrect).length > 0 && (
            <div className="text-start space-y-3 mb-8">
              <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">
                {t("quiz.reviewErrors")}
              </h3>
              {result.details
                .filter((d) => !d.isCorrect)
                .map((d) => {
                  const question = questions.find((q) => q.id === d.questionId);
                  return (
                    <div key={d.questionId} className="card p-4 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30">
                      <p className="font-medium mb-1 text-sm">
                        {isAr ? question?.textAr : question?.textIt}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {isAr ? "إجابتك" : "La tua risposta"}: {d.userAnswer === null ? "—" : d.userAnswer ? t("common.true") : t("common.false")}
                        {" → "}
                        {d.correctAnswer ? t("common.true") : t("common.false")}
                      </p>
                      {(isAr ? d.explanationAr : d.explanationIt) && (
                        <p className="text-xs text-[var(--muted)] mt-2">
                          {isAr ? d.explanationAr : d.explanationIt}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-6 py-3"
            >
              {isAr ? "اختبار جديد" : "Nuovo quiz"}
            </button>
            <button
              onClick={() => router.push("/quiz")}
              className="bg-[var(--card)] border border-[var(--card-border)] px-6 py-3 rounded-xl font-medium hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {t("common.back")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ACTIVE QUIZ PHASE
  const hasAnsweredCurrent = q ? answers.has(q.id) : false;
  const currentIsCorrect = isPractice && q && hasAnsweredCurrent && q.isTrue !== undefined
    ? answers.get(q.id) === q.isTrue
    : null;

  return (
    <main className="flex-1 flex flex-col">
      {/* Header: timer + progress */}
      <div className="sticky top-0 glass border-b border-[var(--card-border)] px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <span className={`font-mono text-lg font-bold ${timeLeft > 0 && timeLeft < 300 ? "text-red-500 animate-pulse" : ""}`}>
            {timeLeft > 0 ? formatTime(timeLeft) : (
              <span className="text-sm text-[var(--muted)]">{isAr ? "بدون وقت" : "Libero"}</span>
            )}
          </span>

          {/* Practice mode: live score */}
          {isPractice && answers.size > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-600 font-bold">
                {questions.filter((q, i) => answers.has(q.id) && answers.get(q.id) === q.isTrue).length}
              </span>
              <span className="text-[var(--muted)]">/</span>
              <span className="text-red-500 font-bold">
                {questions.filter((q, i) => answers.has(q.id) && answers.get(q.id) !== q.isTrue).length}
              </span>
            </div>
          )}

          <span className="text-sm font-medium text-[var(--muted)]">
            {current + 1} / {questions.length}
          </span>
          <button
            onClick={handleSubmit}
            disabled={phase === "submitting"}
            className="bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {phase === "submitting" ? t("common.loading") : isAr ? "تسليم" : "Consegna"}
          </button>
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${(answers.size / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      {q && (
        <div className={`flex-1 flex flex-col max-w-2xl mx-auto w-full p-4 ${
          feedback === "correct" ? "animate-correct" : feedback === "wrong" ? "animate-wrong" : ""
        }`}>
          <div className="flex-1 flex flex-col justify-center">
            {q.imageUrl && (
              <div className="flex justify-center mb-4">
                <SignImage src={q.imageUrl} size="lg" className="rounded-xl border border-[var(--card-border)] shadow-sm" />
              </div>
            )}

            <div className="flex items-start gap-2 mb-2" dir="ltr">
              <TTSButton text={q.textIt} lang="it" />
              <p className="text-lg font-medium leading-relaxed">{q.textIt}</p>
            </div>
            <p className="text-lg font-medium mb-6 text-[var(--muted)] leading-relaxed" dir="rtl">
              {q.textAr}
            </p>

            {/* V/F buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => handleAnswer(true)}
                disabled={isPractice && hasAnsweredCurrent}
                className={`flex-1 py-4 rounded-xl text-xl font-bold transition-all duration-200 disabled:cursor-default ${getPracticeButtonStyle(true)}`}
              >
                {t("common.true")}
              </button>
              <button
                onClick={() => handleAnswer(false)}
                disabled={isPractice && hasAnsweredCurrent}
                className={`flex-1 py-4 rounded-xl text-xl font-bold transition-all duration-200 disabled:cursor-default ${getPracticeButtonStyle(false)}`}
              >
                {t("common.false")}
              </button>
            </div>

            {/* Practice feedback: explanation on wrong answer */}
            {isPractice && hasAnsweredCurrent && showExplanation && (
              <div className="mt-4 card p-4 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {isAr ? "إجابة خاطئة" : "Risposta sbagliata"} — {isAr ? "الصحيح" : "Corretto"}: {q.isTrue ? t("common.true") : t("common.false")}
                  </span>
                </div>
                {(isAr ? q.explanationAr : q.explanationIt) && (
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {isAr ? q.explanationAr : q.explanationIt}
                  </p>
                )}
                <button
                  onClick={() => {
                    setShowExplanation(false);
                    setFeedback(null);
                    if (current < questions.length - 1) setCurrent((c) => c + 1);
                  }}
                  className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {isAr ? "السؤال التالي →" : "Prossima domanda →"}
                </button>
              </div>
            )}

            {/* Practice feedback: correct checkmark */}
            {isPractice && hasAnsweredCurrent && currentIsCorrect && feedback === "correct" && (
              <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">{isAr ? "صحيح!" : "Corretto!"}</span>
              </div>
            )}
          </div>

          {/* Navigation dots */}
          <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => goToQuestion(i)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition ${getDotStyle(i)}`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Prev/Next */}
          <div className="flex justify-between mt-4 mb-2">
            <button
              onClick={() => goToQuestion(Math.max(0, current - 1))}
              disabled={current === 0}
              className="px-6 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--card-border)] disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5 transition font-medium"
            >
              {t("common.back")}
            </button>
            <button
              onClick={() => goToQuestion(Math.min(questions.length - 1, current + 1))}
              disabled={current === questions.length - 1}
              className="px-6 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--card-border)] disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5 transition font-medium"
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
