"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { activateCode } from "@/lib/api";
import { getToken, isLoggedIn } from "@/lib/auth";
import { Link } from "@/i18n/navigation";

export default function ActivatePage() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAr = locale === "ar";
  const reason = searchParams.get("reason");

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ expiresAt: string; durationMinutes: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const token = getToken();
    if (!token) {
      setError(isAr ? "يجب تسجيل الدخول أولاً" : "Devi accedere prima");
      setLoading(false);
      return;
    }

    try {
      const result = await activateCode(token, code.trim());
      setSuccess({ expiresAt: result.expiresAt, durationMinutes: result.durationMinutes });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 1440) {
      const days = Math.round(minutes / 1440);
      return isAr ? `${days} يوم` : `${days} giorni`;
    }
    if (minutes >= 60) {
      const hours = Math.round(minutes / 60);
      return isAr ? `${hours} ساعة` : `${hours} ore`;
    }
    return isAr ? `${minutes} دقيقة` : `${minutes} minuti`;
  };

  if (!isLoggedIn()) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold mb-4">
          {isAr ? "يجب تسجيل الدخول أولاً" : "Devi accedere prima"}
        </h2>
        <div className="flex gap-3">
          <Link href="/login" className="btn-primary px-6 py-2.5">
            {isAr ? "تسجيل الدخول" : "Accedi"}
          </Link>
          <Link href="/register" className="px-6 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)] font-medium">
            {isAr ? "حساب جديد" : "Registrati"}
          </Link>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">
          {isAr ? "تم التفعيل بنجاح!" : "Codice attivato!"}
        </h2>
        <p className="text-[var(--muted)] mb-2">
          {isAr ? "مدة الاشتراك:" : "Durata:"} {formatDuration(success.durationMinutes)}
        </p>
        <p className="text-sm text-[var(--muted)] mb-6">
          {isAr ? "ينتهي:" : "Scade:"} {new Date(success.expiresAt).toLocaleString(isAr ? "ar" : "it")}
        </p>
        <button onClick={() => router.push("/quiz")} className="btn-primary px-6 py-2.5">
          {isAr ? "ابدأ التدريب" : "Inizia a studiare"}
        </button>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Reason banner */}
        {reason === "expired" && (
          <div className="card p-4 mb-6 border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-center">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              {isAr ? "انتهت صلاحية اشتراكك" : "Il tuo abbonamento è scaduto"}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              {isAr ? "أدخل كود جديد لتجديد الاشتراك" : "Inserisci un nuovo codice per rinnovare"}
            </p>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gradient">
            {isAr ? "تفعيل كود الوصول" : "Attiva codice di accesso"}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-2">
            {isAr
              ? "أدخل الكود المقدم من المسؤول لتفعيل اشتراكك"
              : "Inserisci il codice fornito dall'amministratore"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={isAr ? "أدخل الكود هنا" : "Inserisci il codice"}
              required
              minLength={10}
              className="w-full px-4 py-3 border border-[var(--card-border)] rounded-xl bg-[var(--card)] text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition uppercase"
              dir="ltr"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.trim().length < 10}
            className="w-full btn-primary py-3 disabled:opacity-50"
          >
            {loading ? "..." : (isAr ? "تفعيل" : "Attiva")}
          </button>
        </form>
      </div>
    </main>
  );
}
