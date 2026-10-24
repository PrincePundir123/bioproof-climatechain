import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Actor, Batch, Role } from "./domain";
export { checkOrigin } from "./request-origin";
export const configured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
export function db() {
  if (!configured()) throw new Error("Supabase is not configured");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function authClient() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server Component is read-only; proxy.ts refreshes cookies. */
          }
        },
      },
    },
  );
}
export async function actor(): Promise<Actor> {
  if (!configured()) throw new Error("Supabase is not configured");
  const client = await authClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Authentication required");
  const { data: p } = await db()
    .from("profiles")
    .select("id,role")
    .eq("id", data.user.id)
    .single();
  if (!p) throw new Error("Profile required");
  return { id: p.id, role: p.role as Role };
}
export async function batches(withAnchors = false) {
  const { data, error, count } = await db()
    .from("residue_batches")
    .select("document,version", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error("Database read failed");
  if ((count ?? 0) > 1000)
    throw new Error(
      "Workspace record limit exceeded; indexed conflict lookup is required before expanding this deployment",
    );
  const anchors = new Map<string, Batch["anchor"]>();
  if (withAnchors && data?.length) {
    const { data: records, error: anchorError } = await db()
      .from("residue_batches")
      .select(
        "id,proof_anchors(confirmation_status,evidence_root,transaction_hash,proof_version)",
      )
      .in(
        "id",
        data.map((r) => r.document.id),
      )
      .order("proof_version", {
        referencedTable: "proof_anchors",
        ascending: false,
      })
      .limit(1, { referencedTable: "proof_anchors" });
    if (anchorError) throw new Error("Anchor status unavailable");
    for (const record of records ?? []) {
      const latest = record.proof_anchors[0];
      if (latest)
        anchors.set(record.id, {
          status: latest.confirmation_status as Batch["anchor"]["status"],
          root: latest.evidence_root,
          transactionHash: latest.transaction_hash ?? undefined,
        });
    }
  }
  return (data ?? []).map((r) => ({
    batch: {
      ...r.document,
      ...(anchors.has(r.document.id)
        ? { anchor: anchors.get(r.document.id) }
        : {}),
    } as Batch,
    version: r.version as number,
  }));
}
export async function saveBatch(
  batch: Batch,
  version: number,
  key: string,
  actorId: string,
) {
  const { error } = await db().rpc("commit_batch", {
    p_document: batch,
    p_expected_version: version,
    p_key: key,
    p_actor: actorId,
  });
  if (error)
    throw new Error("Transaction rejected. Reload the record before retrying.");
}
export function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const safe =
    /required|permitted|denied|configured|transition|finding|Custody|Independent|Transaction rejected|origin|Invalid|Positive|Evidence|File|Upload|Network|AI|Receipt|not found|limit/i.test(
      message,
    );
  return Response.json(
    { error: safe ? message : "The request could not be completed." },
    {
      status: /Authentication/.test(message)
        ? 401
        : /denied|permitted|Independent|origin/.test(message)
          ? 403
          : /configured/.test(message)
            ? 503
            : 400,
    },
  );
}
