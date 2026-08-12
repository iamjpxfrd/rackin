// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetDatabase } from "../../db/db.js";
import { checkInMember } from "../domain/checkIn.js";
import { registerMember } from "../domain/members.js";
import { pendingCount } from "./outbox.js";
import { startSync } from "./sync.js";

// What makes a push happen. The bug these cover: a member registered while the
// app was already running and online sat in the queue until the page reloaded,
// because the only triggers were startup and the `online` event.

let stop = () => {};

beforeEach(async () => {
  vi.stubEnv("VITE_RACKIN_API_URL", "http://localhost:8080");
  await resetDatabase();
});

afterEach(() => {
  stop();
  stop = () => {};
});

// Real timers throughout, with a short retry interval: Dexie drives IndexedDB
// on the event loop, and vi.useFakeTimers() deadlocks it mid-transaction.
const FAST_RETRY_MS = 30;

async function waitUntil(predicate, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return false;
}

// The push is deliberately not awaited by startSync, so tests wait for the
// queue to settle rather than for a promise the production path never holds.
async function waitForQueueToDrain(timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await pendingCount()) === 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return false;
}

function registerDefaultMember(overrides = {}) {
  return registerMember({
    name: "Session Walkin",
    planType: "session",
    amount: 100,
    paymentMethod: "cash",
    ...overrides,
  });
}

describe("what triggers a push", () => {
  it("pushes a member registered while the app is already running", async () => {
    const post = vi.fn(async () => ({}));
    stop = startSync({ post });
    await waitForQueueToDrain();

    // The app is up and online. No `online` event will fire for this write, and
    // nothing is going to reload the page in the middle of a shift.
    await registerDefaultMember();

    expect(await waitForQueueToDrain()).toBe(true);
    expect(post).toHaveBeenCalledWith("/api/members", expect.objectContaining({ planType: "session" }));
  });

  it("pushes a check-in the moment it is recorded", async () => {
    const post = vi.fn(async () => ({}));
    const { member } = await registerDefaultMember();
    stop = startSync({ post });
    await waitForQueueToDrain();

    post.mockClear();
    await checkInMember(member.id, "numpad");

    expect(await waitForQueueToDrain()).toBe(true);
    expect(post).toHaveBeenCalledWith("/api/checkins", expect.objectContaining({ memberId: member.id }));
  });

  it("picks up a write that lands mid-drain instead of stranding it", async () => {
    let releaseFirstPost;
    const firstPostStarted = new Promise((resolve) => {
      releaseFirstPost = resolve;
    });
    let hold = firstPostStarted;

    const post = vi.fn(async () => {
      releaseFirstPost();
      await hold;
      return {};
    });

    await registerDefaultMember();
    stop = startSync({ post });

    // Second write arrives while the first push is still in flight, so the
    // running drain has already read a queue that does not contain it.
    await firstPostStarted;
    const second = await registerDefaultMember({ name: "Second Member" });
    hold = Promise.resolve();

    expect(await waitForQueueToDrain()).toBe(true);
    expect(post).toHaveBeenCalledWith(
      "/api/members",
      expect.objectContaining({ memberId: second.member.id }),
    );
  });

  it("drains what accumulated offline when the network returns", async () => {
    const post = vi.fn(async () => ({}));
    stop = startSync({ post });
    await waitForQueueToDrain();

    post.mockClear();
    // Queued while unreachable, then the tablet finds wifi again.
    await registerDefaultMember();
    await waitForQueueToDrain();
    post.mockClear();
    await checkInMember("1001", "qr").catch(() => {});

    window.dispatchEvent(new Event("online"));

    expect(await waitForQueueToDrain()).toBe(true);
  });

  it("retries on a timer while something is still queued", async () => {
    let reachable = false;
    const post = vi.fn(async () => {
      if (!reachable) throw new TypeError("Failed to fetch");
      return {};
    });

    await registerDefaultMember();
    stop = startSync({ post, retryDelayMs: FAST_RETRY_MS });
    await waitUntil(async () => post.mock.calls.length >= 1);
    expect(await pendingCount()).toBe(1);

    // The browser reports `online` for a wifi network with no route to the
    // backend, and fires no event when the route comes back — so nothing but a
    // timer will ever notice. No new write happens here either.
    reachable = true;

    expect(await waitForQueueToDrain()).toBe(true);
    expect(post.mock.calls.length).toBeGreaterThan(1);
  });

  it("stops the retry timer once the queue is empty", async () => {
    const post = vi.fn(async () => ({}));

    await registerDefaultMember();
    stop = startSync({ post, retryDelayMs: FAST_RETRY_MS });
    expect(await waitForQueueToDrain()).toBe(true);
    const afterDrain = post.mock.calls.length;

    // Ten retry intervals with an empty queue. An idle tablet must poll
    // nothing — that is the resource drain TRD 7 rules out.
    await new Promise((resolve) => setTimeout(resolve, FAST_RETRY_MS * 10));

    expect(post).toHaveBeenCalledTimes(afterDrain);
  });

  it("stops pushing after cleanup", async () => {
    const post = vi.fn(async () => ({}));
    stop = startSync({ post });
    await waitForQueueToDrain();

    stop();
    stop = () => {};
    post.mockClear();

    await registerDefaultMember();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // React unmounts and remounts in StrictMode; a listener left behind would
    // double every push for the rest of the session.
    expect(post).not.toHaveBeenCalled();
  });
});
