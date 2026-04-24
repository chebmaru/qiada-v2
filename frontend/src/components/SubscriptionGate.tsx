"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { SkeletonList } from "@/components/Skeleton";

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const sub = useSubscription();

  if (sub.loading) {
    return (
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <SkeletonList />
      </main>
    );
  }

  // Not logged in
  if (!sub.isLoggedIn) {
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

  // Logged in but no subscription (or expired)
  if (!sub.hasSubscription && !sub.isAdmin) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">
          {sub.subscriptionExpired
            ? (isAr ? "انتهت صلاحية الاشتراك" : "Abbonamento scaduto")
            : (isAr ? "تحتاج إلى كود تفعيل" : "Serve un codice di attivazione")}
        </h2>
        <p className="text-[var(--muted)] mb-6 max-w-xs">
          {isAr
            ? "أدخل كود التفعيل للوصول إلى جميع المحتويات"
            : "Inserisci il codice di attivazione per accedere a tutti i contenuti"}
        </p>
        <Link href="/activate" className="btn-primary px-6 py-2.5">
          {isAr ? "تفعيل الكود" : "Attiva codice"}
        </Link>
      </main>
    );
  }

  return <>{children}</>;
}
