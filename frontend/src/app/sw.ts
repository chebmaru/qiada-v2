/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const apiCache: RuntimeCaching[] = [
  {
    matcher: ({ url }) => url.pathname.startsWith("/api/topics") || url.pathname.startsWith("/api/chapters") || url.pathname.startsWith("/api/glossary") || url.pathname.startsWith("/api/questions") || url.pathname.startsWith("/api/tricks") || url.pathname.startsWith("/api/keywords") || url.pathname.startsWith("/api/confusing-pairs"),
    handler: new StaleWhileRevalidate({
      cacheName: "api-data",
      plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 })],
    }),
  },
  {
    matcher: ({ url }) => url.pathname.startsWith("/signs/") || url.pathname.startsWith("/didattica/"),
    handler: new CacheFirst({
      cacheName: "sign-images",
      plugins: [new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...defaultCache, ...apiCache],
});

// Handle push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Qiada", {
      body: data.body ?? "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

// Handle notification click — open app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

serwist.addEventListeners();
