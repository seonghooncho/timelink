const CACHE_NAME = "timelink-static-v2";
const APP_SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest", "/applogo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "Timelink",
    body: "새 알림이 도착했습니다.",
    url: "/notifications",
  };

  let data = fallback;
  try {
    data = event.data ? event.data.json() : fallback;
  } catch {
    data = fallback;
  }
  const title = data.title || fallback.title;
  const options = {
    body: data.body || fallback.body,
    icon: "/applogo.png",
    badge: "/applogo.png",
    data: {
      url: data.url || fallback.url,
      notificationId: data.notificationId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
