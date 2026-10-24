import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import { batches } from "../src/lib/server";

const document = () => ({ id: "BP-test", anchor: { status: "NOT_REQUESTED" } });
function databaseResults(results: unknown[]) {
  mocks.createClient.mockImplementation(() => {
    const result = results.shift();
    const chain: Record<string, unknown> = {};
    for (const name of ["from", "select", "in"]) chain[name] = () => chain;
    chain.order = (...args: unknown[]) => {
      mocks.order(...args);
      return chain;
    };
    chain.limit = (...args: unknown[]) => {
      mocks.limit(...args);
      return Promise.resolve(result);
    };
    return chain;
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test");
});
afterEach(() => vi.unstubAllEnvs());

describe("workspace anchor status regression tests", () => {
  it.each(["CONFIRMED", "PENDING", "FAILED"])(
    "loads saved %s status without changing the batch document",
    async (status) => {
      const stored = document();
      databaseResults([
        { data: [{ document: stored, version: 1 }], error: null, count: 1 },
        {
          data: [
            {
              id: stored.id,
              proof_anchors: [
                {
                  confirmation_status: status,
                  evidence_root: "root",
                  transaction_hash: status === "PENDING" ? null : "tx",
                  proof_version: 2,
                },
              ],
            },
          ],
          error: null,
        },
      ]);
      const [result] = await batches(true);
      expect(result.version).toBe(1);
      expect(result.batch.anchor).toEqual({
        status,
        root: "root",
        transactionHash: status === "PENDING" ? undefined : "tx",
      });
      expect(stored.anchor.status).toBe("NOT_REQUESTED");
      // The relation must choose the newest version rather than an old approval.
      expect(mocks.order).toHaveBeenCalledWith("proof_version", {
        referencedTable: "proof_anchors",
        ascending: false,
      });
      expect(mocks.limit).toHaveBeenCalledWith(1, {
        referencedTable: "proof_anchors",
      });
    },
  );

  it("keeps NOT_REQUESTED when no anchor exists", async () => {
    const stored = document();
    databaseResults([
      { data: [{ document: stored, version: 0 }], count: 1 },
      { data: [{ id: stored.id, proof_anchors: [] }] },
    ]);
    expect((await batches(true))[0].batch.anchor).toEqual({
      status: "NOT_REQUESTED",
    });
  });

  it("reports anchor read failure instead of silently showing NOT_REQUESTED", async () => {
    databaseResults([
      { data: [{ document: document(), version: 0 }], count: 1 },
      { data: null, error: { message: "database unavailable" } },
    ]);
    await expect(batches(true)).rejects.toThrow("Anchor status unavailable");
  });

  it("does not overlay display status on batches loaded for mutation", async () => {
    databaseResults([
      { data: [{ document: document(), version: 0 }], count: 1 },
    ]);
    expect((await batches())[0].batch.anchor.status).toBe("NOT_REQUESTED");
    expect(mocks.createClient).toHaveBeenCalledOnce();
  });

  it("does not request anchors for an empty workspace", async () => {
    databaseResults([{ data: [], count: 0 }]);
    expect(await batches(true)).toEqual([]);
    expect(mocks.createClient).toHaveBeenCalledOnce();
  });
});
