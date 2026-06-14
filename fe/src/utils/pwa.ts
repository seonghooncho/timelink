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

export const isMobileDevice = () => {
  const userAgent = navigator.userAgent || "";
  const touchDevice = navigator.maxTouchPoints > 1;
  const narrowViewport = window.matchMedia("(max-width: 767px)").matches;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    || (touchDevice && narrowViewport);
};

export type PwaInstallEnvironmentKind =
  | "standalone"
  | "android-kakao"
  | "ios-kakao"
  | "ios-safari"
  | "ios-chrome"
  | "samsung"
  | "android-chrome"
  | "desktop"
  | "browser";

export interface PwaInstallEnvironment {
  kind: PwaInstallEnvironmentKind;
  label: string;
  guide: string;
  actionLabel: string;
  canNativePrompt: boolean;
  showCopyLink: boolean;
}

export const isKakaoInAppBrowser = () => /KAKAOTALK/i.test(navigator.userAgent || "");

export const isSamsungInternet = () => /SamsungBrowser/i.test(navigator.userAgent || "");

export const isIosChrome = () => isIos() && /CriOS/i.test(navigator.userAgent || "");

export const getPwaInstallEnvironment = (hasNativePrompt = false): PwaInstallEnvironment => {
  if (isStandalonePwa()) {
    return {
      kind: "standalone",
      label: "설치됨",
      guide: "이미 홈 화면에서 앱처럼 실행 중입니다.",
      actionLabel: "설치됨",
      canNativePrompt: false,
      showCopyLink: false,
    };
  }

  const userAgent = navigator.userAgent || "";
  const kakao = isKakaoInAppBrowser();
  const ios = isIos();
  const samsung = isSamsungInternet();
  const android = /Android/i.test(userAgent);

  if (hasNativePrompt) {
    return {
      kind: samsung ? "samsung" : android ? "android-chrome" : "desktop",
      label: "앱 설치 가능",
      guide: "설치 버튼을 누르면 현재 페이지를 유지한 채 Timelink를 홈 화면에 추가할 수 있어요.",
      actionLabel: "설치",
      canNativePrompt: true,
      showCopyLink: false,
    };
  }

  if (kakao && ios) {
    return {
      kind: "ios-kakao",
      label: "카카오톡 브라우저",
      guide: "카카오톡 안에서는 설치가 제한될 수 있어요. Safari로 열고 공유 → 홈 화면에 추가를 선택하세요.",
      actionLabel: "링크 복사",
      canNativePrompt: false,
      showCopyLink: true,
    };
  }

  if (kakao) {
    return {
      kind: "android-kakao",
      label: "카카오톡 브라우저",
      guide: "카카오톡 안에서는 설치가 제한될 수 있어요. 외부 브라우저로 열거나 링크를 복사해 Chrome/Samsung Internet에서 설치하세요.",
      actionLabel: "링크 복사",
      canNativePrompt: false,
      showCopyLink: true,
    };
  }

  if (ios && isIosChrome()) {
    return {
      kind: "ios-chrome",
      label: "iOS Chrome",
      guide: "iPhone에서는 Safari에서 홈 화면 추가가 가장 안정적이에요. 링크를 Safari로 열고 공유 → 홈 화면에 추가를 선택하세요.",
      actionLabel: "링크 복사",
      canNativePrompt: false,
      showCopyLink: true,
    };
  }

  if (ios) {
    return {
      kind: "ios-safari",
      label: "iOS Safari",
      guide: "공유 버튼을 누른 뒤 홈 화면에 추가를 선택하면 앱처럼 열 수 있어요.",
      actionLabel: "공유 → 홈 화면에 추가",
      canNativePrompt: false,
      showCopyLink: false,
    };
  }

  if (samsung) {
    return {
      kind: "samsung",
      label: "Samsung Internet",
      guide: "브라우저 메뉴에서 현재 페이지 추가 또는 앱 설치를 선택하면 Galaxy 홈 화면에서 바로 열 수 있어요.",
      actionLabel: "메뉴 → 앱 설치",
      canNativePrompt: false,
      showCopyLink: false,
    };
  }

  if (android) {
    return {
      kind: "android-chrome",
      label: "Android 브라우저",
      guide: "브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하면 현재 링크로 다시 돌아올 수 있어요.",
      actionLabel: "메뉴 → 앱 설치",
      canNativePrompt: false,
      showCopyLink: false,
    };
  }

  return {
    kind: "desktop",
    label: "데스크톱 브라우저",
    guide: "주소창의 설치 아이콘이나 브라우저 메뉴의 앱 설치를 사용하면 Timelink를 앱처럼 열 수 있어요.",
    actionLabel: "설치 안내",
    canNativePrompt: false,
    showCopyLink: false,
  };
};
