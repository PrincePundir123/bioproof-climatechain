import { renderToStaticMarkup } from "react-dom/server";
import VerifyPage from "../src/app/verify/[id]/page";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type { Actor, Batch } from "../src/lib/domain";

const state = vi.hoisted(() => ({
  actor: null as Actor | null,
  db: vi.fn(),
  batches: vi.fn(),
  saveBatch: vi.fn(),
  extract: vi.fn(),
  anchor: vi.fn(),
  receipt: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server", async (original) => ({
  ...(await original<typeof import("../src/lib/server")>()),
  configured: () => true,
  actor: async () => {
    if (!state.actor) throw new Error("Authentication required");
    return state.actor;
  },
  db: state.db,
  batches: state.batches,
  saveBatch: state.saveBatch,
}));
vi.mock("@/lib/ai", async (original) => ({
  ...(await original<typeof import("../src/lib/ai")>()),
  extract: state.extract,
}));
vi.mock("@/lib/blockchain", async (original) => ({
  ...(await original<typeof import("../src/lib/blockchain")>()),
  chainConfigured: () => true,
  registry: async () => ({
    contract: { anchor: state.anchor, verify: state.verify },
    provider: { getTransactionReceipt: state.receipt },
  }),
}));
import {
  POST as extractEvidence,
  PATCH as confirmExtraction,
} from "../src/app/api/ai/[id]/route";
import { POST as anchorProof } from "../src/app/api/anchor/[id]/route";
import { POST as create } from "../src/app/api/workspace/route";
import { POST as action } from "../src/app/api/batches/[id]/route";
import {
  POST as upload,
  GET as download,
} from "../src/app/api/evidence/[id]/route";
import { GET as verify } from "../src/app/api/verify/[id]/route";
import { sha256, verifyChain } from "../src/lib/proof";

let pg: PGlite;
const farmer: Actor = {
  id: "10000000-0000-4000-8000-000000000001",
  role: "FARMER",
};
const collector: Actor = {
  id: "10000000-0000-4000-8000-000000000002",
  role: "COLLECTOR",
};
const processor: Actor = {
  id: "10000000-0000-4000-8000-000000000003",
  role: "PROCESSOR",
};
const auditor: Actor = {
  id: "10000000-0000-4000-8000-000000000004",
  role: "AUDITOR",
};
const outsider: Actor = {
  id: "10000000-0000-4000-8000-000000000005",
  role: "FARMER",
};
const objects = new Map<string, Uint8Array>();

// Narrow Supabase transport adapter: actual SQL migrations and commit_batch run
// in PGlite; authentication identity and private object storage are test doubles.
function table(name: string) {
  if (
    ![
      "farm_plots",
      "evidence_assets",
      "proof_anchors",
      "ai_extractions",
    ].includes(name)
  )
    throw new Error("Unexpected table " + name);
  let inserted: Record<string, unknown> | undefined;
  let deleting = false;
  let updated: Record<string, unknown> | undefined;
  const filters: [string, unknown][] = [];
  async function execute() {
    try {
      let sql: string;
      const values: unknown[] = [];
      if (inserted) {
        const keys = Object.keys(inserted);
        for (const key of keys) {
          if (!/^[a-z_][a-z0-9_]*$/.test(key))
            throw new Error("Invalid column");
          values.push(
            typeof inserted[key] === "object"
              ? JSON.stringify(inserted[key])
              : inserted[key],
          );
        }
        sql = `insert into ${name}(${keys.join(",")}) values(${keys.map((_, i) => "$" + (i + 1)).join(",")}) returning *`;
      } else {
        if (updated) {
          const assignments = Object.entries(updated).map(([column, value]) => {
            if (!/^[a-z_][a-z0-9_]*$/.test(column))
              throw new Error("Invalid column");
            values.push(value);
            return column + "=$" + values.length;
          });
          sql = `update ${name} set ${assignments.join(",")}`;
        } else sql = deleting ? `delete from ${name}` : `select * from ${name}`;
        if (filters.length)
          sql +=
            " where " +
            filters
              .map(([column, value]) => {
                if (!/^[a-z_][a-z0-9_]*$/.test(column))
                  throw new Error("Invalid column");
                values.push(value);
                return `${column}=$${values.length}`;
              })
              .join(" and ");
      }
      const result = await pg.query(sql, values);
      return { data: result.rows[0] ?? null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
  const query = {
    select: () => query,
    insert: (value: Record<string, unknown>) => {
      inserted = value;
      return query;
    },
    update: (value: Record<string, unknown>) => {
      updated = value;
      return query;
    },
    delete: () => {
      deleting = true;
      return query;
    },
    eq: (key: string, value: unknown) => {
      filters.push([key, value]);
      return query;
    },
    order: () => query,
    limit: () => query,
    single: execute,
    maybeSingle: execute,
    then: (resolve: (result: Awaited<ReturnType<typeof execute>>) => unknown) =>
      execute().then(resolve),
  };
  return query;
}

beforeAll(async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-only-key");
  state.extract.mockResolvedValue({
    model: "test-model",
    fields: {
      documentType: "Receipt",
      receiptNumber: "AUTOMATED-TEST-1000",
      documentDate: "2026-10-25",
      weight: 1000,
      unit: "kg",
      vehicleIdentifier: null,
      facilityName: "Test facility",
      relevantText: "AUTOMATED TEST extraction",
      uncertainties: [],
    },
  });
  state.anchor.mockResolvedValue({ hash: "0x" + "1".repeat(64) });
  state.receipt.mockResolvedValue(null);
  state.verify.mockResolvedValue(true);
  pg = new PGlite();
  await pg.exec(
    "create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb); create function auth.uid() returns uuid language sql as 'select null::uuid'; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);",
  );
  for (const migration of [
    "001_evidence.sql",
    "002_ai_limits.sql",
    "003_atomic_ai_budget.sql",
  ])
    await pg.exec(
      readFileSync("supabase/migrations/" + migration, "utf8").replace(
        "create extension if not exists pgcrypto;",
        "",
      ),
    );
  for (const actor of [farmer, collector, processor, auditor, outsider]) {
    await pg.query("insert into auth.users values($1,'{}')", [actor.id]);
    await pg.query("update profiles set role=$1 where id=$2", [
      actor.role,
      actor.id,
    ]);
  }
  state.batches.mockImplementation(async () => {
    const result = await pg.query<{ document: Batch; version: number }>(
      "select document,version from residue_batches",
    );
    return result.rows.map((row) => ({
      batch: row.document,
      version: row.version,
    }));
  });
  state.saveBatch.mockImplementation(
    async (batch: Batch, version: number, key: string, actorId: string) => {
      await pg.query("select commit_batch($1,$2,$3,$4)", [
        JSON.stringify(batch),
        version,
        key,
        actorId,
      ]);
    },
  );
  state.db.mockReturnValue({
    from: table,
    rpc: async (name: string, args: { p_actor: string }) => {
      if (name !== "reserve_ai_attempt") throw new Error("Unexpected RPC");
      const result = await pg.query<{ reserve_ai_attempt: string }>(
        "select reserve_ai_attempt($1)",
        [args.p_actor],
      );
      return { data: result.rows[0].reserve_ai_attempt, error: null };
    },
    storage: {
      from: () => ({
        upload: async (path: string, bytes: Uint8Array) => {
          objects.set(path, bytes);
          return { error: null };
        },
        download: async (path: string) => ({
          data: new Blob([new Uint8Array(objects.get(path)!)]),
          error: objects.has(path) ? null : new Error("Missing object"),
        }),
        remove: async (paths: string[]) => {
          paths.forEach((path) => objects.delete(path));
          return { error: null };
        },
        createSignedUrl: async (path: string, seconds: number) => ({
          data: {
            signedUrl: `https://private-storage.test/${path}?expires=${seconds}`,
          },
          error: objects.has(path) ? null : new Error("Missing object"),
        }),
      }),
    },
  });
}, 30000);
afterAll(async () => {
  await pg?.close();
  objects.clear();
  vi.unstubAllEnvs();
});

function request(path: string, body: unknown, key = crypto.randomUUID()) {
  const multipart = body instanceof FormData;
  return new Request("http://localhost" + path, {
    method: "POST",
    headers: {
      origin: "http://localhost",
      host: "localhost",
      "idempotency-key": key,
      ...(!multipart ? { "content-type": "application/json" } : {}),
    },
    body: multipart ? body : JSON.stringify(body),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });
async function expectJson(response: Response, status = 200) {
  const body = await response.json();
  expect(response.status, JSON.stringify(body)).toBe(status);
  return body;
}

it("persists one complete batch from farmer creation to independent audit and redacted public verification", async () => {
  state.actor = farmer;
  const plot = await expectJson(
    await create(
      request("/api/workspace", {
        kind: "plot",
        display_name: "AUTOMATED TEST plot",
        crop_type: "Rice",
        area_hectares: 1,
        approximate_region: "Test region",
      }),
    ),
    201,
  );
  let batch: Batch = await expectJson(
    await create(
      request("/api/workspace", {
        plotId: plot.id,
        region: "Test region",
        residue: "Rice straw",
        declared: { kg: 1000, basis: "dry" },
        totalResidue: 2000,
      }),
    ),
    201,
  );
  expect(batch.status).toBe("DRAFT");
  const id = batch.id;
  async function act(actor: Actor, input: unknown, status = 200, key?: string) {
    state.actor = actor;
    return expectJson(
      await action(request("/api/batches/" + id, input, key), params(id)),
      status,
    );
  }
  async function proof(status: number) {
    return expectJson(
      await verify(
        new Request("http://localhost/api/verify/" + id),
        params(id),
      ),
      status,
    );
  }
  await proof(404); // Unreviewed real records must not be published.
  await act(processor, { type: "DECLARE" }, 403);
  batch = await act(farmer, { type: "DECLARE" });
  expect(batch.status).toBe("DECLARED");

  const pickupKey = crypto.randomUUID();
  const pickup = {
    type: "PICKUP",
    measurement: { kg: 1000, basis: "dry" },
    timestamp: "2026-10-25T08:00:00Z",
    notes: "AUTOMATED TEST collection scale.",
  };
  batch = await act(collector, pickup, 200, pickupKey);
  expect(batch.status).toBe("PICKED_UP");
  expect(batch.findings.some((f) => f.code === "MISSING_PICKUP_EVIDENCE")).toBe(
    true,
  );
  const eventCount = batch.events.length;
  expect((await act(collector, pickup, 200, pickupKey)).events).toHaveLength(
    eventCount,
  );

  const png = new Uint8Array(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  async function attach(
    actor: Actor,
    type: string,
    name: string,
    bytes: Uint8Array,
  ) {
    state.actor = actor;
    const form = new FormData();
    form.set("type", type);
    form.set(
      "file",
      new File([new Uint8Array(bytes)], name, { type: "image/png" }),
    );
    return expectJson(
      await upload(request("/api/evidence/" + id, form), params(id)),
    );
  }
  batch = await attach(collector, "pickup", "AUTOMATED-TEST-pickup.png", png);
  expect(batch.evidence[0].sha256).toBe(await sha256(png));

  batch = await act(processor, {
    type: "INTAKE",
    measurement: { kg: 1000, basis: "dry" },
    timestamp: "2026-10-25T10:00:00Z",
    receipt: "AUTOMATED-TEST-1000",
    facility: "Test facility",
    process: "Composting",
    notes: "AUTOMATED TEST intake scale.",
  });
  expect(batch.status).toBe("RECEIVED");
  // A second genuine PNG byte stream avoids duplicate-file detection.
  const intakePng = new Uint8Array([
    ...png,
    ...new TextEncoder().encode("AUTOMATED TEST intake"),
  ]);
  batch = await attach(
    processor,
    "intake",
    "AUTOMATED-TEST-intake.png",
    intakePng,
  );
  expect(batch.evidence).toHaveLength(2);
  expect(objects.size).toBe(2);
  const intakeEvidenceId = batch.evidence.find((e) => e.type === "intake")!.id;
  state.actor = auditor;
  expect(
    (
      await extractEvidence(
        request("/api/ai/" + intakeEvidenceId, {}),
        params(intakeEvidenceId),
      )
    ).status,
  ).toBe(403);
  expect(state.extract).not.toHaveBeenCalled();
  state.actor = processor;
  const extraction = await expectJson(
    await extractEvidence(
      request("/api/ai/" + intakeEvidenceId, {}),
      params(intakeEvidenceId),
    ),
  );
  expect(extraction.extracted_fields_json.weight).toBe(batch.intake!.kg);
  expect(extraction.extracted_fields_json.receiptNumber).toBe(
    batch.intake!.receipt,
  );
  expect(state.extract).toHaveBeenCalledOnce();
  const cached = await expectJson(
    await extractEvidence(
      request("/api/ai/" + intakeEvidenceId, {}),
      params(intakeEvidenceId),
    ),
  );
  expect(cached.id).toBe(extraction.id);
  expect(state.extract).toHaveBeenCalledOnce();
  expect(
    (await pg.query("select * from ai_attempt_reservations")).rows,
  ).toHaveLength(1);
  const confirmRequest = request(
    "/api/ai/" + intakeEvidenceId,
    extraction.extracted_fields_json,
  );
  await expectJson(
    await confirmExtraction(
      new Request(confirmRequest, { method: "PATCH" }),
      params(intakeEvidenceId),
    ),
  );
  batch = (await state.batches())[0].batch;
  expect(batch.events.at(-1)?.type).toBe("EXTRACTION_CONFIRMED");
  expect(batch.events.at(-1)?.evidenceIds).toContain(intakeEvidenceId);
  expect(batch.intake!.kg).toBe(1000); // Confirming AI never changes measurements.
  expect((await verifyChain(batch.events)).valid).toBe(true);
  expect(
    (await anchorProof(request("/api/anchor/" + id, {}), params(id))).status,
  ).toBe(403);
  expect(state.anchor).not.toHaveBeenCalled();
  state.actor = auditor;
  expect(
    (await anchorProof(request("/api/anchor/" + id, {}), params(id))).status,
  ).toBe(400);
  expect(state.anchor).not.toHaveBeenCalled();
  batch = await act(processor, { type: "REQUEST_REVIEW" });
  expect(batch.status).toBe("UNDER_REVIEW");
  expect(batch.findings).toEqual([]);
  await act(
    farmer,
    { type: "APPROVE", reason: "Unauthorized test approval attempt" },
    403,
  );

  state.actor = auditor;
  for (const asset of batch.evidence) {
    const response = await download(
      new Request("http://localhost/api/evidence/" + asset.id),
      params(asset.id),
    );
    const signed = await expectJson(response);
    expect(signed.expiresIn).toBe(60);
    expect(signed.url).toContain(asset.storagePath);
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
  batch = await act(auditor, {
    type: "SOIL_REVIEW",
    reason: "AUTOMATED TEST advisory review; not a real agronomic attestation.",
  });
  batch = await act(auditor, {
    type: "APPROVE",
    reason:
      "AUTOMATED TEST independent review of two matching measurements and test evidence.",
  });
  expect(batch.status).toBe("APPROVED");
  expect(batch.decision?.actorId).toBe(auditor.id);
  expect((await verifyChain(batch.events)).valid).toBe(true);

  const rows = await pg.query<{ document: Batch; version: number }>(
    "select document,version from residue_batches where id=$1",
    [id],
  );
  expect(rows.rows[0].document.status).toBe("APPROVED");
  expect(rows.rows[0].version).toBe(batch.events.length - 1);
  for (const tableName of [
    "collection_events",
    "processor_receipts",
    "audit_decisions",
  ]) {
    expect(
      (await pg.query(`select * from ${tableName} where batch_id=$1`, [id]))
        .rows,
    ).toHaveLength(1);
  }
  expect(
    (await pg.query("select * from evidence_assets where batch_id=$1", [id]))
      .rows,
  ).toHaveLength(2);

  state.actor = null; // Public verification works without a session.
  const publicProof = await proof(200);
  expect(publicProof.record.status).toBe("APPROVED");
  expect(publicProof.record.pickup.kg).toBe(1000);
  expect(publicProof.record.intake.kg).toBe(1000);
  expect(publicProof.record.root).toBe(batch.events.at(-1)?.hash);
  expect(publicProof.integrity.valid).toBe(true);
  expect(publicProof.record.anchor.status).toBe("NOT_REQUESTED");
  const serialized = JSON.stringify(publicProof);
  for (const secret of [
    farmer.id,
    collector.id,
    processor.id,
    auditor.id,
    "storagePath",
    "uploadedBy",
    "AUTOMATED-TEST-pickup.png",
    "AUTOMATED-TEST-1000",
    batch.decision!.reason,
  ])
    expect(serialized).not.toContain(secret);
  for (const evidence of batch.evidence)
    expect(serialized).not.toContain(evidence.storagePath);
  const html = renderToStaticMarkup(await VerifyPage(params(id)));
  expect(html).toContain("Local chain matches");
  expect(html).toContain("APPROVED");
  expect(html).toContain("No confirmed anchor");
  expect(html).toContain(batch.events.at(-1)!.hash);
  expect(html).toContain("/api/verify/" + id);
  expect(html).not.toContain("AUTOMATED-TEST-pickup.png");
  expect(html).not.toContain(farmer.id);
  state.actor = auditor;
  const submitted = await expectJson(
    await anchorProof(request("/api/anchor/" + id, {}), params(id)),
  );
  expect(submitted.transactionHash).toBe("0x" + "1".repeat(64));
  expect(state.anchor).toHaveBeenCalledOnce();
  const pending = await expectJson(
    await anchorProof(request("/api/anchor/" + id, {}), params(id)),
  );
  expect(pending.message).toContain("pending confirmation");
  expect(state.anchor).toHaveBeenCalledOnce();
  state.receipt.mockResolvedValue({ status: 1 });
  const confirmed = await expectJson(
    await anchorProof(request("/api/anchor/" + id, {}), params(id)),
  );
  expect(confirmed.message).toContain("Confirmed transaction");
  expect(state.anchor).toHaveBeenCalledOnce();
  expect(
    (
      await pg.query<{ confirmation_status: string }>(
        "select confirmation_status from proof_anchors",
      )
    ).rows[0].confirmation_status,
  ).toBe("CONFIRMED");
  state.actor = null;
  const anchoredProof = await proof(200);
  expect(anchoredProof.record.anchor.status).toBe("CONFIRMED");
  expect(anchoredProof.chainCheck).toContain(
    "matches the approved event prefix",
  );
  expect(state.verify).toHaveBeenCalledWith(
    expect.stringMatching(/^0x[0-9a-f]{64}$/),
    "0x" + batch.events.at(-1)!.hash,
    batch.events.length,
  );
  const anchoredHtml = renderToStaticMarkup(await VerifyPage(params(id)));
  expect(anchoredHtml).toContain("Confirmed anchor");
  expect(anchoredHtml).toContain(
    "https://sepolia.etherscan.io/tx/" + submitted.transactionHash,
  );
  expect(anchoredHtml).not.toContain(batch.evidence[0].storagePath);
  state.verify.mockResolvedValue(false);
  expect((await proof(200)).record.anchor.status).toBe("FAILED");
  expect(renderToStaticMarkup(await VerifyPage(params(id)))).toContain(
    "No confirmed anchor",
  );
  state.verify.mockResolvedValue(true);
  state.actor = outsider;
  expect(
    (
      await download(
        new Request("http://localhost/api/evidence/" + batch.evidence[0].id),
        params(batch.evidence[0].id),
      )
    ).status,
  ).toBe(403);
}, 30000);
