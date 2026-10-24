export function syntheticEvidence(id: string, type: "pickup" | "intake") {
  const receipt = id === "BP-001" ? "WB-1001" : "WB-2002";
  return (
    JSON.stringify(
      {
        notice: "SYNTHETIC DEMONSTRATION DOCUMENT — NOT A REAL RECEIPT",
        documentType:
          type === "pickup"
            ? "Collection scale record"
            : "Processor intake receipt",
        ...(type === "pickup"
          ? { batch: id }
          : { receipt, facility: "Punjab Demonstration Facility" }),
        quantityKg: type === "intake" && id === "BP-001" ? 560 : 600,
        measurementBasis: "wet",
        recordedAt:
          type === "pickup"
            ? "2026-10-23T08:00:00.000Z"
            : "2026-10-23T10:00:00.000Z",
        notes:
          type === "intake" && id === "BP-001"
            ? "Synthetic reconciliation: 40 kg difference after handling; human review required."
            : "This document exists only to demonstrate evidence inspection.",
      },
      null,
      2,
    ) + "\n"
  );
}
