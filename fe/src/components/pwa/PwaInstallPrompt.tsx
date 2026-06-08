import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Menu, Share2, X } from "lucide-react";
import {
  BeforeInstallPromptEvent,
  isIos,
  isStandalonePwa,
} from "@/utils/pwa";

const PwaInstallPrompt = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const iosDevice = useMemo(() => isIos(), []);

  useEffect(() => {
    if (isStandalonePwa()) {
      return;
    }

    setVisible(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
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
  }, [iosDevice]);

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

  if (!visible || isStandalonePwa()) {
    return null;
  }

  const guide = iosDevice
    ? "공유 메뉴에서 홈 화면에 추가를 선택하세요."
    : installEvent
      ? "설치 버튼으로 더 빠르게 열 수 있어요."
      : "브라우저 메뉴에서 앱 설치를 선택하세요.";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
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
          <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{guide}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {installEvent ? (
              <button
                type="button"
                className="pressable inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-60"
                onClick={installPwa}
                disabled={installing}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {installing ? "설치 중" : "설치"}
              </button>
            ) : (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-3 text-[11px] font-medium text-foreground">
                {iosDevice ? (
                  <Share2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                ) : (
                  <Menu className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                )}
                {iosDevice ? "공유 메뉴" : "브라우저 메뉴"}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="pressable -mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="설치 안내 닫기"
          onClick={() => setVisible(false)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
};

export default PwaInstallPrompt;
