import { z } from "zod";
export const roles = [
  "FARMER",
  "COLLECTOR",
  "PROCESSOR",
  "AUDITOR",
  "ADMIN",
] as const;
export type Role = (typeof roles)[number];
export type Actor = { id: string; role: Role };
export type Status =
  | "DRAFT"
  | "DECLARED"
  | "PICKED_UP"
  | "RECEIVED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "DISPUTED";
export type Measurement = {
  kg: number;
  basis: "wet" | "dry" | "unknown";
  moisture?: number;
};
export type AuditEvent = {
  id: string;
  batchId: string;
  type: string;
  actor: Actor;
  timestamp: string;
  evidenceIds: string[];
  payload: Record<string, unknown>;
  previousHash: string;
  hash: string;
  schemaVersion: 1;
};
export type Evidence = {
  id: string;
  name: string;
  sha256: string;
  type: string;
  uploadedBy: string;
  storagePath?: string;
};
export type Finding = {
  id: string;
  batchId: string;
  relatedBatchId?: string;
  code: string;
  severity: "warning" | "critical";
  explanation: string;
  sources: string[];
  resolution?: string;
};
export type Batch = {
  id: string;
  farmerId: string;
  plotId: string;
  region: string;
  residue: string;
  declared: Measurement;
  totalResidue?: number;
  status: Status;
  pickup?: Measurement & { actorId: string; timestamp: string; notes: string };
  intake?: Measurement & {
    actorId: string;
    timestamp: string;
    receipt: string;
    facility: string;
    process: string;
    notes: string;
  };
  evidence: Evidence[];
  events: AuditEvent[];
  findings: Finding[];
  decision?: { actorId: string; reason: string; status: string };
  soilReview?: string;
  anchor: {
    status: "NOT_REQUESTED" | "PENDING" | "CONFIRMED" | "FAILED";
    root?: string;
    transactionHash?: string;
  };
  synthetic: boolean;
};
export const measurementSchema = z.object({
  kg: z.coerce.number().positive().max(100000000),
  basis: z.enum(["wet", "dry", "unknown"]),
  moisture: z.preprocess(
    (value) =>
      value === null || (typeof value === "string" && value.trim() === "")
        ? undefined
        : value,
    z.coerce.number().min(0).max(99.9).optional(),
  ),
});
export const createSchema = z
  .object({
    plotId: z.string().trim().min(1).max(100),
    region: z.string().trim().min(2).max(120),
    residue: z.enum([
      "Rice straw",
      "Wheat straw",
      "Sugarcane residue",
      "Other residue",
    ]),
    declared: measurementSchema,
    totalResidue: z.coerce.number().positive().optional(),
  })
  .refine(
    (value) =>
      value.totalResidue === undefined ||
      value.declared.kg <= value.totalResidue,
    {
      message:
        "Invalid removal quantity: it cannot exceed total generated residue on the same mass basis.",
      path: ["declared", "kg"],
    },
  );
export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("DECLARE") }),
  z.object({
    type: z.literal("PICKUP"),
    measurement: measurementSchema,
    timestamp: z.iso.datetime(),
    notes: z.string().trim().min(3).max(2000),
  }),
  z.object({
    type: z.literal("INTAKE"),
    measurement: measurementSchema,
    timestamp: z.iso.datetime(),
    receipt: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(
        (value) => /[A-Za-z0-9]/.test(value),
        "Receipt must contain letters or numbers",
      ),
    facility: z.string().trim().min(2).max(120),
    process: z.string().trim().min(2).max(120),
    notes: z.string().trim().min(3).max(2000),
  }),
  z.object({ type: z.literal("REQUEST_REVIEW") }),
  z.object({
    type: z.literal("APPROVE"),
    reason: z.string().trim().min(12).max(2000),
  }),
  z.object({
    type: z.literal("REJECT"),
    reason: z.string().trim().min(12).max(2000),
  }),
  z.object({
    type: z.literal("CLARIFY"),
    reason: z.string().trim().min(12).max(2000),
  }),
  z.object({
    type: z.literal("DISPUTE"),
    reason: z.string().trim().min(12).max(2000),
  }),
  z.object({
    type: z.literal("RESOLVE"),
    findingId: z.string(),
    reason: z.string().trim().min(12).max(2000),
  }),
  z.object({
    type: z.literal("SOIL_REVIEW"),
    reason: z.string().trim().min(12).max(2000),
  }),
  z.object({
    type: z.literal("CORRECTION"),
    reason: z.string().trim().min(12).max(2000),
  }),
]);
export type Action = z.infer<typeof actionSchema>;
export function canRead(actor: Actor, b: Batch) {
  return (
    actor.role === "ADMIN" ||
    actor.role === "AUDITOR" ||
    b.farmerId === actor.id ||
    b.pickup?.actorId === actor.id ||
    b.intake?.actorId === actor.id ||
    (actor.role === "COLLECTOR" && b.status === "DECLARED") ||
    (actor.role === "PROCESSOR" && b.status === "PICKED_UP")
  );
}
export function authorize(actor: Actor, b: Batch, action: Action) {
  if (!canRead(actor, b)) throw new Error("Access denied");
  const allowed: Record<Action["type"], Role[]> = {
    DECLARE: ["FARMER"],
    PICKUP: ["COLLECTOR"],
    INTAKE: ["PROCESSOR"],
    REQUEST_REVIEW: ["FARMER", "COLLECTOR", "PROCESSOR", "AUDITOR"],
    APPROVE: ["AUDITOR"],
    REJECT: ["AUDITOR"],
    CLARIFY: ["AUDITOR"],
    DISPUTE: ["FARMER", "COLLECTOR", "PROCESSOR", "AUDITOR"],
    RESOLVE: ["AUDITOR"],
    SOIL_REVIEW: ["AUDITOR"],
    CORRECTION: ["FARMER", "COLLECTOR", "PROCESSOR"],
  };
  if (!allowed[action.type].includes(actor.role))
    throw new Error("Role not permitted");
  if (
    ["APPROVE", "REJECT", "RESOLVE", "SOIL_REVIEW"].includes(action.type) &&
    [b.farmerId, b.pickup?.actorId, b.intake?.actorId].includes(actor.id)
  )
    throw new Error("Independent reviewer required");
  const states: Partial<Record<Action["type"], Status[]>> = {
    DECLARE: ["DRAFT"],
    PICKUP: ["DECLARED"],
    INTAKE: ["PICKED_UP"],
    REQUEST_REVIEW: ["RECEIVED", "DISPUTED"],
    APPROVE: ["UNDER_REVIEW"],
    REJECT: ["UNDER_REVIEW"],
    DISPUTE: ["APPROVED", "REJECTED"],
    RESOLVE: ["RECEIVED", "UNDER_REVIEW", "DISPUTED"],
  };
  if (states[action.type] && !states[action.type]!.includes(b.status))
    throw new Error("Invalid state transition");
  if (action.type === "APPROVE" && b.findings.some((f) => !f.resolution))
    throw new Error("Document a resolution for every finding before approval");
  if (
    action.type === "APPROVE" &&
    (!b.pickup || !b.intake || !b.evidence.length)
  )
    throw new Error("Custody and evidence required");
}
export function normalizeReceipt(value: string) {
  return value
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
export const REVIEW_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_WEIGHT_REVIEW_THRESHOLD_PERCENT || 5,
);
export function compareWeights(
  a: Measurement,
  b: Measurement,
  threshold = REVIEW_THRESHOLD,
) {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100)
    throw new Error("Invalid review threshold");
  if (a.kg <= 0 || b.kg <= 0 || !Number.isFinite(a.kg + b.kg))
    throw new Error("Positive finite weights required");
  const dry = (m: Measurement) =>
    m.basis === "dry"
      ? m.kg
      : m.basis === "wet" && m.moisture !== undefined
        ? m.kg * (1 - m.moisture / 100)
        : undefined;
  const ad = dry(a),
    bd = dry(b);
  const compatible = ad !== undefined && bd !== undefined;
  if (
    !compatible &&
    (a.basis === "unknown" || b.basis === "unknown" || a.basis !== b.basis)
  )
    return {
      uncertain: true,
      explanation:
        "Measurement bases are incompatible or unknown. Reconciliation required.",
    };
  const x = compatible ? ad : a.kg,
    y = compatible ? bd : b.kg,
    kg = Math.abs(x - y),
    percent = (kg / x) * 100;
  return {
    uncertain: false,
    kg,
    percent,
    flagged: percent > threshold,
    explanation: `${kg.toFixed(1)} kg (${percent.toFixed(2)}%) difference; platform review threshold ${threshold}%, not a regulatory limit.${compatible ? " Compared as dry mass." : " Same recorded basis; moisture variation may affect comparison."}`,
  };
}
export function soilSafe(
  b: Pick<Batch, "totalResidue" | "declared" | "soilReview">,
) {
  if (b.soilReview)
    return { state: "REVIEW_COMPLETED", explanation: b.soilReview };
  if (!b.totalResidue)
    return {
      state: "INSUFFICIENT_INFORMATION",
      explanation:
        "Record total generated residue on the same mass basis to assess removal proportion.",
    };
  const proportion = (b.declared.kg / b.totalResidue) * 100;
  return {
    state: "REQUIRES_AGRONOMIC_REVIEW",
    proportion,
    explanation: `${proportion.toFixed(1)}% proposed removal (user estimates on the same basis). ${proportion >= 70 ? "High removal proportion: " : ""}Site-specific soil cover, erosion, nutrients, and alternative residue uses need review. No universal safe limit is implied.`,
  };
}
export function detectConflicts(
  b: Batch,
  all: Batch[],
  threshold = REVIEW_THRESHOLD,
): Finding[] {
  const results: Finding[] = [];
  const add = (
    code: string,
    explanation: string,
    sources: string[],
    relatedBatchId?: string,
  ) => {
    const id = [b.id, code, relatedBatchId ?? "", ...sources].join(":");
    results.push({
      id,
      batchId: b.id,
      code,
      severity: code === "UNEXPECTED_CUSTODY_SEQUENCE" ? "critical" : "warning",
      explanation,
      sources,
      relatedBatchId,
      resolution: b.findings.find((f) => f.id === id)?.resolution,
    });
  };
  for (const other of all.filter((o) => o.id !== b.id)) {
    if (
      b.intake &&
      other.intake &&
      normalizeReceipt(b.intake.facility) ===
        normalizeReceipt(other.intake.facility) &&
      normalizeReceipt(b.intake.receipt) ===
        normalizeReceipt(other.intake.receipt)
    )
      add(
        "SAME_RECEIPT_NUMBER",
        `Receipt ${b.intake.receipt} is also recorded at ${b.intake.facility} in ${other.id}. Investigate separate deliveries or document a consolidated-shipment exemption.`,
        [b.id, other.id],
        other.id,
      );
    for (const e of b.evidence)
      for (const o of other.evidence)
        if (e.sha256 === o.sha256)
          add(
            "IDENTICAL_FILE_HASH",
            "Identical file bytes appear in another claim. Reuse is an investigation signal, not proof of fraud.",
            [e.id, o.id],
            other.id,
          );
    if (
      b.plotId === other.plotId &&
      b.pickup &&
      other.pickup &&
      Math.abs(
        Date.parse(b.pickup.timestamp) - Date.parse(other.pickup.timestamp),
      ) < 86400000
    )
      add(
        "PLOT_TIME_OVERLAP",
        "Collections from the same plot occur within 24 hours. Check source quantities.",
        [b.id, other.id],
        other.id,
      );
  }
  if (b.pickup && b.intake) {
    if (Date.parse(b.intake.timestamp) < Date.parse(b.pickup.timestamp))
      add("UNEXPECTED_CUSTODY_SEQUENCE", "Processor arrival predates pickup.", [
        b.id,
      ]);
    const c = compareWeights(b.pickup, b.intake, threshold);
    if (c.uncertain || c.flagged)
      add(
        c.uncertain
          ? "PROCESSOR_RECONCILIATION_REQUIRED"
          : "CONFLICTING_QUANTITY",
        c.explanation,
        [b.id],
      );
  }
  if (b.pickup && !b.evidence.some((e) => e.type === "pickup"))
    add("MISSING_PICKUP_EVIDENCE", "Pickup supporting evidence is missing.", [
      b.id,
    ]);
  if (b.intake && !b.evidence.some((e) => e.type === "intake"))
    add("MISSING_INTAKE_EVIDENCE", "Processor receipt evidence is missing.", [
      b.id,
    ]);
  return results;
}
