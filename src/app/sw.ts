import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("push", (event) => {
  const fallback = {
    title: "Memory Tree",
    body: "Bạn có kỷ niệm mới.",
    icon: "/icon-tree-192.png",
    badge: "/icon-tree-192.png",
    url: "/",
  };

  let payload = fallback;
  if (event.data) {
    try {
      payload = { ...fallback, ...event.data.json() };
    } catch {
      payload = fallback;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data as { url?: string } | undefined)?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client && client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});
