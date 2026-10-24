import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import { batches } from "../src/lib/server";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test");
});
it("hydrates saved anchor status without changing the persisted batch document", async () => {
  const document = { id: "BP-test", anchor: { status: "NOT_REQUESTED" } };
  const results = [
    { data: [{ document, version: 1 }], error: null, count: 1 },
    {
      data: [
        {
          id: "BP-test",
          proof_anchors: [
            {
              confirmation_status: "CONFIRMED",
              evidence_root: "root",
              transaction_hash: "tx",
              proof_version: 2,
            },
          ],
        },
      ],
      error: null,
    },
  ];
  mocks.createClient.mockImplementation(() => {
    const result = results.shift();
    const chain: Record<string, unknown> = {};
    for (const name of ["from", "select", "order", "in"])
      chain[name] = () => chain;
    chain.limit = () => Promise.resolve(result);
    return chain;
  });
  expect((await batches(true))[0].batch.anchor).toEqual({
    status: "CONFIRMED",
    root: "root",
    transactionHash: "tx",
  });
  expect(document.anchor.status).toBe("NOT_REQUESTED");
});
