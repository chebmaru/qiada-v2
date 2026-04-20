"use client";

import { useEffect, useState } from "react";
import { syncAllData, getLastSyncTime } from "@/lib/offline-db";

export default function OfflineSync() {
  const [isOffline, setIsOffline] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    setIsOffline(!navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Sync data when online
  useEffect(() => {
    if (isOffline) return;

    getLastSyncTime().then((lastSync) => {
      const stale = !lastSync || Date.now() - lastSync > 24 * 60 * 60 * 1000; // 24h
      if (stale) {
        syncAllData()
          .then(() => setSynced(true))
          .catch(() => {});
      }
    });
  }, [isOffline]);

  // Auto-hide synced toast
  useEffect(() => {
    if (!synced) return;
    const t = setTimeout(() => setSynced(false), 3000);
    return () => clearTimeout(t);
  }, [synced]);

  if (isOffline) {
    return (
      <div className="fixed top-14 md:top-14 left-0 right-0 z-50 bg-amber-500 text-white text-center text-sm py-1.5 font-medium">
        Offline — dati salvati localmente
      </div>
    );
  }

  if (synced) {
    return (
      <div className="fixed top-14 md:top-14 left-0 right-0 z-50 bg-emerald-500 text-white text-center text-sm py-1.5 font-medium animate-fadeIn">
        Dati sincronizzati per uso offline
      </div>
    );
  }

  return null;
}
