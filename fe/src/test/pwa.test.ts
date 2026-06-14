import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import { isIos, isMobileDevice, isStandalonePwa } from "@/utils/pwa";

const renderPrompt = (route = "/") => render(
  React.createElement(
    MemoryRouter,
    { initialEntries: [route] },
    React.createElement(PwaInstallPrompt),
  ),
);

describe("pwa utilities", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("detects standalone display mode", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(display-mode: standalone)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });

    expect(isStandalonePwa()).toBe(true);
  });

  it("detects iOS user agents", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    );

    expect(isIos()).toBe(true);
  });

  it("detects mobile user agents", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/148.0.0.0 Mobile Safari/537.36",
    );

    expect(isMobileDevice()).toBe(true);
  });

  it("shows compact install banner on contextual app surfaces", async () => {
    renderPrompt("/mypage");

    await waitFor(() => {
      expect(screen.getByText("Timelink를 홈 화면에 추가")).toBeInTheDocument();
    });
    expect(screen.getByText(/주소창의 설치 아이콘/)).toBeInTheDocument();
    expect(screen.getByText("데스크톱 브라우저")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows short iOS install steps", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    );

    renderPrompt("/mypage");

    await waitFor(() => {
      expect(screen.getByText("공유 버튼을 누른 뒤 홈 화면에 추가를 선택하면 앱처럼 열 수 있어요.")).toBeInTheDocument();
    });
    expect(screen.getByText("공유 → 홈 화면에 추가")).toBeInTheDocument();
  });

  it("shows install prompt even when stale install flags exist", async () => {
    localStorage.setItem("timelink:pwa-install-accepted", "true");
    localStorage.setItem("timelink:pwa-install-snoozed-until", String(Date.now() + 100000));

    renderPrompt("/mypage");

    await waitFor(() => {
      expect(screen.getByText("Timelink를 홈 화면에 추가")).toBeInTheDocument();
    });
  });

  it("does not show install prompt on focused workflow routes", async () => {
    renderPrompt("/groups/group-1/coordination/coord-1/timetable");

    await waitFor(() => {
      expect(screen.queryByText("Timelink를 홈 화면에 추가")).not.toBeInTheDocument();
    });
  });

  it("does not show install prompt before users understand the service", async () => {
    renderPrompt("/demo");

    await waitFor(() => {
      expect(screen.queryByText("Timelink를 홈 화면에 추가")).not.toBeInTheDocument();
    });
  });

  it("hides install prompt for a while after close", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000_000);

    renderPrompt("/mypage");

    const close = await screen.findByRole("button", { name: "설치 안내 닫기" });
    fireEvent.click(close);

    await waitFor(() => {
      expect(screen.queryByText("Timelink를 홈 화면에 추가")).not.toBeInTheDocument();
    });

    const hiddenUntil = Number(localStorage.getItem("timelink:pwa-install-dismissed-until"));
    expect(hiddenUntil).toBeGreaterThan(1_000_000);

    renderPrompt("/mypage");

    expect(screen.queryByText("Timelink를 홈 화면에 추가")).not.toBeInTheDocument();
  });

  it("uses the browser install prompt when it is available", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted"; platform: string }>;
    };
    installEvent.prompt = prompt;
    installEvent.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

    renderPrompt("/mypage");

    await act(async () => {
      window.dispatchEvent(installEvent);
    });

    const installButton = await screen.findByRole("button", { name: "설치" });
    await act(async () => {
      fireEvent.click(installButton);
      await installEvent.userChoice;
    });

    await waitFor(() => {
      expect(prompt).toHaveBeenCalledTimes(1);
    });
  });

  it("uses the native install prompt on Android when the browser exposes it", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/148.0.0.0 Mobile Safari/537.36",
    );
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted"; platform: string }>;
    };
    installEvent.prompt = prompt;
    installEvent.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

    renderPrompt("/mypage");

    await act(async () => {
      window.dispatchEvent(installEvent);
    });

    const installButton = await screen.findByRole("button", { name: "설치" });
    await act(async () => {
      fireEvent.click(installButton);
      await installEvent.userChoice;
    });

    await waitFor(() => {
      expect(prompt).toHaveBeenCalledTimes(1);
    });
  });

  it("guides KakaoTalk users to copy or open the link externally", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 KAKAOTALK Chrome/120.0 Mobile Safari/537.36",
    );

    renderPrompt("/groups/join/ABC123?coord=coord-1");

    await waitFor(() => {
      expect(screen.getByText("카카오톡 브라우저")).toBeInTheDocument();
    });
    expect(screen.getByText(/외부 브라우저로 열거나 링크를 복사/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "링크 복사" })).toBeInTheDocument();
  });
});
