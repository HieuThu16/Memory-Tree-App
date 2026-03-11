"use client";

import { useEffect, useState } from "react";
import { useUiStore } from "@/lib/stores/uiStore";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const isIos = () => {
  if (typeof window === "undefined") return false;

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
};

const isStandalone = () => {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean(
        (window.navigator as Navigator & { standalone?: boolean }).standalone,
      ))
  );
};

export default function InstallAppButton() {
  const addToast = useUiStore((state) => state.addToast);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandalone());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      addToast("Đã thêm ứng dụng vào điện thoại.", "success");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [addToast]);

  if (isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;

      if (result.outcome === "accepted") {
        addToast("Đang thêm ứng dụng vào điện thoại...", "success");
      }

      setInstallPrompt(null);
      return;
    }

    if (isIos()) {
      addToast(
        "Tren iPhone: mo Chia se, chon Them vao Man hinh chinh.",
        "info",
      );
      return;
    }

    addToast(
      "Trinh duyet hien tai chua ho tro cai dat nhanh ung dung.",
      "info",
    );
  };

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="rounded-full border border-white/20 bg-white/14 p-1.5 text-white transition hover:bg-white/22"
      title="Tải về điện thoại"
      aria-label="Tải về điện thoại"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    </button>
  );
}
