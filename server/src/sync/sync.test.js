import { beforeEach, describe, expect, it, vi } from "vitest";

import { db, resetDatabase } from "../../db/db.js";
import { checkInMember } from "../domain/checkIn.js";
import { registerMember } from "../domain/members.js";
import { recordPayment } from "../domain/payments.js";
import { SyncRejectedError } from "./api.js";
import {
  PENDING,
  REJECTED,
  pendingCount,
  pendingOperations,
  requeueEverything,
  retryRejected,
} from "./outbox.js";
import { syncNow } from "./sync.js";

// A backend to push to, and a key to reach it with. Both are stubbed rather
// than inherited from a local .env file: sync is configured only when both are
// present, so a machine without .env.local would otherwise see every drain
// short-circuit and fail these for a reason that has nothing to do with them.
beforeEach(async () => {
  vi.stubEnv("VITE_RACKIN_API_URL", "http://localhost:8080");
  vi.stubEnv("VITE_RACKIN_API_KEY", "test-api-key");
  await resetDatabase();
});

async function registerDefaultMember(overrides = {}) {
  return registerMember({
    name: "Maria Santos",
    planType: "monthly",
    amount: 1200,
    paymentMethod: "cash",
    ...overrides,
  });
}

describe("queueing local writes", () => {
  it("queues a registration as one operation carrying the tablet's own member id", async () => {
    const { member } = await registerDefaultMember({ phone: "09171234567" });

    const [operation] = await pendingOperations();
    expect(operation.kind).toBe("register");
    // The backend must keep this number: the member's QR card is printed with it.
    expect(operation.body.memberId).toBe(member.id);
    expect(operation.body.name).toBe("Maria Santos");
    expect(operation.body.phone).toBe("09171234567");
    expect(operation.body.amount).toBe(1200);
    expect(operation.body.clientUuid).toBe(member.clientUuid);
    // Registration and its first payment are one call, so the payment needs its
    // own idempotency key inside that call.
    expect(operation.body.paymentClientUuid).toBeTruthy();
    expect(operation.body.paymentClientUuid).not.toBe(member.clientUuid);
    expect(operation.body.createdAt).toBe(member.createdAt);
  });

  it("queues a session registration, which the backend previously refused outright", async () => {
    await registerDefaultMember({ planType: "session", amount: 100 });

    const [operation] = await pendingOperations();
    expect(operation.body.planType).toBe("session");
  });

  it("queues a check-in with the moment the member actually walked in", async () => {
    const { member } = await registerDefaultMember();

    await checkInMember(member.id, "qr");

    const operations = await pendingOperations();
    const checkIn = operations.find((operation) => operation.kind === "checkin");
    const stored = await db.checkIns.where("memberId").equals(member.id).first();
    expect(checkIn.body.method).toBe("qr");
    expect(checkIn.body.memberId).toBe(member.id);
    // Same instant as the local row, not "whenever this gets pushed" — a day of
    // offline check-ins must not all land at sync time.
    expect(checkIn.body.timestamp).toBe(stored.timestamp);
    expect(checkIn.body.clientUuid).toBe(stored.clientUuid);
  });

  it("queues a renewal with the moment the member actually paid", async () => {
    const { member } = await registerDefaultMember();

    const { payment } = await recordPayment({
      memberId: member.id,
      amount: 1200,
      method: "transfer",
    });

    const operations = await pendingOperations();
    const queuedPayment = operations.find((operation) => operation.kind === "payment");
    expect(queuedPayment.body.paidAt).toBe(payment.paidAt);
    expect(queuedPayment.body.clientUuid).toBe(payment.clientUuid);
    expect(queuedPayment.body.method).toBe("transfer");
  });

  it("keeps a local write even when queueing is the only thing that could fail", async () => {
    // The local flow is the product; sync is additive (PRD 4.10). Registering
    // must leave a usable member behind no matter what the queue does.
    const { member } = await registerDefaultMember();
    expect(await db.members.get(member.id)).toBeTruthy();
  });
});

describe("draining the queue", () => {
  it("pushes every queued operation in the order the front desk did them", async () => {
    const { member } = await registerDefaultMember();
    await checkInMember(member.id, "numpad");
    await recordPayment({ memberId: member.id, amount: 1200, method: "cash" });

    const calls = [];
    const post = vi.fn(async (path) => {
      calls.push(path);
      return {};
    });

    const result = await syncNow({ post });

    // Registration first: the check-in and payment reference a member the
    // backend does not have until that lands.
    expect(calls).toEqual(["/api/members", "/api/checkins", "/api/payments"]);
    expect(result).toEqual({ synced: 3, rejected: 0, remaining: 0 });
    expect(await pendingCount()).toBe(0);
  });

  it("leaves the queue intact when the network is down", async () => {
    await registerDefaultMember();
    const post = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    const result = await syncNow({ post });

    expect(result.synced).toBe(0);
    expect(result.remaining).toBe(1);
    // Retried on the next online event rather than dropped (TRD 7).
    expect(await pendingCount()).toBe(1);
    const [operation] = await pendingOperations();
    expect(operation.status).toBe(PENDING);
    expect(operation.attempts).toBe(1);
    expect(operation.lastError).toContain("Failed to fetch");
  });

  it("stops at a transient failure rather than pushing operations that depend on it", async () => {
    const { member } = await registerDefaultMember();
    await checkInMember(member.id, "numpad");

    const post = vi.fn(async () => {
      throw new Error("503 Service Unavailable");
    });
    await syncNow({ post });

    // Skipping ahead would send a check-in for a member the backend has never
    // heard of, turning one transient failure into a permanent rejection.
    expect(post).toHaveBeenCalledTimes(1);
    expect(await pendingCount()).toBe(2);
  });

  it("resumes from where it stopped once the network returns", async () => {
    const { member } = await registerDefaultMember();
    await checkInMember(member.id, "numpad");

    await syncNow({
      post: vi.fn(async () => {
        throw new Error("network down");
      }),
    });
    const result = await syncNow({ post: vi.fn(async () => ({})) });

    expect(result.synced).toBe(2);
    expect(await pendingCount()).toBe(0);
  });

  it("sets aside a permanently refused operation and keeps going", async () => {
    const { member } = await registerDefaultMember();
    await checkInMember(member.id, "numpad");

    const post = vi.fn(async (path) => {
      if (path === "/api/members") {
        throw new SyncRejectedError("409 Conflict: Member #1001 already exists", 409);
      }
      return {};
    });

    const result = await syncNow({ post });

    // A 4xx will fail identically forever, so retrying it would wedge the queue
    // behind it and nothing else would ever sync again.
    expect(result).toEqual({ synced: 1, rejected: 1, remaining: 0 });
    expect(await pendingCount()).toBe(0);

    const rejected = await db.outbox.where("status").equals(REJECTED).toArray();
    expect(rejected).toHaveLength(1);
    // Kept, not deleted: a silent failure still has to be debuggable (TRD 8).
    expect(rejected[0].lastError).toContain("409");
  });

  it("never retries an operation the backend has already refused", async () => {
    await registerDefaultMember();
    await syncNow({
      post: vi.fn(async () => {
        throw new SyncRejectedError("400 Bad Request", 400);
      }),
    });

    const post = vi.fn(async () => ({}));
    const result = await syncNow({ post });

    expect(post).not.toHaveBeenCalled();
    expect(result.synced).toBe(0);
  });

  it("pushes a refused operation again once its cause is fixed", async () => {
    await registerDefaultMember();
    await syncNow({
      post: vi.fn(async () => {
        throw new SyncRejectedError("409 Conflict: Member #1001 already exists", 409);
      }),
    });
    expect(await pendingCount()).toBe(0);

    // The conflicting member has since been removed on the backend, so the
    // rejection has stopped being true. Nothing re-queues automatically —
    // that would be an infinite loop wearing a retry's clothes.
    const requeued = await retryRejected();
    const post = vi.fn(async () => ({}));
    const result = await syncNow({ post });

    expect(requeued).toBe(1);
    expect(result.synced).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });

  it("rebuilds the whole queue from local records when the backend has diverged", async () => {
    const { member } = await registerDefaultMember();
    await recordPayment({ memberId: member.id, amount: 1200, method: "transfer" });
    await checkInMember(member.id, "numpad");
    await syncNow({ post: vi.fn(async () => ({})) });
    expect(await db.outbox.count()).toBe(0);

    // The backend's copy was wiped; the tablet is still the source of truth.
    const queued = await requeueEverything();
    const calls = [];
    await syncNow({
      post: vi.fn(async (path) => {
        calls.push(path);
        return {};
      }),
    });

    expect(queued).toBe(3);
    // Registration first again — the rebuilt queue has to respect the same
    // dependency order as the original.
    expect(calls).toEqual(["/api/members", "/api/payments", "/api/checkins"]);
    expect(await pendingCount()).toBe(0);
  });

  it("discards a stale rejection when rebuilding the queue", async () => {
    await registerDefaultMember();
    await syncNow({
      post: vi.fn(async () => {
        throw new SyncRejectedError("409 Conflict", 409);
      }),
    });
    expect(await db.outbox.where("status").equals(REJECTED).count()).toBe(1);

    await requeueEverything();

    // The rebuild replaces the queue outright, so a refusal from before the
    // divergence cannot linger beside the fresh entry for the same record.
    expect(await db.outbox.where("status").equals(REJECTED).count()).toBe(0);
    expect(await pendingCount()).toBe(1);
  });

  it("queues without pushing when the build has no backend configured", async () => {
    vi.stubEnv("VITE_RACKIN_API_URL", "");
    await registerDefaultMember();

    const post = vi.fn();
    const result = await syncNow({ post });

    // The offline-only pilot build. Records still queue, so pointing a later
    // build at a backend pushes the whole history rather than starting empty.
    expect(post).not.toHaveBeenCalled();
    expect(result.remaining).toBe(1);
    expect(await pendingCount()).toBe(1);
  });

  it("does not run two drains at once", async () => {
    await registerDefaultMember();

    let inFlight = 0;
    let maxConcurrent = 0;
    const post = vi.fn(async () => {
      inFlight += 1;
      maxConcurrent = Math.max(maxConcurrent, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return {};
    });

    await Promise.all([syncNow({ post }), syncNow({ post })]);

    // The startup pass and an `online` event can fire together; two drains would
    // send everything twice on exactly the weak connection that needed a queue.
    expect(maxConcurrent).toBe(1);
    expect(post).toHaveBeenCalledTimes(1);
  });
});
