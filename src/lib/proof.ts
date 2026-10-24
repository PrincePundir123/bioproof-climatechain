import type { AuditEvent } from "./domain";
export function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite value");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (typeof value === "object" && value !== null)
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (k) =>
            JSON.stringify(k) +
            ":" +
            canonical((value as Record<string, unknown>)[k]),
        )
        .join(",") +
      "}"
    );
  throw new Error("Unsupported canonical value");
}
export async function sha256(bytes: Uint8Array | string) {
  const data =
    typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  return Array.from(new Uint8Array(hash), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
export async function eventHash(event: Omit<AuditEvent, "hash">) {
  return sha256(canonical({ domain: "BIOPROOF_EVENT_V1", event }));
}
export async function appendEvent(
  events: AuditEvent[],
  event: Omit<AuditEvent, "hash" | "previousHash" | "schemaVersion">,
) {
  const body = {
    ...event,
    previousHash: events.at(-1)?.hash ?? "0".repeat(64),
    schemaVersion: 1 as const,
  };
  return [...events, { ...body, hash: await eventHash(body) }];
}
export async function verifyChain(events: AuditEvent[], expectedRoot?: string) {
  let previous = "0".repeat(64);
  for (let i = 0; i < events.length; i++) {
    const { hash, ...body } = events[i];
    if (body.previousHash !== previous || (await eventHash(body)) !== hash)
      return {
        valid: false,
        index: i,
        reason: "Event contents or previous hash do not match",
      };
    previous = hash;
  }
  if (expectedRoot && previous !== expectedRoot)
    return {
      valid: false,
      index: events.length,
      reason: "Reference root mismatch",
    };
  return {
    valid: true,
    index: -1,
    reason: "Every event matches the recorded hash chain",
    root: previous,
  };
}
