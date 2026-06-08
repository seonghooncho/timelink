import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import { isIos, isStandalonePwa } from "@/utils/pwa";

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

  it("shows install prompt on regular web access", async () => {
    render(React.createElement(PwaInstallPrompt));

    await waitFor(() => {
      expect(screen.getByText("Timelink 설치")).toBeInTheDocument();
    });
  });

  it("shows install prompt even when stale install flags exist", async () => {
    localStorage.setItem("timelink:pwa-install-accepted", "true");
    localStorage.setItem("timelink:pwa-install-snoozed-until", String(Date.now() + 100000));

    render(React.createElement(PwaInstallPrompt));

    await waitFor(() => {
      expect(screen.getByText("Timelink 설치")).toBeInTheDocument();
    });
  });
});
