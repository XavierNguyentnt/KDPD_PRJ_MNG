import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

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

export interface PwaInstallBlocker {
  code: "NOT_SECURE_CONTEXT" | "NO_DEFERRABLE_PROMPT" | "STANDALONE_ALREADY";
  message: string;
}

export function usePwaInstallPrompt() {
  const { toast } = useToast();
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [installPromptOpen, setInstallPromptOpen] = useState(false);
  const [blocker, setBlocker] = useState<PwaInstallBlocker | null>(null);

  const clearPromptRef = useCallback(() => {
    deferredPromptRef.current = null;
  }, []);

  const computeBlocker = useCallback((): PwaInstallBlocker | null => {
    if (typeof window === "undefined") return null;
    try {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        return { code: "STANDALONE_ALREADY", message: "Ứng dụng đang chạy ở chế độ Standalone (đã cài)." };
      }
    } catch {
      /* ignore */
    }
    const isSecure =
      window.isSecureContext ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "::1" ||
      location.protocol === "https:";
    if (!isSecure) {
      return {
        code: "NOT_SECURE_CONTEXT",
        message:
          "Cần kết nối HTTPS hoặc localhost để trình duyệt cho phép cài ứng dụng (PWA yêu cầu Secure Context).",
      };
    }
    if (!deferredPromptRef.current) {
      return {
        code: "NO_DEFERRABLE_PROMPT",
        message:
          "Trình duyệt chưa sẵn sàng cài (chưa tải xong Service Worker / Manifest hoặc đã cài rồi). Kiểm tra DevTools → Application → Installability.",
      };
    }
    return null;
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
      const b = computeBlocker();
      setBlocker(b);
      if (b) {
        toast({
          variant: "destructive",
          title: b.code === "NOT_SECURE_CONTEXT" ? "Cần HTTPS để cài ứng dụng" : "Chưa thể cài đặt",
          description: b.message,
        });
      }
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
  }, [clearPromptRef, computeBlocker, toast]);

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
        if (window.matchMedia("(display-mode: standalone)").matches) {
          setBlocker({ code: "STANDALONE_ALREADY", message: "Ứng dụng đang chạy ở chế độ Standalone (đã cài)." });
          return;
        }
      } catch {
        // ignore
      }
      const b = computeBlocker();
      setBlocker(b);
      if (b) return;
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
      setBlocker({ code: "STANDALONE_ALREADY", message: "Ứng dụng đã được cài đặt thành công." });
      setInstallPromptOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const idleTimer = window.setTimeout(() => {
      if (!mounted) return;
      const b = computeBlocker();
      setBlocker(b);
    }, 1500);

    return () => {
      mounted = false;
      window.clearTimeout(idleTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [clearPromptRef, computeBlocker]);

  const canInstall = deferredPromptRef.current !== null && blocker === null;

  return {
    installPromptOpen,
    setInstallPromptOpen,
    canInstall,
    blocker,
    handleInstall,
    handleDismiss,
  };
}
