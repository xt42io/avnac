import { describe, expect, it, vi } from "vitest";
import { useAnalytics } from "../lib/analytics";

const capture = vi.fn();
const captureException = vi.fn();

vi.mock("posthog-js/react", () => ({
  usePostHog: () => ({ capture, captureException }),
}));

// useAnalytics only relies on useMemo to memoize the facade. Invoke the factory
// directly so the hook can run outside a React render (the suite runs in node).
vi.mock("react", async (importActual) => {
  const actual = await importActual<typeof import("react")>();
  return { ...actual, useMemo: (factory: () => unknown) => factory() };
});

describe("useAnalytics", () => {
  it("forwards an event with its payload to posthog", () => {
    capture.mockClear();
    useAnalytics().fileOpened({ file_id: "abc", method: "new_tab" });
    expect(capture).toHaveBeenCalledWith("file_opened", {
      file_id: "abc",
      method: "new_tab",
    });
  });

  it("forwards a payloadless event with no properties", () => {
    capture.mockClear();
    useAnalytics().removeBgPageViewed();
    expect(capture).toHaveBeenCalledWith("remove_bg_page_viewed", undefined);
  });

  it("reports errors via captureException and logs the context", () => {
    captureException.mockClear();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const error = new Error("boom");
    useAnalytics().captureError(error, "while doing X");
    expect(captureException).toHaveBeenCalledWith(error);
    expect(consoleError).toHaveBeenCalledWith("while doing X", error);
    consoleError.mockRestore();
  });
});
