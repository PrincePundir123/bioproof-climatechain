import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import { appendEvent } from "../src/lib/proof";
import { applyAction } from "../src/lib/workflow";
import type { Batch } from "../src/lib/domain";
let pg: PGlite;
const farmer = "00000000-0000-4000-8000-000000000001",
  collector = "00000000-0000-4000-8000-000000000002",
  plot = "00000000-0000-4000-8000-000000000003";
let b: Batch;
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql as 'select null::uuid';create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);`,
  );
  const sql = readFileSync(
    "supabase/migrations/001_evidence.sql",
    "utf8",
  ).replace("create extension if not exists pgcrypto;", "");
  await pg.exec(sql);
  await pg.exec(readFileSync("supabase/migrations/002_ai_limits.sql", "utf8"));
  await pg.exec(
    readFileSync("supabase/migrations/003_atomic_ai_budget.sql", "utf8"),
  );
  await pg.query("insert into auth.users values($1,$3),($2,$3)", [
    farmer,
    collector,
    "{}",
  ]);
  await pg.query("update profiles set role='COLLECTOR' where id=$1", [
    collector,
  ]);
  await pg.query(
    "insert into farm_plots(id,farmer_id,display_name,crop_type,area_hectares,approximate_region) values($1,$2,'Test plot','Rice',1,'Punjab')",
    [plot, farmer],
  );
  b = {
    id: "BP-TEST",
    farmerId: farmer,
    plotId: plot,
    region: "Punjab",
    residue: "Rice straw",
    declared: { kg: 600, basis: "wet" },
    status: "DRAFT",
    evidence: [],
    events: [],
    findings: [],
    anchor: { status: "NOT_REQUESTED" },
    synthetic: false,
  };
  b.events = await appendEvent([], {
    id: crypto.randomUUID(),
    batchId: b.id,
    type: "CREATE",
    actor: { id: farmer, role: "FARMER" },
    timestamp: new Date().toISOString(),
    evidenceIds: [],
    payload: { kg: 600 },
  });
}, 30000);
afterAll(async () => {
  await pg?.close();
});
it("limits concurrent AI attempts through a database counter", async () => {
  const results = await Promise.all(
    Array.from({ length: 12 }, () =>
      pg.query<{ consume_ai_attempt: boolean }>(
        "select consume_ai_attempt($1)",
        [farmer],
      ),
    ),
  );
  expect(results.filter((r) => r.rows[0].consume_ai_attempt)).toHaveLength(10);
});
it("commits aggregate and event atomically; repeated request does not duplicate", async () => {
  const args = [JSON.stringify(b), -1, b.events[0].id, farmer];
  await pg.query("select commit_batch($1,$2,$3,$4)", args);
  const repeated = await pg.query<{ commit_batch: number }>(
    "select commit_batch($1,$2,$3,$4)",
    args,
  );
  expect(repeated.rows[0].commit_batch).toBe(-1);
  expect((await pg.query("select * from audit_events")).rows).toHaveLength(1);
});
it("updates through a valid lifecycle and blocks concurrent stale writes", async () => {
  b = await applyAction(
    b,
    { id: farmer, role: "FARMER" },
    { type: "DECLARE" },
    [],
  );
  await pg.query("select commit_batch($1,$2,$3,$4)", [
    JSON.stringify(b),
    0,
    b.events.at(-1)!.id,
    farmer,
  ]);
  const pickup = await applyAction(
    b,
    { id: collector, role: "COLLECTOR" },
    {
      type: "PICKUP",
      measurement: { kg: 600, basis: "wet" },
      timestamp: new Date().toISOString(),
      notes: "Scale measurement",
    },
    [],
  );
  await expect(
    pg.query("select commit_batch($1,$2,$3,$4)", [
      JSON.stringify(pickup),
      0,
      pickup.events.at(-1)!.id,
      collector,
    ]),
  ).rejects.toThrow("Concurrent");
  await pg.query("select commit_batch($1,$2,$3,$4)", [
    JSON.stringify(pickup),
    1,
    pickup.events.at(-1)!.id,
    collector,
  ]);
  expect((await pg.query("select * from collection_events")).rows).toHaveLength(
    1,
  );
  b = pickup;
});
it("rejects altered history without partially changing the aggregate", async () => {
  const changed = await applyAction(
    b,
    { id: collector, role: "COLLECTOR" },
    { type: "CORRECTION", reason: "Correction request test" },
    [],
  );
  changed.events[0].payload.kg = 999;
  await expect(
    pg.query("select commit_batch($1,$2,$3,$4)", [
      JSON.stringify(changed),
      2,
      changed.events.at(-1)!.id,
      collector,
    ]),
  ).rejects.toThrow("History");
  expect(
    (await pg.query<{ version: number }>("select version from residue_batches"))
      .rows[0].version,
  ).toBe(2);
});
it("database triggers protect history and browsers have no private table access", async () => {
  await expect(
    pg.exec("update audit_events set event_hash=repeat('a',64)"),
  ).rejects.toThrow("Append-only");
  await pg.exec("set role authenticated");
  await expect(pg.exec("select * from evidence_assets")).rejects.toThrow(
    "permission denied",
  );
  await expect(pg.exec("update profiles set role='ADMIN'")).rejects.toThrow(
    "permission denied",
  );
  await pg.exec("reset role");
});

it("reserves the final daily AI slot once and includes failed calls in usage", async () => {
  await pg.exec("delete from ai_usage; delete from ai_attempt_reservations");
  await pg.query(
    "insert into ai_attempt_reservations(actor_id) select $1 from generate_series(1,99)",
    [farmer],
  );
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      pg.query<{ reserve_ai_attempt: string }>(
        "select reserve_ai_attempt($1)",
        [collector],
      ),
    ),
  );
  expect(
    results.filter((r) => r.rows[0].reserve_ai_attempt === "ALLOWED"),
  ).toHaveLength(1);
  expect(
    results.filter((r) => r.rows[0].reserve_ai_attempt === "DAILY_LIMIT"),
  ).toHaveLength(4);
  await pg.exec(
    "update ai_attempt_reservations set reserved_at=now()-interval '25 hours'",
  );
  expect(
    (
      await pg.query<{ reserve_ai_attempt: string }>(
        "select reserve_ai_attempt($1)",
        [collector],
      )
    ).rows[0].reserve_ai_attempt,
  ).toBe("ALLOWED");
  await pg.exec("set role authenticated");
  await expect(
    pg.query("select reserve_ai_attempt($1)", [collector]),
  ).rejects.toThrow("permission denied");
  await pg.exec("reset role");
});

it("enforces hourly quota through the new reservation endpoint", async () => {
  await pg.exec("delete from ai_usage; delete from ai_attempt_reservations");
  const results = await Promise.all(
    Array.from({ length: 12 }, () =>
      pg.query<{ reserve_ai_attempt: string }>(
        "select reserve_ai_attempt($1)",
        [farmer],
      ),
    ),
  );
  expect(
    results.filter((r) => r.rows[0].reserve_ai_attempt === "ALLOWED"),
  ).toHaveLength(10);
  expect(
    results.filter((r) => r.rows[0].reserve_ai_attempt === "HOURLY_LIMIT"),
  ).toHaveLength(2);
  expect(
    (await pg.query("select * from ai_attempt_reservations")).rows,
  ).toHaveLength(10);
});
