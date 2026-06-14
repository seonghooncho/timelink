const CACHE_NAME = "timelink-static-v3";
const APP_SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest", "/applogo.png"];

const hasControlCharacter = (value) => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
};

const isSafeInternalPath = (value) => {
  if (!value || typeof value !== "string") return false;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (hasControlCharacter(path)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return false;
  return true;
};

const resolveNotificationTarget = (data) => {
  if (isSafeInternalPath(data?.url)) return data.url.trim();
  const targetType = typeof data?.targetType === "string" ? data.targetType.trim().toUpperCase() : "";
  const targetId = typeof data?.targetId === "string" ? data.targetId.trim() : "";

  if (targetType && targetId) {
    const id = encodeURIComponent(targetId);
    if (targetType === "GROUP_JOIN_REQUEST") return `/groups/${id}?panel=joinRequests`;
    if (targetType === "GROUP") return `/groups/${id}`;
    if (targetType === "COMMUNITY_POST" || targetType === "POST") return `/community/posts/${id}`;
    if (targetType === "SCHEDULE") return "/calendar";
  }

  return "/notifications";
};

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
      targetType: data.targetType,
      targetId: data.targetId,
      notificationId: data.notificationId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = resolveNotificationTarget(event.notification.data);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          return client.navigate(targetUrl).then((nextClient) => (nextClient || client).focus());
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
