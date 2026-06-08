import { useEffect, useMemo, useState } from "react";
import { Download, Menu, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BeforeInstallPromptEvent,
  isIos,
  isStandalonePwa,
} from "@/utils/pwa";

const PwaInstallPrompt = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const iosDevice = useMemo(() => isIos(), []);

  useEffect(() => {
    if (isStandalonePwa()) {
      return;
    }

    setOpen(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setOpen(true);
    };

    const handleAppInstalled = () => {
      setOpen(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [iosDevice]);

  const closePrompt = () => {
    setOpen(false);
  };

  const installPwa = async () => {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    setInstallEvent(null);
    setOpen(false);
  };

  if (isStandalonePwa()) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closePrompt())}>
      <DialogContent className="mx-auto w-[calc(100vw-2rem)] max-w-sm rounded-2xl border-0 p-0 shadow-elevated">
        <div className="overflow-hidden rounded-2xl bg-card">
          <DialogHeader className="space-y-3 px-5 pb-3 pt-5 text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl leading-7">Timelink 설치</DialogTitle>
              <DialogDescription className="text-sm leading-6">
                홈 화면에서 바로 열 수 있도록 Timelink를 설치하세요.
              </DialogDescription>
            </div>
          </DialogHeader>

          {iosDevice && !installEvent ? (
            <div className="space-y-3 px-5 pb-4 text-sm text-muted-foreground">
              <div className="flex gap-3 rounded-xl bg-secondary p-3">
                <Share className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p>공유 버튼을 누른 뒤 홈 화면에 추가를 선택하세요.</p>
              </div>
            </div>
          ) : null}

          {!iosDevice && !installEvent ? (
            <div className="space-y-3 px-5 pb-4 text-sm text-muted-foreground">
              <div className="flex gap-3 rounded-xl bg-secondary p-3">
                <Menu className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p>브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하세요.</p>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 border-t bg-secondary/60 px-5 py-4 sm:flex-col sm:space-x-0">
            {installEvent ? (
              <Button className="h-11 w-full rounded-xl" onClick={installPwa}>
                <Download className="h-4 w-4" aria-hidden="true" />
                설치
              </Button>
            ) : null}
            <Button className="h-11 w-full rounded-xl" variant="ghost" onClick={closePrompt}>
              나중에
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PwaInstallPrompt;
