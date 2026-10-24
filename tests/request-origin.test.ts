import { describe, expect, it } from "vitest";
import { checkOrigin } from "../src/lib/request-origin";

describe("request origin protection", () => {
  const request = (origin?: string, host = "127.0.0.1:3101") =>
    new Request("http://localhost:3101/api/auth", {
      headers: { host, ...(origin ? { origin } : {}) },
    });

  it("accepts the browser host when Next normalizes the URL", () => {
    expect(() => checkOrigin(request("http://127.0.0.1:3101"))).not.toThrow();
    expect(() =>
      checkOrigin(request("http://localhost:3101", "localhost:3101")),
    ).not.toThrow();
  });

  it.each([
    undefined,
    "null",
    "https://attacker.example",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3101",
    "http://localhost:3101",
  ])("rejects a mismatched or missing origin: %s", (origin) => {
    expect(() => checkOrigin(request(origin))).toThrow("Invalid request origin");
  });

  it("does not trust forwarded host headers", () => {
    const incoming = request("https://attacker.example");
    incoming.headers.set("x-forwarded-host", "attacker.example");
    incoming.headers.set("x-forwarded-proto", "https");
    expect(() => checkOrigin(incoming)).toThrow("Invalid request origin");
  });
});
