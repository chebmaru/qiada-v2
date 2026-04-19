"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getToken, isLoggedIn } from "@/lib/auth";
import { isPushSupported, subscribeToPush, unsubscribeFromPush, isPushSubscribed } from "@/lib/push";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPushSupported(isPushSupported());
    isPushSubscribed().then(setPushEnabled);
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

  if (!isLoggedIn()) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-500">{t("title")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>

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
