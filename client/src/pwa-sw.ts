/// <reference lib="WebWorker" />

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string }> | undefined;
};

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { StaleWhileRevalidate, NetworkFirst } from "workbox-strategies";
import { registerRoute, NavigationRoute, setCatchHandler } from "workbox-routing";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { clientsClaim, setCacheNameDetails } from "workbox-core";

setCacheNameDetails({
  prefix: "kdpd",
  suffix: "v1",
  precache: "precache",
  runtime: "runtime",
  googleAnalytics: "ga",
});

clientsClaim();
self.addEventListener("install", (_event) => {
  void self.skipWaiting();
});

cleanupOutdatedCaches();

try {
  const manifest = (self.__WB_MANIFEST || [])
    .map((entry) => (typeof entry === "string" ? { url: entry, revision: null } : entry))
    .filter((entry) => !/\.map$/.test(entry.url));
  precacheAndRoute(manifest, {
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
    directoryIndex: "index.html",
    cleanURLs: true,
  });
} catch {
  /* ignore */
}

try {
  const handler = createHandlerBoundToURL("/index.html");
  const navigationRoute = new NavigationRoute(handler, {
    allowlist: [/^(?!\/api\/).*/],
    denylist: [/\/api\//, /^\/__/, /\.[a-zA-Z0-9]+$/],
  });
  registerRoute(navigationRoute);
  setCatchHandler(async ({ request }) => {
    if (request && request.mode === "navigate") {
      try {
        return caches.match("/index.html") as Promise<Response>;
      } catch {
        return Response.error();
      }
    }
    return Response.error();
  });
} catch {
  /* ignore */
}

registerRoute(
  ({ request }) => {
    try {
      if (!request || !request.url) return false;
      const u = new URL(request.url);
      if (!u) return false;
      if (u.origin !== location.origin) return false;
      if (u.pathname.startsWith("/api/")) return false;
      if (u.pathname.startsWith("/__")) return false;
      if (request.mode === "navigate") return false;
      return true;
    } catch {
      return false;
    }
  },
  new StaleWhileRevalidate({
    cacheName: "kdpd-static",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) => {
    try {
      if (!url) return false;
      return /^https:\/\/fonts\.(googleapis|gstatic)\.com\/$/.test(url.origin + "/") ||
        url.origin.endsWith("fonts.googleapis.com") ||
        url.origin.endsWith("fonts.gstatic.com");
    } catch {
      return false;
    }
  },
  new StaleWhileRevalidate({
    cacheName: "kdpd-google-fonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 180,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

registerRoute(
  ({ request, sameOrigin }) => {
    try {
      if (!request || !request.url) return false;
      if (!sameOrigin) return false;
      const u = new URL(request.url);
      return u.pathname.startsWith("/api/");
    } catch {
      return false;
    }
  },
  new NetworkFirst({
    cacheName: "kdpd-api-network-first",
    networkTimeoutSeconds: 6,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 120,
        maxAgeSeconds: 60 * 60 * 24 * 2,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

self.addEventListener("push", (event) => {
  let data: Record<string, any> = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Thông báo";
  const body = data.body || "";
  const tag = data.tag || undefined;
  const payload = data.data || {};
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: payload,
      icon: "/favicon.png",
      badge: "/favicon.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const url =
    (event.notification && event.notification.data && event.notification.data.url) || "/";
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const clientItem of clientList) {
        try {
          if ("focus" in clientItem) {
            await clientItem.focus();
          }
          if ("navigate" in clientItem) {
            await clientItem.navigate(url);
          }
          return;
        } catch {
          /* ignore */
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

export {};
