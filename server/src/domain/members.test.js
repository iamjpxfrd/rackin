import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getMemberProfile,
  listMembers,
  filterMembers,
  memberCount,
} from "./members.js";

// listMembers()/memberCount() now fetch from the backend instead of
// returning stubs ([[Decisions/Web Becomes a Read-Only Dashboard]]). These
// tests mirror followUp.test.js's shape: no backend configured, and a
// configured backend answering with data.

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

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  };
}

describe("getMemberProfile", () => {
  it("is stubbed until a backend profile-read endpoint exists", async () => {
    expect(await getMemberProfile("1001")).toBeNull();
  });
});

describe("listMembers", () => {
  it("when this build has no backend configured, returns an empty roster rather than fetching anything", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await listMembers()).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches /api/members and normalizes the rows", async () => {
    configureApi();
    const fetchSpy = vi.fn(async () =>
      jsonResponse([
        {
          member: { id: "1002", name: "Ana Reyes", planType: "weekly", phone: "555" },
          status: "active",
          isExpiringSoon: true,
        },
        {
          member: { id: "1001", name: "Zara Cruz", planType: "monthly", phone: null },
          status: "expired",
          isExpiringSoon: false,
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const rows = await listMembers();

    expect(rows).toEqual([
      {
        member: { id: "1002", name: "Ana Reyes", planType: "weekly", phone: "555" },
        status: "active",
        isExpiringSoon: true,
      },
      {
        member: { id: "1001", name: "Zara Cruz", planType: "monthly", phone: null },
        status: "expired",
        isExpiringSoon: false,
      },
    ]);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.test/api/members",
      expect.objectContaining({ headers: { Authorization: "Bearer test-key" } }),
    );
  });

  it("falls back to an empty roster rather than crashing on an unexpected shape", async () => {
    configureApi();
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ not: "an array" })));

    expect(await listMembers()).toEqual([]);
  });

  it("fills in missing optional fields rather than surfacing undefined", async () => {
    configureApi();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([{ member: { id: "1001", name: "Maria Santos" } }])),
    );

    expect(await listMembers()).toEqual([
      {
        member: { id: "1001", name: "Maria Santos", planType: null, phone: null },
        status: "expired",
        isExpiringSoon: false,
      },
    ]);
  });
});

describe("memberCount", () => {
  it("is 0 when this build has no backend configured", async () => {
    expect(await memberCount()).toBe(0);
  });

  it("is the length of the roster listMembers() returns", async () => {
    configureApi();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          { member: { id: "1001", name: "Ana Reyes" }, status: "active", isExpiringSoon: false },
          { member: { id: "1002", name: "Zara Cruz" }, status: "expired", isExpiringSoon: false },
        ]),
      ),
    );

    expect(await memberCount()).toBe(2);
  });
});

describe("filterMembers", () => {
  const rows = [
    { member: { id: "1001", name: "Placeholder Name" } },
    { member: { id: "1002", name: "Second Placeholder" } },
  ];

  it("matches on partial name, case-insensitively", () => {
    expect(filterMembers(rows, "placeholder")).toHaveLength(2);
    expect(filterMembers(rows, "second")).toHaveLength(1);
  });

  it("matches on member number, for staff holding a physical card", () => {
    expect(filterMembers(rows, "1001")).toEqual([rows[0]]);
  });

  it("returns the whole roster for an empty query", () => {
    expect(filterMembers(rows, "  ")).toEqual(rows);
  });
});
