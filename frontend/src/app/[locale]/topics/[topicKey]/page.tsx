"use client";

import { useState, useEffect, use } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getTopics, getQuestions, getTricks, type Topic, type Question, type TopicTricks } from "@/lib/api";
import TTSButton from "@/components/TTSButton";
import { SkeletonCard, SkeletonLine } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import SignImage from "@/components/SignImage";

function formatTrickText(text: string): string[] {
  // Split on numbered patterns like "1)" "2)" etc.
  const numbered = text.split(/\d+\)\s*/);
  if (numbered.length > 2) {
    return numbered.filter((s) => s.trim()).map((s) => s.replace(/[.,]\s*$/, "").trim());
  }
  // Split on sentences ending with period followed by uppercase or keyword patterns
  const sentences = text.split(/\.\s+(?=[A-ZÈ])/).map((s) => s.replace(/\.$/, "").trim()).filter(Boolean);
  if (sentences.length >= 2) {
    return sentences;
  }
  // Split on commas that are outside parentheses (for "X (es. ...), Y (es. ...), Z" patterns)
  // Only if the text is long enough to warrant splitting
  if (text.length > 100) {
    const parts: string[] = [];
    let depth = 0;
    let current = "";
    for (const char of text) {
      if (char === "(") depth++;
      else if (char === ")") depth--;
      if (char === "," && depth === 0) {
        const trimmed = current.trim();
        if (trimmed) parts.push(trimmed);
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) parts.push(current.trim());
    // Only use comma-split if we get 3+ meaningful items (not tiny fragments)
    if (parts.length >= 3 && parts.every((p) => p.length > 15)) {
      // Check if first part contains intro pattern like "contengono/parlano di:"
      const colonIdx = parts[0].indexOf(":");
      if (colonIdx > 0 && colonIdx < parts[0].length - 5) {
        const intro = parts[0].substring(0, colonIdx + 1).trim();
        const firstItem = parts[0].substring(colonIdx + 1).trim();
        return [intro, firstItem, ...parts.slice(1)].filter(Boolean);
      }
      return parts;
    }
  }
  return [text];
}

function SvgViewer({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      {/* Inline preview — tap to expand */}
      <div className={`relative mb-6 ${loaded ? "" : "hidden"}`}>
        <img
          src={src}
          alt=""
          className="w-full rounded-lg cursor-pointer"
          onLoad={() => setLoaded(true)}
          onClick={() => setFullscreen(true)}
        />
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full pointer-events-none sm:hidden">
          Tap per ingrandire
        </div>
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-xl z-10"
            onClick={() => setFullscreen(false)}
          >
            ✕
          </button>
          <div className="w-full h-full overflow-auto" onClick={(e) => e.stopPropagation()}>
            <img
              src={src}
              alt=""
              className="min-w-[800px] max-w-none"
            />
          </div>
        </div>
      )}
    </>
  );
}

function TrickContent({ text, dir }: { text: string; dir?: string }) {
  const parts = formatTrickText(text);
  if (parts.length <= 1) {
    return <p className="text-sm leading-relaxed" dir={dir}>{text}</p>;
  }
  // First part might be intro (ends with ":"), rest are items
  const hasIntro = parts[0].endsWith(":");
  return (
    <div dir={dir}>
      {hasIntro && <p className="text-sm font-medium mb-1.5">{parts[0]}</p>}
      <ul className="space-y-1">
        {(hasIntro ? parts.slice(1) : parts).map((item, i) => (
          <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-40 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TopicDetailPage({ params }: { params: Promise<{ topicKey: string }> }) {
  const { topicKey } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topicLoading, setTopicLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState<Set<number>>(new Set());
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [tricks, setTricks] = useState<TopicTricks | null>(null);

  // Phase 1: load topic info fast (cached)
  useEffect(() => {
    getTopics().then((data) => {
      const found = data.find((t) => t.topicKey === topicKey);
      setTopic(found || null);
    }).finally(() => setTopicLoading(false));
  }, [topicKey]);

  // Phase 2: load questions + tricks in parallel (slower)
  useEffect(() => {
    Promise.all([
      getQuestions({ topicKey, limit: 100 }).then((data) => setQuestions(data.data)),
      fetch("/didattica/topic-signs.json")
        .then((r) => r.json())
        .then((map: Record<string, string>) => setSignUrl(map[topicKey] || null))
        .catch(() => {}),
      getTricks(topicKey).then(setTricks).catch(() => {}),
    ]).finally(() => setQuestionsLoading(false));
  }, [topicKey]);

  const loading = topicLoading;

  const toggleAnswer = (id: number) => {
    setShowAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showAllAnswers = () => {
    setShowAnswers(new Set(questions.map((q) => q.id)));
  };

  const hideAllAnswers = () => {
    setShowAnswers(new Set());
  };

  // Loading skeleton
  if (loading) {
    return (
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <SkeletonLine className="w-20 h-4 mb-4" />
        <SkeletonLine className="w-3/4 h-7 mb-6" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-6" />
        <SkeletonCard />
        <div className="mt-3"><SkeletonCard /></div>
        <div className="mt-3"><SkeletonCard /></div>
      </main>
    );
  }

  // Not found
  if (!topic) {
    return (
      <main className="flex-1">
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title={isAr ? "الموضوع غير موجود" : "Argomento non trovato"}
          description={isAr ? "هذا الموضوع غير موجود" : "L'argomento richiesto non esiste"}
          action={
            <Link href="/topics" className="btn-primary px-6 py-2.5 text-sm">
              {t("common.topics")}
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      {/* Back link */}
      <Link href="/topics" className="text-blue-600 text-sm mb-4 inline-flex items-center gap-1 hover:underline">
        <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t("common.back")}
      </Link>

      {/* Title */}
      <h1 className="text-2xl font-bold mb-1">{isAr ? topic.titleAr : topic.titleIt}</h1>
      <p className="text-sm text-gray-500 mb-6">{questions.length} {t("common.questions").toLowerCase()}</p>

      {/* 1. Didactic content */}
      {(isAr ? topic.contentAr : topic.contentIt) && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
              {isAr ? "محتوى تعليمي" : "Contenuto didattico"}
            </span>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {isAr ? topic.contentAr : topic.contentIt}
          </p>
        </div>
      )}

      {/* 2. Didactic SVG illustration — tap to open fullscreen on mobile */}
      <SvgViewer src={`/didattica/${topicKey}.svg`} />

      {/* 3. Sign photo */}
      {signUrl && (
        <div className="flex justify-center mb-6">
          <img src={signUrl} alt={isAr ? topic.titleAr : topic.titleIt} className="max-h-40 rounded-xl border border-[var(--card-border)] shadow-sm" />
        </div>
      )}

      {/* Tricks section */}
      {tricks && (tricks.truePatternsIT || tricks.falsePatternsIT || tricks.memoryRuleIT) && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
              {isAr ? "حيل" : "Trucchi"}
            </span>
          </div>

          <div className="space-y-3">
            {(isAr ? tricks.truePatternsAR : tricks.truePatternsIT) && (
              <div className="bg-green-100/50 dark:bg-green-900/30 rounded-lg p-3">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">{isAr ? "صحيح" : "VERO"}</p>
                <TrickContent text={(isAr ? tricks.truePatternsAR : tricks.truePatternsIT)!} dir={isAr ? "rtl" : "ltr"} />
              </div>
            )}

            {(isAr ? tricks.falsePatternsAR : tricks.falsePatternsIT) && (
              <div className="bg-red-100/50 dark:bg-red-900/30 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">{isAr ? "خطأ" : "FALSO"}</p>
                <TrickContent text={(isAr ? tricks.falsePatternsAR : tricks.falsePatternsIT)!} dir={isAr ? "rtl" : "ltr"} />
              </div>
            )}

            {(isAr ? tricks.memoryRuleAR : tricks.memoryRuleIT) && (
              <div className="bg-blue-100/50 dark:bg-blue-900/30 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">{isAr ? "قاعدة للتذكر" : "Regola da ricordare"}</p>
                <TrickContent text={(isAr ? tricks.memoryRuleAR : tricks.memoryRuleIT)!} dir={isAr ? "rtl" : "ltr"} />
              </div>
            )}

            {(isAr ? tricks.commonMistakeAR : tricks.commonMistakeIT) && (
              <div className="bg-orange-100/50 dark:bg-orange-900/30 rounded-lg p-3">
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">{isAr ? "خطأ شائع" : "Errore comune"}</p>
                <TrickContent text={(isAr ? tricks.commonMistakeAR : tricks.commonMistakeIT)!} dir={isAr ? "rtl" : "ltr"} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Practice button */}
      <Link
        href={`/quiz/exam?topic=${encodeURIComponent(topicKey)}`}
        className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl font-medium mb-6 hover:bg-blue-700 transition"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {isAr ? `تدرب على ${questions.length} سؤال` : `Esercitati su ${questions.length} domande`}
      </Link>

      {/* Questions list header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">
          {t("common.questions")} ({questions.length})
        </h2>
        <button
          onClick={showAnswers.size === questions.length ? hideAllAnswers : showAllAnswers}
          className="text-xs text-blue-600 hover:underline"
        >
          {showAnswers.size === questions.length
            ? (isAr ? "إخفاء الكل" : "Nascondi tutte")
            : (isAr ? "أظهر الكل" : "Mostra tutte")}
        </button>
      </div>

      {/* Questions */}
      {questionsLoading ? (
        <div className="space-y-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          title={isAr ? "لا توجد أسئلة" : "Nessuna domanda"}
          description={isAr ? "هذا الموضوع لا يحتوي على أسئلة بعد" : "Questo argomento non ha ancora domande"}
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs font-medium flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  {q.imageUrl && (
                    <SignImage src={q.imageUrl} size="md" className="rounded-lg mb-2 border border-gray-200 dark:border-gray-700" />
                  )}
                  <div className="flex items-start gap-1" dir="ltr">
                    <TTSButton text={q.textIt} lang="it" />
                    <p className="font-medium text-sm leading-relaxed">{q.textIt}</p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed" dir="rtl">{q.textAr}</p>

                  <button
                    onClick={() => toggleAnswer(q.id)}
                    className="text-xs text-blue-600 mt-2 hover:underline inline-flex items-center gap-1"
                  >
                    <svg className={`w-3 h-3 transition-transform ${showAnswers.has(q.id) ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    {showAnswers.has(q.id)
                      ? (isAr ? "إخفاء الإجابة" : "Nascondi")
                      : (isAr ? "أظهر الإجابة" : "Mostra risposta")}
                  </button>

                  {showAnswers.has(q.id) && (
                    <div className={`mt-2 p-3 rounded-lg text-sm ${
                      q.isTrue
                        ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
                    }`}>
                      <p className={`font-semibold text-xs ${q.isTrue ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                        {q.isTrue ? t("common.true") : t("common.false")}
                      </p>
                      {(isAr ? q.explanationAr : q.explanationIt) && (
                        <p className="mt-1 text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                          {isAr ? q.explanationAr : q.explanationIt}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
