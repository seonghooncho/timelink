import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Menu, Share2, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  BeforeInstallPromptEvent,
  getPwaInstallEnvironment,
  isStandalonePwa,
} from "@/utils/pwa";
import { appToast } from "@/lib/appToast";

const DISMISSED_UNTIL_KEY = "timelink:pwa-install-dismissed-until";
const DISMISS_DAYS = 7;
const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000;
const SUPPRESSED_PATH_PATTERNS = [
  /^\/login(?:\/|$)/,
  /^\/demo(?:\/|$)/,
  /^\/terms(?:\/|$)/,
  /^\/privacy(?:\/|$)/,
  /^\/auth\/callback(?:\/|$)/,
  /^\/consent(?:\/|$)/,
  /^\/schedule\/new(?:\/|$)/,
  /^\/groups\/new(?:\/|$)/,
  /^\/groups\/[^/]+\/coordination(?:\/|$)/,
];
const CONTEXTUAL_PATH_PATTERNS = [
  /^\/mypage(?:\/|$)/,
  /^\/groups(?:\/|$)/,
  /^\/groups\/join\/[^/]+/,
  /^\/groups\/[^/]+\/intro(?:\/|$)/,
  /^\/invite\/[^/]+/,
  /^\/notifications(?:\/|$)/,
];

function isDismissed() {
  const dismissedUntil = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) || 0);
  return Number.isFinite(dismissedUntil) && Date.now() < dismissedUntil;
}

function isSuppressedPath(pathname: string) {
  return SUPPRESSED_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isContextualPath(pathname: string) {
  return CONTEXTUAL_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

const PwaInstallPrompt = () => {
  const { pathname } = useLocation();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [copied, setCopied] = useState(false);
  const environment = useMemo(() => getPwaInstallEnvironment(Boolean(installEvent)), [installEvent]);

  useEffect(() => {
    if (isStandalonePwa() || isSuppressedPath(pathname) || !isContextualPath(pathname) || isDismissed()) {
      setVisible(false);
      return;
    }

    setVisible(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      if (!isSuppressedPath(window.location.pathname) && !isDismissed()) {
        setVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [pathname]);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + DISMISS_MS));
    setVisible(false);
  }, []);

  const installPwa = useCallback(async () => {
    if (!installEvent) {
      return;
    }

    setInstalling(true);

    try {
      await installEvent.prompt();
      await installEvent.userChoice;
      setVisible(false);
      setInstallEvent(null);
    } finally {
      setInstalling(false);
    }
  }, [installEvent]);

  const copyCurrentLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      appToast.success("현재 링크를 복사했습니다");
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      appToast.error("링크를 복사하지 못했습니다", error);
    }
  }, []);

  if (!visible || isStandalonePwa()) {
    return null;
  }

  const showInstallButton = environment.canNativePrompt && Boolean(installEvent);
  const guide = environment.guide;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 app-layer-notice px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <section
        className="glass pointer-events-auto mx-auto flex w-full max-w-lg items-start gap-3 rounded-2xl border border-border/80 bg-card/95 p-3 shadow-elevated animate-in fade-in slide-in-from-top-2"
        aria-label="Timelink 설치 안내"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <img src="/applogo.png" alt="" className="h-7 w-7 rounded-lg" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-5 text-foreground">
            Timelink를 홈 화면에 추가
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-primary">{environment.label}</p>
          <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{guide}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {showInstallButton ? (
              <button
                type="button"
                className="pressable inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-60"
                onClick={installPwa}
                disabled={installing}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {installing ? "설치 중" : "설치"}
              </button>
            ) : environment.showCopyLink ? (
              <button
                type="button"
                className="pressable inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted"
                onClick={copyCurrentLink}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                )}
                {copied ? "복사됨" : environment.actionLabel}
              </button>
            ) : (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3 text-[11px] font-medium text-foreground">
                {environment.kind === "ios-safari" || environment.kind === "ios-chrome" ? (
                  <Share2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                ) : (
                  <Menu className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                )}
                {environment.actionLabel}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="pressable -mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="설치 안내 닫기"
          onClick={dismissPrompt}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
};

export default PwaInstallPrompt;
