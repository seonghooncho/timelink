import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import { isIos, isMobileDevice, isStandalonePwa } from "@/utils/pwa";

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

  it("shows compact install banner on regular web access", async () => {
    render(React.createElement(PwaInstallPrompt));

    await waitFor(() => {
      expect(screen.getByText("Timelink를 홈 화면에 추가")).toBeInTheDocument();
    });
    expect(screen.getByText("브라우저 메뉴 → 앱 설치를 누르면 바로 열 수 있어요.")).toBeInTheDocument();
    expect(screen.getByText("메뉴 → 앱 설치")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows short iOS install steps", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    );

    render(React.createElement(PwaInstallPrompt));

    await waitFor(() => {
      expect(screen.getByText("공유 → 홈 화면에 추가를 누르면 앱처럼 열려요.")).toBeInTheDocument();
    });
    expect(screen.getByText("공유 → 홈 화면에 추가")).toBeInTheDocument();
  });

  it("shows install prompt even when stale install flags exist", async () => {
    localStorage.setItem("timelink:pwa-install-accepted", "true");
    localStorage.setItem("timelink:pwa-install-snoozed-until", String(Date.now() + 100000));

    render(React.createElement(PwaInstallPrompt));

    await waitFor(() => {
      expect(screen.getByText("Timelink를 홈 화면에 추가")).toBeInTheDocument();
    });
  });

  it("uses the browser install prompt when it is available", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted"; platform: string }>;
    };
    installEvent.prompt = prompt;
    installEvent.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

    render(React.createElement(PwaInstallPrompt));

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

  it("keeps mobile install prompt as guide-only even when browser install event exists", async () => {
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

    render(React.createElement(PwaInstallPrompt));

    await act(async () => {
      window.dispatchEvent(installEvent);
    });

    await waitFor(() => {
      expect(screen.getByText("브라우저 메뉴 → 앱 설치를 누르면 바로 열 수 있어요.")).toBeInTheDocument();
    });
    expect(screen.getByText("메뉴 → 앱 설치")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "설치" })).not.toBeInTheDocument();
  });
});
