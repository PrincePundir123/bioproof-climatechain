import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  batches: vi.fn(),
  db: vi.fn(),
  rpc: vi.fn(),
  extract: vi.fn(),
  download: vi.fn(),
  insert: vi.fn(),
  cached: null as unknown,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/server")>()),
  actor: mocks.actor,
  batches: mocks.batches,
  db: mocks.db,
}));
vi.mock("@/lib/ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/ai")>()),
  extract: mocks.extract,
}));
import { POST } from "../src/app/api/ai/[id]/route";
function invoke() {
  return POST(
    new Request("http://localhost/api/ai/evidence", {
      method: "POST",
      headers: { origin: "http://localhost", host: "localhost" },
    }),
    { params: Promise.resolve({ id: "evidence" }) },
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-only-key");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network access in regression test");
    }),
  );
  mocks.cached = null;
  mocks.actor.mockResolvedValue({ id: "farmer", role: "FARMER" });
  mocks.batches.mockResolvedValue([
    { batch: { id: "batch", farmerId: "farmer" }, version: 0 },
  ]);
  mocks.rpc.mockResolvedValue({ data: "ALLOWED", error: null });
  mocks.download.mockResolvedValue({
    data: new Blob(["receipt"]),
    error: null,
  });
  mocks.extract.mockResolvedValue({
    model: "test-model",
    fields: { documentType: "receipt" },
  });
  mocks.db.mockReturnValue({
    rpc: mocks.rpc,
    storage: { from: () => ({ download: mocks.download }) },
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        limit: () => query,
        insert: (value: unknown) => {
          mocks.insert(value);
          return query;
        },
        maybeSingle: async () => ({ data: mocks.cached }),
        single: async () =>
          table === "evidence_assets"
            ? {
                data: {
                  id: "evidence",
                  batch_id: "batch",
                  uploaded_by: "farmer",
                  storage_path: "private/receipt",
                  file_type: "application/pdf",
                },
              }
            : { data: { id: "extraction" }, error: null },
      };
      return query;
    },
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AI quota enforcement at the HTTP boundary", () => {
  it.each([
    ["DAILY_LIMIT", null, "daily usage limit"],
    ["HOURLY_LIMIT", null, "hourly usage limit"],
    [null, { message: "function missing" }, "quota check unavailable"],
    ["UNKNOWN_RESULT", null, "quota check unavailable"],
    [null, null, "quota check unavailable"],
  ])(
    "blocks provider calls when quota returns %s",
    async (data, error, message) => {
      mocks.rpc.mockResolvedValue({ data, error });
      const response = await invoke();
      expect(response.ok).toBe(false);
      expect((await response.json()).error).toContain(message);
      expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("reserve_ai_attempt", {
        p_actor: "farmer",
      });
      expect(mocks.download).not.toHaveBeenCalled();
      expect(mocks.extract).not.toHaveBeenCalled();
      expect(mocks.insert).not.toHaveBeenCalled();
    },
  );

  it("reserves budget before downloading, calling the provider and saving", async () => {
    const response = await invoke();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "extraction" });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("reserve_ai_attempt", {
      p_actor: "farmer",
    });
    expect(mocks.extract).toHaveBeenCalledOnce();
    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.download.mock.invocationCallOrder[0],
    );
    expect(mocks.download.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.extract.mock.invocationCallOrder[0],
    );
    expect(mocks.extract.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.insert.mock.invocationCallOrder[0],
    );
  });

  it("returns cached extraction without spending quota or calling the provider", async () => {
    mocks.cached = { id: "already-extracted" };
    expect(await (await invoke()).json()).toEqual(mocks.cached);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.extract).not.toHaveBeenCalled();
  });

  it("does not reserve budget while the AI provider is unconfigured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect((await invoke()).status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.extract).not.toHaveBeenCalled();
  });

  it("does not save an extraction or refund an uncertain provider failure", async () => {
    mocks.extract.mockRejectedValue(new Error("AI provider unavailable"));
    const response = await invoke();
    expect(response.ok).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("does not spend quota on evidence belonging to another uploader", async () => {
    mocks.actor.mockResolvedValue({ id: "auditor", role: "AUDITOR" });
    expect((await invoke()).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.extract).not.toHaveBeenCalled();
  });
});
