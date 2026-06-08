export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export const isStandalonePwa = () => {
  const standaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return standaloneMedia || iosStandalone;
};

export const isIos = () => {
  const platform = navigator.platform || "";
  const userAgent = navigator.userAgent || "";
  const touchMac = platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return /iPad|iPhone|iPod/.test(userAgent) || touchMac;
};
