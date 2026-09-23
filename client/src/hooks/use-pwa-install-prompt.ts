import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }

  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: "accepted" | "dismissed";
      platform: string;
    }>;
    prompt(): Promise<void>;
  }
}

const DISMISS_KEY = "kdpd_pwa_install_dismissed_at";
const INSTALLED_KEY = "kdpd_pwa_installed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export function usePwaInstallPrompt() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [installPromptOpen, setInstallPromptOpen] = useState(false);

  const clearPromptRef = useCallback(() => {
    deferredPromptRef.current = null;
  }, []);

  const handleDismiss = useCallback(() => {
    setInstallPromptOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleInstall = useCallback(async () => {
    const evt = deferredPromptRef.current;
    if (!evt) {
      setInstallPromptOpen(false);
      return;
    }
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === "accepted") {
        try {
          localStorage.setItem(INSTALLED_KEY, "1");
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore prompt errors
    } finally {
      clearPromptRef();
      setInstallPromptOpen(false);
    }
  }, [clearPromptRef]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;

    const isDismissedRecent = () => {
      try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (!raw) return false;
        const at = Number(raw);
        if (!Number.isFinite(at)) return false;
        return Date.now() - at < DISMISS_MS;
      } catch {
        return false;
      }
    };

    const isInstalledFlagged = () => {
      try {
        return localStorage.getItem(INSTALLED_KEY) === "1";
      } catch {
        return false;
      }
    };

    const onBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      if (!mounted) return;
      e.preventDefault();
      deferredPromptRef.current = e;
      try {
        if (window.matchMedia("(display-mode: standalone)").matches) return;
      } catch {
        // ignore
      }
      if (isInstalledFlagged()) return;
      if (isDismissedRecent()) return;
      setInstallPromptOpen(true);
    };

    const onAppInstalled = () => {
      if (!mounted) return;
      try {
        localStorage.setItem(INSTALLED_KEY, "1");
      } catch {
        // ignore
      }
      clearPromptRef();
      setInstallPromptOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      mounted = false;
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [clearPromptRef]);

  return {
    installPromptOpen,
    setInstallPromptOpen,
    canInstall: deferredPromptRef.current !== null,
    handleInstall,
    handleDismiss,
  };
}
