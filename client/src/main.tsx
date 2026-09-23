import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) {
      setupPush(registration).catch(() => {});
    }
  },
});

createRoot(document.getElementById("root")!).render(<App />);

async function setupPush(registration: ServiceWorkerRegistration) {
  try {
    const permission = Notification.permission;
    if (permission !== "granted") return;
    const existing = await registration.pushManager.getSubscription();
    if (existing) return;
    const res = await fetch("/api/push/public-key", { credentials: "include" });
    if (!res.ok) return;
    const { publicKey } = await res.json();
    if (!publicKey) return;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: (() => {
        const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
        const base64 = (publicKey + padding)
          .replace(/-/g, "+")
          .replace(/_/g, "/");
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      })(),
    });
    const json = sub.toJSON() as any;
    const p256dh: string | undefined = json?.keys?.p256dh;
    const auth: string | undefined = json?.keys?.auth;
    if (!p256dh || !auth) return;
    const body = { endpoint: sub.endpoint, keys: { p256dh, auth } };
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch {}
}
