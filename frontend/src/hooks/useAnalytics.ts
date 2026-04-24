"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const API_BASE = "/api";

function trackPageview(path: string) {
  try {
    const data = JSON.stringify({ path, referrer: document.referrer || null });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API_BASE}/analytics/pageview`, data);
    } else {
      fetch(`${API_BASE}/analytics/pageview`, {
        method: "POST",
        body: data,
        keepalive: true,
      }).catch(() => {});
    }
  } catch { /* ignore */ }
}

export function trackEvent(event: string, metadata?: Record<string, unknown>) {
  try {
    const path = typeof window !== "undefined" ? window.location.pathname : undefined;
    const data = JSON.stringify({ event, path, metadata });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API_BASE}/analytics/event`, data);
    } else {
      fetch(`${API_BASE}/analytics/event`, {
        method: "POST",
        body: data,
        keepalive: true,
      }).catch(() => {});
    }
  } catch { /* ignore */ }
}

export function usePageviewTracking() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageview(pathname);
  }, [pathname]);
}
