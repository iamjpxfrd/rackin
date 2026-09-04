import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSyncStatus } from "./syncStatus.js";

const ORIGINAL_URL = import.meta.env.VITE_RACKIN_API_URL;
const ORIGINAL_KEY = import.meta.env.VITE_RACKIN_API_KEY;

function configureApi() {
  import.meta.env.VITE_RACKIN_API_URL = "https://api.example.test";
  import.meta.env.VITE_RACKIN_API_KEY = "test-key";
}

function unconfigureApi() {
  import.meta.env.VITE_RACKIN_API_URL = "";
  import.meta.env.VITE_RACKIN_API_KEY = "";
}

beforeEach(() => {
  unconfigureApi();
});

afterEach(() => {
  import.meta.env.VITE_RACKIN_API_URL = ORIGINAL_URL;
  import.meta.env.VITE_RACKIN_API_KEY = ORIGINAL_KEY;
  vi.unstubAllGlobals();
});

describe("when this build has no backend configured", () => {
  it("reports never-reported rather than fetching anything", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await getSyncStatus()).toEqual({ pendingCount: 0, oldestPendingAt: null, reportedAt: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("when the backend answers", () => {
  it("fetches /api/sync/status and passes its fields through", async () => {
    configureApi();
    const fetchSpy = vi.fn(async () =>
      jsonResponse({ pendingCount: 3, oldestPendingAt: "2026-08-23T01:00:00Z", reportedAt: "2026-08-23T02:00:00Z" }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    expect(await getSyncStatus()).toEqual({
      pendingCount: 3,
      oldestPendingAt: "2026-08-23T01:00:00Z",
      reportedAt: "2026-08-23T02:00:00Z",
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.test/api/sync/status",
      expect.objectContaining({ headers: { Authorization: "Bearer test-key" } }),
    );
  });

  it("treats the never-reported response (null reportedAt) as such", async () => {
    configureApi();
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ pendingCount: 0, oldestPendingAt: null, reportedAt: null })));

    expect(await getSyncStatus()).toEqual({ pendingCount: 0, oldestPendingAt: null, reportedAt: null });
  });

  it("falls back to never-reported rather than crashing on an unexpected shape", async () => {
    configureApi();
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(null)));

    expect(await getSyncStatus()).toEqual({ pendingCount: 0, oldestPendingAt: null, reportedAt: null });
  });
});

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  };
}
