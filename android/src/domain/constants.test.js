import { describe, it, expect } from "@jest/globals";
import {
  formatDuration,
  isDropIn,
  membershipTypeLabel,
  planDuration,
  planLabel,
  planNeedsMembershipType,
} from "./constants.js";

describe("planNeedsMembershipType", () => {
  it("is true for the two plans priced by membership type", () => {
    expect(planNeedsMembershipType("monthly")).toBe(true);
    expect(planNeedsMembershipType("annually")).toBe(true);
  });

  it("is false for the two flat plans", () => {
    expect(planNeedsMembershipType("session")).toBe(false);
    expect(planNeedsMembershipType("weekly")).toBe(false);
  });
});

describe("membershipTypeLabel", () => {
  it("returns null for Session/Weekly - never a real choice for those plans", () => {
    expect(membershipTypeLabel({ planType: "session", isStudent: true })).toBeNull();
    expect(membershipTypeLabel({ planType: "weekly", isStudent: false })).toBeNull();
  });

  it("labels Monthly/Annually as STUDENT or REGULAR", () => {
    expect(membershipTypeLabel({ planType: "monthly", isStudent: true })).toBe("STUDENT");
    expect(membershipTypeLabel({ planType: "monthly", isStudent: false })).toBe("REGULAR");
    expect(membershipTypeLabel({ planType: "annually", isStudent: true })).toBe("STUDENT");
  });
});

describe("isDropIn", () => {
  it("is true only for Session", () => {
    expect(isDropIn("session")).toBe(true);
    expect(isDropIn("weekly")).toBe(false);
    expect(isDropIn("monthly")).toBe(false);
    expect(isDropIn("annually")).toBe(false);
  });
});

describe("planLabel / planDuration", () => {
  it("labels every known plan type", () => {
    expect(planLabel("session")).toBe("Session");
    expect(planLabel("weekly")).toBe("Weekly");
    expect(planLabel("monthly")).toBe("Monthly");
    expect(planLabel("annually")).toBe("Annually");
  });

  it("falls back to the raw value for an unknown plan, and an em dash for none", () => {
    expect(planLabel("bogus")).toBe("bogus");
    expect(planLabel(undefined)).toBe("—");
  });

  it("states each plan's duration in words", () => {
    expect(planDuration("session")).toBe("1 day");
    expect(planDuration("weekly")).toBe("7 days");
    expect(planDuration("monthly")).toBe("30 days");
    expect(planDuration("annually")).toBe("1 year");
  });
});

describe("formatDuration", () => {
  it("shows minutes only under an hour", () => {
    expect(formatDuration("2026-08-11T10:00:00.000Z", "2026-08-11T10:42:00.000Z")).toBe("42m");
  });

  it("shows hours and zero-padded minutes past an hour", () => {
    expect(formatDuration("2026-08-11T10:00:00.000Z", "2026-08-11T11:05:00.000Z")).toBe("1h 05m");
  });

  it("never goes negative if end precedes start", () => {
    expect(formatDuration("2026-08-11T10:00:00.000Z", "2026-08-11T09:00:00.000Z")).toBe("0m");
  });
});
