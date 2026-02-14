self.addEventListener("push", (event) => {
  let data = {};
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
  const url = (event.notification && event.notification.data && event.notification.data.url) || "/";
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        try {
          if ("focus" in client) {
            await client.focus();
          }
          if ("navigate" in client) {
            await client.navigate(url);
          }
          return;
        } catch {}
      }
      await clients.openWindow(url);
    })(),
  );
});
