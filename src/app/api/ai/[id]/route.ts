import {
  actor,
  batches,
  db,
  checkOrigin,
  failure,
  saveBatch,
} from "@/lib/server";
import { canRead } from "@/lib/domain";
import { extract, extractionSchema } from "@/lib/ai";
import { appendEvent } from "@/lib/proof";
async function permitted(id: string) {
  const a = await actor();
  const { data: e } = await db()
    .from("evidence_assets")
    .select("*")
    .eq("id", id)
    .single();
  if (!e) throw new Error("Evidence not found");
  const row = (await batches()).find((r) => r.batch.id === e.batch_id);
  if (!row || !canRead(a, row.batch) || e.uploaded_by !== a.id)
    throw new Error("Evidence extraction access denied");
  return { a, e, row };
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const { id } = await params;
    const { a, e } = await permitted(id);
    const { data: existing } = await db()
      .from("ai_extractions")
      .select("*")
      .eq("evidence_id", id)
      .limit(1)
      .maybeSingle();
    if (existing) return Response.json(existing);
    const { data: allowed, error: limitError } = await db().rpc(
      "consume_ai_attempt",
      { p_actor: a.id },
    );
    if (limitError || !allowed)
      throw new Error("AI hourly usage limit reached");
    const { count } = await db()
      .from("ai_extractions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 86400000).toISOString());
    if ((count ?? 0) >= 100) throw new Error("AI daily usage limit reached");
    const { data, error } = await db()
      .storage.from("evidence")
      .download(e.storage_path);
    if (error) throw new Error("Evidence download failed");
    const result = await extract(
      new Uint8Array(await data.arrayBuffer()),
      e.file_type,
    );
    const { data: saved, error: saveError } = await db()
      .from("ai_extractions")
      .insert({
        evidence_id: id,
        provider: "Gemini",
        model_identifier: result.model,
        extracted_fields_json: result.fields,
      })
      .select()
      .single();
    if (saveError) throw new Error("AI extraction save failed");
    return Response.json(saved);
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const { id } = await params;
    const { a, row } = await permitted(id);
    if (["APPROVED", "REJECTED"].includes(row.batch.status))
      throw new Error("Evidence requires a reopened review");
    const fields = extractionSchema.parse(await request.json());
    const key = crypto.randomUUID();
    const b = {
      ...row.batch,
      events: await appendEvent(row.batch.events, {
        id: key,
        batchId: row.batch.id,
        type: "EXTRACTION_CONFIRMED",
        actor: a,
        timestamp: new Date().toISOString(),
        evidenceIds: [id],
        payload: { fields },
      }),
    };
    await saveBatch(b, row.version, key, a.id);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
