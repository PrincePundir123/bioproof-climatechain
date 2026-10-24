import { describe, expect, it } from "vitest";
import { createSchema, measurementSchema } from "../src/lib/domain";
import { loginFailure } from "../src/lib/auth-errors";

describe("residue validation", () => {
  const input = {
    plotId: "plot",
    region: "Punjab",
    residue: "Rice straw",
    declared: { kg: 100, basis: "dry" },
    totalResidue: 50,
  };
  it("rejects removal above generated residue", () => {
    expect(createSchema.safeParse(input).success).toBe(false);
    expect(
      createSchema.safeParse({ ...input, totalResidue: 100 }).success,
    ).toBe(true);
    expect(
      createSchema.safeParse({ ...input, totalResidue: undefined }).success,
    ).toBe(true);
  });
  it.each(["", "  ", null, undefined])(
    "keeps missing moisture unknown: %s",
    (moisture) => {
      expect(
        measurementSchema.parse({ kg: 100, basis: "wet", moisture }).moisture,
      ).toBeUndefined();
    },
  );
  it("preserves measured zero and rejects invalid moisture", () => {
    expect(
      measurementSchema.parse({ kg: 100, basis: "wet", moisture: "0" })
        .moisture,
    ).toBe(0);
    expect(
      measurementSchema.safeParse({ kg: 100, basis: "wet", moisture: 100 })
        .success,
    ).toBe(false);
  });
});

describe("safe login errors", () => {
  it.each([
    ["invalid_credentials", 401, "Incorrect"],
    ["email_not_confirmed", 403, "Confirm"],
    ["user_banned", 403, "suspended"],
    ["over_request_rate_limit", 429, "wait"],
    ["unexpected_failure", 503, "temporarily"],
  ])("handles %s", (code, status, text) => {
    expect(loginFailure({ code })).toEqual({
      status,
      error: expect.stringContaining(text),
    });
  });
  it("handles transport and HTTP rate-limit errors", () => {
    expect(loginFailure({ name: "AuthRetryableFetchError" }).status).toBe(503);
    expect(loginFailure({ status: 429 }).status).toBe(429);
  });
});
