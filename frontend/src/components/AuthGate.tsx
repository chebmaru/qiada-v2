"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getToken } from "@/lib/auth";
import { SkeletonList } from "@/components/Skeleton";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getToken());
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <SkeletonList />
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">
          {isAr ? "يجب تسجيل الدخول" : "Accedi per continuare"}
        </h2>
        <p className="text-[var(--muted)] mb-6 max-w-xs">
          {isAr
            ? "سجل الدخول أو أنشئ حساب جديد للوصول إلى هذا المحتوى"
            : "Accedi o registrati per accedere a questo contenuto"}
        </p>
        <div className="flex gap-3">
          <Link href="/login" className="btn-primary px-6 py-2.5">
            {isAr ? "تسجيل الدخول" : "Accedi"}
          </Link>
          <Link href="/register" className="px-6 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition">
            {isAr ? "حساب جديد" : "Registrati"}
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
