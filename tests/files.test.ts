import { it, expect } from "vitest";
import { validateFile } from "../src/lib/files";
it("rejects executable bytes disguised as a PNG", () =>
  expect(() =>
    validateFile(
      new TextEncoder().encode("MZ executable content"),
      "image/png",
    ),
  ).toThrow());
it("checks size and actual MIME signatures", () => {
  expect(() => validateFile(new Uint8Array(0), "image/png")).toThrow();
  expect(() =>
    validateFile(new Uint8Array(5242881), "application/pdf"),
  ).toThrow();
  expect(() =>
    validateFile(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      "image/png",
    ),
  ).not.toThrow();
});
