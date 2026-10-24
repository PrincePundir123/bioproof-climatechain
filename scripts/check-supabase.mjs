import { readFile } from "node:fs/promises";
import { verifyChain } from "../src/lib/proof.ts";

// Read-only diagnostics. Never print credentials or private record payloads.
async function main() {
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    if (!process.env[name]?.trim()) throw new Error(`Missing ${name}`);
  }
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "Use the project origin URL only; remove /rest/v1/ or other paths from NEXT_PUBLIC_SUPABASE_URL.",
    );
  }
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  async function request(path, key = secret, extra = {}) {
    const response = await fetch(new URL(path, url), {
      headers: { apikey: key, Authorization: `Bearer ${key}`, ...extra },
      signal: AbortSignal.timeout(15000),
    });
    return response;
  }
  async function expectOk(path, label, key = secret, extra = {}) {
    const response = await request(path, key, extra);
    if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
    return response;
  }
  await expectOk("/auth/v1/settings", "Public API key", anon);
  console.log("PASS: public authentication connection");
  for (const migration of ["001_evidence.sql", "002_ai_limits.sql"]) {
    const sql = await readFile(
      new URL(`../supabase/migrations/${migration}`, import.meta.url),
      "utf8",
    );
    for (const [, table] of sql.matchAll(/create table public\.(\w+)/g)) {
      await expectOk(`/rest/v1/${table}?select=*&limit=0`, table);
      const denied = await request(`/rest/v1/${table}?select=*&limit=0`, anon);
      if (![401, 403].includes(denied.status))
        throw new Error(
          `Anonymous access not denied for ${table}: HTTP ${denied.status}`,
        );
    }
    console.log(
      `PASS: ${migration} tables accessible to server, denied to anonymous clients`,
    );
  }
  const spec = await (await expectOk("/rest/v1/", "RPC discovery")).json();
  for (const name of ["commit_batch", "consume_ai_attempt", "reserve_ai_attempt"]) {
    if (!spec.paths?.[`/rpc/${name}`])
      throw new Error(`Missing function ${name}`);
  }
  console.log("PASS: custody and AI counter functions present");
  const bucket = await (
    await expectOk("/storage/v1/bucket/evidence", "Evidence bucket")
  ).json();
  if (bucket.public !== false)
    throw new Error("Evidence bucket must be private");
  console.log("PASS: evidence bucket is private");
  const response = await expectOk(
    "/rest/v1/residue_batches?select=id,status,version,document&limit=1000",
    "Batch integrity",
    secret,
    { Prefer: "count=exact" },
  );
  const count = Number(response.headers.get("content-range")?.split("/")[1]);
  if (!Number.isFinite(count) || count > 1000)
    throw new Error("Cannot verify all records within the 1,000-record limit");
  const rows = await response.json();
  for (const row of rows) {
    const result = await verifyChain(row.document.events);
    if (
      !result.valid ||
      row.document.status !== row.status ||
      row.document.id !== row.id ||
      row.version !== row.document.events.length - 1
    ) {
      throw new Error(`Integrity or projection mismatch for ${row.id}`);
    }
  }
  console.log(
    `PASS: ${rows.length} saved batch hash chains and status/version projections`,
  );
  console.log(
    "Read-only checks complete. Login, upload and independent custody decisions still require an end-to-end account workflow.",
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Supabase check failed",
  );
  process.exitCode = 1;
});
