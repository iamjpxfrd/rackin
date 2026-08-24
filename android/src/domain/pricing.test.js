import { describe, it, expect } from "@jest/globals";
import { suggestedAmount, FLAT_PRICES, MONTHLY_PRICES, ANNUAL_PRICES } from "./pricing.js";

describe("suggestedAmount", () => {
  it("ignores isStudent and promoActive for Session and Weekly", () => {
    expect(suggestedAmount("session", { isStudent: true, promoActive: true })).toBe(
      FLAT_PRICES.session,
    );
    expect(suggestedAmount("weekly", { isStudent: true, promoActive: true })).toBe(
      FLAT_PRICES.weekly,
    );
  });

  it("splits Monthly by regular vs. student at full price", () => {
    expect(suggestedAmount("monthly", { isStudent: false })).toBe(MONTHLY_PRICES.full.regular);
    expect(suggestedAmount("monthly", { isStudent: true })).toBe(MONTHLY_PRICES.full.student);
  });

  it("discounts Monthly when the promo is active", () => {
    expect(suggestedAmount("monthly", { isStudent: false, promoActive: true })).toBe(
      MONTHLY_PRICES.promo.regular,
    );
    expect(suggestedAmount("monthly", { isStudent: true, promoActive: true })).toBe(
      MONTHLY_PRICES.promo.student,
    );
  });

  it("splits Annually by regular vs. student, with no promo of its own", () => {
    expect(suggestedAmount("annually", { isStudent: false, promoActive: true })).toBe(
      ANNUAL_PRICES.regular,
    );
    expect(suggestedAmount("annually", { isStudent: true, promoActive: true })).toBe(
      ANNUAL_PRICES.student,
    );
  });

  it("defaults to regular, non-promo pricing when options are omitted", () => {
    expect(suggestedAmount("monthly")).toBe(MONTHLY_PRICES.full.regular);
  });

  it("returns null for an unrecognized plan rather than a made-up price", () => {
    expect(suggestedAmount("annual")).toBeNull();
  });
});
