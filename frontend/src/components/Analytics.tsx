"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Lightweight page view tracker.
 * Sends a beacon to the backend on each navigation.
 * Backend can log these to a table or file.
 *
 * To use Plausible instead, replace the body with:
 *   <script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js" />
 * and add it to the <head> in layout.tsx instead.
 */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Fire-and-forget beacon — no blocking, no error handling needed
    try {
      const data = JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        ts: Date.now(),
      });
      navigator.sendBeacon("/api/analytics/pageview", data);
    } catch {
      // Silent fail — analytics should never break the app
    }
  }, [pathname]);

  return null;
}
