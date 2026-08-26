import { describe, it, expect } from "vitest";
import { getMemberProfile, listMembers, filterMembers, memberCount } from "./members.js";

describe("getMemberProfile", () => {
  it("is stubbed until a backend profile-read endpoint exists", async () => {
    expect(await getMemberProfile("1001")).toBeNull();
  });
});

describe("listMembers", () => {
  it("is stubbed empty until a backend roster-read endpoint exists", async () => {
    expect(await listMembers()).toEqual([]);
  });
});

describe("memberCount", () => {
  it("is stubbed to 0 until a backend count-read endpoint exists", async () => {
    expect(await memberCount()).toBe(0);
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
