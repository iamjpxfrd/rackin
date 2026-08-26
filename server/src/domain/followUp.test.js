import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getFollowUp, getLapsedMembers, getExpiringMembers } from "./followUp.js";

// followUp.js now fetches from the backend instead of deriving lists from
// local storage ([[Decisions/Web Becomes a Read-Only Dashboard]]). These
// tests exercise both states an unconfigured/failed build can be in: no
// backend configured, and a configured backend answering with data.

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
  it("returns empty lists rather than fetching anything", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await getLapsedMembers()).toEqual([]);
    expect(await getExpiringMembers()).toEqual([]);
    expect(await getFollowUp()).toEqual({ expiring: [], lapsed: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("when the backend answers", () => {
  it("fetches /api/checkins/lapsed and /api/payments/expiring and normalizes the rows", async () => {
    configureApi();
    const fetchSpy = vi.fn(async (url) => {
      if (String(url).endsWith("/api/checkins/lapsed")) {
        return jsonResponse([
          {
            member: { id: "1001", name: "Lapsed Member", planType: "monthly", phone: null },
            status: "active",
            isExpiringSoon: false,
            daysRemaining: 10,
            daysSinceVisit: 20,
          },
        ]);
      }
      if (String(url).endsWith("/api/payments/expiring")) {
        return jsonResponse([
          {
            member: { id: "1002", name: "Expiring Member", planType: "weekly", phone: "555" },
            status: "active",
            isExpiringSoon: true,
            daysRemaining: 2,
            daysSinceVisit: 1,
          },
        ]);
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { expiring, lapsed } = await getFollowUp();

    expect(lapsed).toEqual([
      {
        member: { id: "1001", name: "Lapsed Member", planType: "monthly", phone: null },
        status: "active",
        isExpiringSoon: false,
        daysRemaining: 10,
        daysSinceVisit: 20,
      },
    ]);
    expect(expiring).toEqual([
      {
        member: { id: "1002", name: "Expiring Member", planType: "weekly", phone: "555" },
        status: "active",
        isExpiringSoon: true,
        daysRemaining: 2,
        daysSinceVisit: 1,
      },
    ]);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.test/api/checkins/lapsed",
      expect.objectContaining({ headers: { Authorization: "Bearer test-key" } }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.test/api/payments/expiring",
      expect.objectContaining({ headers: { Authorization: "Bearer test-key" } }),
    );
  });

  it("falls back to an empty list rather than crashing on an unexpected shape", async () => {
    configureApi();
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ not: "an array" })));

    expect(await getLapsedMembers()).toEqual([]);
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
