import { z } from "zod";
import {
  actor,
  batches,
  db,
  checkOrigin,
  failure,
  saveBatch,
} from "@/lib/server";
import {
  canRead,
  createSchema,
  type Batch,
  detectConflicts,
} from "@/lib/domain";
import { appendEvent } from "@/lib/proof";
export async function GET() {
  try {
    const a = await actor();
    const all = await batches();
    const visible = all.filter((r) => canRead(a, r.batch));
    const { data: plots } = await db()
      .from("farm_plots")
      .select("id,display_name,approximate_region")
      .eq("farmer_id", a.id);
    return Response.json({
      actor: a,
      batches: visible.map((r) => ({
        ...r.batch,
        findings: detectConflicts(
          r.batch,
          all.map((x) => x.batch),
        ),
      })),
      plots: plots ?? [],
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const a = await actor();
    if (a.role !== "FARMER") throw new Error("Role not permitted");
    const input = await request.json();
    const key = z.uuid().parse(request.headers.get("idempotency-key"));
    if (input.kind === "plot") {
      const p = z
        .object({
          display_name: z.string().min(2).max(120),
          crop_type: z.string().min(2).max(80),
          area_hectares: z.coerce.number().positive().max(100000),
          approximate_region: z.string().min(2).max(120),
        })
        .parse(input);
      const { data, error } = await db()
        .from("farm_plots")
        .insert({ ...p, id: key, farmer_id: a.id })
        .select()
        .single();
      if (error) throw new Error("Plot creation failed");
      return Response.json(data, { status: 201 });
    }
    const data = createSchema.parse(input);
    const { data: plot } = await db()
      .from("farm_plots")
      .select("id")
      .eq("id", data.plotId)
      .eq("farmer_id", a.id)
      .single();
    if (!plot) throw new Error("Plot access denied");
    const id = "BP-" + key;
    const b: Batch = {
      id,
      farmerId: a.id,
      ...data,
      status: "DRAFT",
      evidence: [],
      events: [],
      findings: [],
      anchor: { status: "NOT_REQUESTED" },
      synthetic: false,
    };
    b.events = await appendEvent([], {
      id: key,
      batchId: id,
      type: "CREATE",
      actor: a,
      timestamp: new Date().toISOString(),
      evidenceIds: [],
      payload: JSON.parse(JSON.stringify(data)),
    });
    await saveBatch(b, -1, key, a.id);
    return Response.json(b, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
