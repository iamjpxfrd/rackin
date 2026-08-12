import { beforeEach, describe, expect, it, vi } from "vitest";

import { isSyncConfigured, postJson, SyncRejectedError, syncBaseUrl } from "./api.js";

beforeEach(() => {
  vi.stubEnv("VITE_RACKIN_API_URL", "http://localhost:8080");
});

function respondWith({ status, statusText = "", body = null, ok = status < 400 }) {
  return vi.fn(async () => ({
    ok,
    status,
    statusText,
    json: async () => {
      if (body === null) throw new SyntaxError("Unexpected end of JSON input");
      return body;
    },
  }));
}

describe("configuration", () => {
  it("treats a build with no backend as offline-only", () => {
    vi.stubEnv("VITE_RACKIN_API_URL", "");
    expect(isSyncConfigured()).toBe(false);
  });

  it("strips a trailing slash so paths never double up", () => {
    vi.stubEnv("VITE_RACKIN_API_URL", "http://localhost:8080/");
    expect(syncBaseUrl()).toBe("http://localhost:8080");
  });
});

describe("classifying failures", () => {
  it("treats 4xx as permanent, since retrying changes nothing", async () => {
    const fetchImpl = respondWith({
      status: 404,
      statusText: "Not Found",
      body: { error: "No member found for #1114" },
    });

    await expect(postJson("/api/checkins", {}, { fetchImpl })).rejects.toBeInstanceOf(SyncRejectedError);
    // The message the backend chose, preserved for the log: sync failures are
    // silent to staff but still have to be debuggable (TRD 8).
    await expect(postJson("/api/checkins", {}, { fetchImpl })).rejects.toThrow("No member found for #1114");
  });

  it("treats 5xx as retryable, so a backend restart does not lose the queue", async () => {
    const fetchImpl = respondWith({ status: 503, statusText: "Service Unavailable" });

    const error = await postJson("/api/members", {}, { fetchImpl }).catch((caught) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(SyncRejectedError);
  });

  it("flattens field-level validation errors into one readable line", async () => {
    const fetchImpl = respondWith({
      status: 400,
      statusText: "Bad Request",
      body: [{ field: "amount", reason: "amount must be greater than 0" }],
    });

    await expect(postJson("/api/payments", {}, { fetchImpl })).rejects.toThrow(
      "amount amount must be greater than 0",
    );
  });

  it("accepts a success whose body cannot be parsed", async () => {
    const fetchImpl = respondWith({ status: 201 });

    // A 2xx means the backend committed the write, which is the only thing the
    // caller acts on — an unreadable body must not re-queue an accepted record.
    await expect(postJson("/api/members", {}, { fetchImpl })).resolves.toBeNull();
  });
});
