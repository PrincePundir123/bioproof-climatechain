import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { extract } from "../src/lib/ai";
const fields = {
  documentType: "Receipt",
  receiptNumber: "TEST-1000",
  documentDate: "2026-10-25",
  weight: 1000,
  unit: "kg",
  vehicleIdentifier: null,
  facilityName: "Test mill",
  relevantText: "AUTOMATED TEST receipt",
  uncertainties: [],
};
beforeEach(() => vi.stubEnv("GEMINI_API_KEY", "test-only-key"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("sends document bytes and a schema to Gemini and validates returned fields", async () => {
  vi.stubEnv("GEMINI_MODEL", "test-model");
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(fields) }] } }],
    }),
  });
  vi.stubGlobal("fetch", fetcher);
  expect(await extract(new Uint8Array([1, 2, 3]), "image/png")).toEqual({
    model: "test-model",
    fields,
  });
  const [url, options] = fetcher.mock.calls[0];
  const body = JSON.parse(options.body);
  expect(url).toContain("/models/test-model:generateContent");
  expect(options.headers["x-goog-api-key"]).toBe("test-only-key");
  expect(body.contents[0].parts[1].inlineData).toEqual({
    mimeType: "image/png",
    data: "AQID",
  });
  expect(body.generationConfig.responseJsonSchema.required).toContain(
    "uncertainties",
  );
});
it("rejects AI output outside the extraction schema", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: JSON.stringify({ ...fields, approveClaim: true }) },
              ],
            },
          },
        ],
      }),
    }),
  );
  await expect(extract(new Uint8Array([1]), "image/png")).rejects.toThrow();
});
it("does not expose provider response details on errors", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
  await expect(extract(new Uint8Array([1]), "image/png")).rejects.toThrow(
    "AI provider unavailable",
  );
});

it("defaults to the model verified for new Gemini accounts", async () => {
  vi.stubEnv("GEMINI_MODEL", "");
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(fields) }] } }],
    }),
  });
  vi.stubGlobal("fetch", fetcher);
  expect((await extract(new Uint8Array([1]), "image/png")).model).toBe(
    "gemini-3.1-flash-lite",
  );
  expect(fetcher.mock.calls[0][0]).toContain(
    "/models/gemini-3.1-flash-lite:generateContent",
  );
});
