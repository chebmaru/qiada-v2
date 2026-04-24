"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getToken, isLoggedIn } from "@/lib/auth";
import { isPushSupported, subscribeToPush, unsubscribeFromPush, isPushSubscribed } from "@/lib/push";
import { downloadAllForOffline, getOfflineQuestionCount } from "@/lib/offline-db";
import { getProfile, updateProfile, type UserProfile } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import EmptyState from "@/components/EmptyState";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nameIt, setNameIt] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileMsg, setProfileMsg] = useState("");
  const [offlineCount, setOfflineCount] = useState(0);
  const [dlProgress, setDlProgress] = useState<string | null>(null);
  const [dlPct, setDlPct] = useState(0);

  useEffect(() => {
    setPushSupported(isPushSupported());
    isPushSubscribed().then(setPushEnabled);
    getOfflineQuestionCount().then(setOfflineCount);

    const token = getToken();
    if (token) {
      getProfile(token)
        .then((p) => {
          setProfile(p);
          setNameIt(p.nameIt || "");
          setNameAr(p.nameAr || "");
        })
        .catch(() => {})
        .finally(() => setProfileLoading(false));
    } else {
      setProfileLoading(false);
    }
  }, []);

  const handleTogglePush = async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(token);
        setPushEnabled(false);
      } else {
        const ok = await subscribeToPush(token);
        setPushEnabled(ok);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    const token = getToken();
    if (!token) return;

    setProfileMsg("");
    setLoading(true);
    try {
      const data: { nameIt?: string; nameAr?: string; password?: string } = {};
      if (nameIt !== (profile?.nameIt || "")) data.nameIt = nameIt;
      if (nameAr !== (profile?.nameAr || "")) data.nameAr = nameAr;
      if (newPassword) data.password = newPassword;

      if (Object.keys(data).length === 0) {
        setProfileMsg(isAr ? "لا تغييرات" : "Nessuna modifica");
        setLoading(false);
        return;
      }

      const res = await updateProfile(token, data);
      setProfile((prev) => prev ? { ...prev, ...res.user } : prev);
      setNewPassword("");
      setProfileMsg(isAr ? "تم الحفظ" : "Salvato");
    } catch (e: any) {
      setProfileMsg(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn()) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <EmptyState
          icon={
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
          title={isAr ? "يجب تسجيل الدخول" : "Devi accedere"}
        />
        <Link href="/login" className="btn-primary px-6 py-2.5 text-sm mt-4">
          {tc("login")}
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold tracking-tight mb-6">{t("title")}</h1>

      {/* Profile section */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">{isAr ? "الملف الشخصي" : "Profilo"}</h2>
        </div>

        {profileLoading ? (
          <div className="space-y-3">
            <div className="h-10 skeleton rounded-xl" />
            <div className="h-10 skeleton rounded-xl" />
            <div className="h-10 skeleton rounded-xl" />
          </div>
        ) : profile ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">{isAr ? "البريد الإلكتروني" : "Email"}</label>
              <p className="text-sm font-medium bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2.5 rounded-xl">{profile.email}</p>
            </div>

            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">{isAr ? "الاسم (إيطالي)" : "Nome (italiano)"}</label>
              <input
                type="text"
                value={nameIt}
                onChange={(e) => setNameIt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                placeholder={isAr ? "أدخل اسمك" : "Inserisci il tuo nome"}
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">{isAr ? "الاسم (عربي)" : "Nome (arabo)"}</label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                dir="rtl"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                placeholder={isAr ? "أدخل اسمك بالعربية" : "Inserisci il tuo nome in arabo"}
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">{isAr ? "كلمة مرور جديدة" : "Nuova password"}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                placeholder={isAr ? "اتركه فارغا لعدم التغيير" : "Lascia vuoto per non cambiare"}
              />
            </div>

            {profile.subscription && (
              <div className="card p-3 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
                <p className="text-sm font-medium text-gradient">
                  {isAr ? "الاشتراك نشط" : "Abbonamento attivo"}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {isAr ? "ينتهي" : "Scade"}: {new Date(profile.subscription.expiresAt).toLocaleDateString(locale)}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
              >
                {loading ? "..." : isAr ? "حفظ" : "Salva"}
              </button>
              {profileMsg && (
                <span className={`text-sm font-medium ${profileMsg.includes("Salvato") || profileMsg.includes("تم") ? "text-emerald-600" : "text-[var(--muted)]"}`}>
                  {profileMsg}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Push notifications section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">{t("pushNotifications")}</h2>
        </div>
        <p className="text-sm text-[var(--muted)] mb-4">{t("pushDescription")}</p>

        {!pushSupported ? (
          <p className="text-sm text-amber-600">{t("pushUnsupported")}</p>
        ) : (
          <button
            onClick={handleTogglePush}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${
              pushEnabled
                ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300"
                : "btn-primary"
            } disabled:opacity-50`}
          >
            {loading ? "..." : pushEnabled ? t("pushDisable") : t("pushEnable")}
          </button>
        )}
      </div>

      {/* Offline download section */}
      <div className="card p-6 mt-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">{isAr ? "الاستخدام بدون انترنت" : "Uso offline"}</h2>
        </div>
        <p className="text-sm text-[var(--muted)] mb-3">
          {isAr
            ? "حمل جميع الأسئلة للدراسة بدون انترنت. يفضل استخدام WiFi."
            : "Scarica tutte le domande per studiare senza internet. Consigliato il WiFi."}
        </p>

        {offlineCount > 0 && (
          <p className="text-xs text-emerald-600 font-medium mb-3">
            {isAr ? `${offlineCount} سؤال محفوظ محليا` : `${offlineCount} domande salvate localmente`}
          </p>
        )}

        {dlProgress && (
          <div className="mb-3">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${dlPct}%` }} />
            </div>
            <p className="text-xs text-[var(--muted)]">{dlProgress}</p>
          </div>
        )}

        <button
          onClick={async () => {
            setDlProgress("...");
            setDlPct(0);
            try {
              const result = await downloadAllForOffline((step, pct) => {
                setDlProgress(step);
                setDlPct(pct);
              });
              setOfflineCount(result.questions);
              setDlProgress(null);
            } catch {
              setDlProgress(isAr ? "خطأ في التحميل" : "Errore nel download");
              setTimeout(() => setDlProgress(null), 3000);
            }
          }}
          disabled={!!dlProgress}
          className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {dlProgress ? "..." : offlineCount > 0
            ? (isAr ? "تحديث البيانات" : "Aggiorna dati")
            : (isAr ? "حمل الكل" : "Scarica tutto")}
        </button>
      </div>
    </main>
  );
}
