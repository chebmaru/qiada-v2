"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getToken, isLoggedIn } from "@/lib/auth";
import { isPushSupported, subscribeToPush, unsubscribeFromPush, isPushSubscribed } from "@/lib/push";
import { getProfile, updateProfile, type UserProfile } from "@/lib/api";
import { Link } from "@/i18n/navigation";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nameIt, setNameIt] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileMsg, setProfileMsg] = useState("");

  useEffect(() => {
    setPushSupported(isPushSupported());
    isPushSubscribed().then(setPushEnabled);

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
      setProfileMsg(isAr ? "تم الحفظ ✓" : "Salvato ✓");
    } catch (e: any) {
      setProfileMsg(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn()) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-gray-500 mb-4">{isAr ? "يجب تسجيل الدخول" : "Devi accedere"}</p>
        <Link href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          {tc("login")}
        </Link>
      </main>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>

      {/* Profile section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 mb-4">
        <h2 className="text-lg font-semibold mb-4">{isAr ? "الملف الشخصي" : "Profilo"}</h2>

        {profileLoading ? (
          <p className="text-sm text-gray-500">{tc("loading")}</p>
        ) : profile ? (
          <div className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{isAr ? "البريد الإلكتروني" : "Email"}</label>
              <p className="text-sm font-medium bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">{profile.email}</p>
            </div>

            {/* Name IT */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{isAr ? "الاسم (إيطالي)" : "Nome (italiano)"}</label>
              <input
                type="text"
                value={nameIt}
                onChange={(e) => setNameIt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                placeholder={isAr ? "أدخل اسمك" : "Inserisci il tuo nome"}
              />
            </div>

            {/* Name AR */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{isAr ? "الاسم (عربي)" : "Nome (arabo)"}</label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                dir="rtl"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                placeholder={isAr ? "أدخل اسمك بالعربية" : "Inserisci il tuo nome in arabo"}
              />
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{isAr ? "كلمة مرور جديدة" : "Nuova password"}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                placeholder={isAr ? "اتركه فارغا لعدم التغيير" : "Lascia vuoto per non cambiare"}
              />
            </div>

            {/* Subscription info */}
            {profile.subscription && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {isAr ? "الاشتراك نشط" : "Abbonamento attivo"}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {isAr ? "ينتهي" : "Scade"}: {new Date(profile.subscription.expiresAt).toLocaleDateString(locale)}
                </p>
              </div>
            )}

            {/* Save button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? "..." : isAr ? "حفظ" : "Salva"}
              </button>
              {profileMsg && (
                <span className={`text-sm ${profileMsg.includes("✓") ? "text-green-600" : "text-gray-500"}`}>
                  {profileMsg}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Push notifications section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-2">{t("pushNotifications")}</h2>
        <p className="text-sm text-gray-500 mb-4">{t("pushDescription")}</p>

        {!pushSupported ? (
          <p className="text-sm text-yellow-600">{t("pushUnsupported")}</p>
        ) : (
          <button
            onClick={handleTogglePush}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              pushEnabled
                ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300"
                : "bg-blue-600 text-white hover:bg-blue-700"
            } disabled:opacity-50`}
          >
            {loading ? "..." : pushEnabled ? t("pushDisable") : t("pushEnable")}
          </button>
        )}
      </div>
    </div>
  );
}
