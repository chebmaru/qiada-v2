"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getDashboard, type DashboardStats } from "@/lib/api";

const DAILY_TARGET = 20;
const STORAGE_KEY = "qiada_daily_goal";

interface DailyState {
  date: string;
  answered: number;
  milestone: number; // last milestone shown
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getSavedState(): DailyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as DailyState;
      if (state.date === getToday()) return state;
    }
  } catch {}
  return { date: getToday(), answered: 0, milestone: 0 };
}

export default function DailyGoal() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [state, setState] = useState<DailyState | null>(null);
  const [showMilestone, setShowMilestone] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setState(getSavedState());
      return;
    }

    getDashboard(token)
      .then((stats) => {
        const today = getToday();
        const todayActivity = stats.recentActivity.find(
          (a) => a.date === today
        );
        const answered = todayActivity?.questionsAnswered || 0;
        const saved = getSavedState();

        const newState: DailyState = {
          date: today,
          answered,
          milestone: saved.milestone,
        };

        // Check milestones
        if (answered >= DAILY_TARGET && saved.milestone < DAILY_TARGET) {
          newState.milestone = DAILY_TARGET;
          setShowMilestone(
            isAr ? "هدف اليوم مكتمل!" : "Obiettivo giornaliero raggiunto!"
          );
          setTimeout(() => setShowMilestone(""), 4000);
        } else if (answered >= 10 && saved.milestone < 10) {
          newState.milestone = 10;
          setShowMilestone(
            isAr ? "نصف الطريق! استمر!" : "A metà strada! Continua!"
          );
          setTimeout(() => setShowMilestone(""), 3000);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        setState(newState);
      })
      .catch(() => {
        setState(getSavedState());
      });
  }, []);

  if (!state) return null;

  const pct = Math.min(Math.round((state.answered / DAILY_TARGET) * 100), 100);
  const completed = state.answered >= DAILY_TARGET;

  return (
    <>
      {/* Milestone toast */}
      {showMilestone && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-lg text-sm font-semibold animate-[fadeIn_0.3s_ease-out]">
          {showMilestone}
        </div>
      )}

      {/* Daily goal card */}
      <div className={`card p-4 mb-4 ${completed ? "border-emerald-300 dark:border-emerald-800" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">
            {isAr ? "هدف اليوم" : "Obiettivo giornaliero"}
          </span>
          <span className={`text-xs font-bold ${completed ? "text-emerald-600" : "text-[var(--muted)]"}`}>
            {state.answered}/{DAILY_TARGET}
          </span>
        </div>
        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completed
                ? "bg-emerald-500"
                : pct >= 50
                  ? "bg-blue-500"
                  : "bg-blue-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {completed ? (
          <p className="text-xs text-emerald-600 font-medium">
            {isAr ? "ممتاز! أكملت هدف اليوم" : "Ottimo! Obiettivo completato"}
          </p>
        ) : (
          <Link
            href="/quiz/exam"
            className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            {isAr
              ? `${DAILY_TARGET - state.answered} سؤال متبقي — ابدأ الآن`
              : `Mancano ${DAILY_TARGET - state.answered} domande — inizia ora`}
          </Link>
        )}
      </div>
    </>
  );
}
