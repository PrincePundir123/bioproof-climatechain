import {
  actor,
  batches,
  db,
  checkOrigin,
  failure,
  saveBatch,
} from "@/lib/server";
import { canRead } from "@/lib/domain";
import { appendEvent, sha256 } from "@/lib/proof";
import { validateFile } from "@/lib/files";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let stored: string | undefined;
  try {
    checkOrigin(request);
    const a = await actor(),
      { id } = await params;
    const row = (await batches()).find((r) => r.batch.id === id);
    if (
      !row ||
      !canRead(a, row.batch) ||
      !["FARMER", "COLLECTOR", "PROCESSOR"].includes(a.role)
    )
      throw new Error("Evidence access denied");
    if (["APPROVED", "REJECTED"].includes(row.batch.status))
      throw new Error("Evidence requires a reopened review");
    if (Number(request.headers.get("content-length")) > 5500000)
      throw new Error("File size limit exceeded");
    if (row.batch.evidence.length >= 30)
      throw new Error("Evidence limit reached");
    const form = await request.formData(),
      file = form.get("file"),
      type = String(form.get("type"));
    if (!(file instanceof File)) throw new Error("File required");
    if (
      !["pickup", "intake", "supporting"].includes(type) ||
      (type === "pickup" && a.role !== "COLLECTOR") ||
      (type === "intake" && a.role !== "PROCESSOR")
    )
      throw new Error("Evidence role not permitted");
    const bytes = new Uint8Array(await file.arrayBuffer());
    validateFile(bytes, file.type);
    const hash = await sha256(bytes);
    if (row.batch.evidence.some((e) => e.sha256 === hash))
      throw new Error("Evidence already attached");
    const evidenceId = crypto.randomUUID(),
      path = `${id}/${evidenceId}`;
    const { error } = await db()
      .storage.from("evidence")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) throw new Error("Upload failed");
    stored = path;
    const evidence = {
      id: evidenceId,
      name: file.name.slice(0, 160),
      sha256: hash,
      type,
      uploadedBy: a.id,
      storagePath: path,
    };
    const b = { ...row.batch, evidence: [...row.batch.evidence, evidence] };
    const key = crypto.randomUUID();
    b.events = await appendEvent(b.events, {
      id: key,
      batchId: id,
      type: "EVIDENCE_ADDED",
      actor: a,
      timestamp: new Date().toISOString(),
      evidenceIds: [evidenceId],
      payload: { sha256: hash, type },
    });
    const { error: insertError } = await db()
      .from("evidence_assets")
      .insert({
        id: evidenceId,
        batch_id: id,
        uploaded_by: a.id,
        storage_path: path,
        sha256_hash: hash,
        file_type: file.type,
        file_size: file.size,
        document_type: type,
      });
    if (insertError) throw new Error("Evidence metadata failed");
    try {
      await saveBatch(b, row.version, key, a.id);
    } catch (e) {
      await db().from("evidence_assets").delete().eq("id", evidenceId);
      throw e;
    }
    stored = undefined;
    return Response.json(b);
  } catch (e) {
    if (stored) await db().storage.from("evidence").remove([stored]);
    return failure(e);
  }
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const a = await actor(),
      { id } = await params;
    const { data: e } = await db()
      .from("evidence_assets")
      .select("*")
      .eq("id", id)
      .single();
    if (!e) throw new Error("Evidence not found");
    const row = (await batches()).find((r) => r.batch.id === e.batch_id);
    if (!row || !canRead(a, row.batch))
      throw new Error("Evidence access denied");
    const { data, error } = await db()
      .storage.from("evidence")
      .createSignedUrl(e.storage_path, 60);
    if (error) throw new Error("Evidence download unavailable");
    return Response.json(
      { url: data.signedUrl, mime: e.file_type, expiresIn: 60 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
