import { actor, batches, db, checkOrigin, failure } from "@/lib/server";
import { registry, batchKey } from "@/lib/blockchain";
import { verifyChain } from "@/lib/proof";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const a = await actor();
    if (!["AUDITOR", "ADMIN"].includes(a.role))
      throw new Error("Anchoring role not permitted");
    const { id } = await params;
    const b = (await batches()).find((r) => r.batch.id === id)?.batch;
    if (!b || b.status !== "APPROVED" || b.synthetic)
      throw new Error("Approved real record required");
    if (!(await verifyChain(b.events)).valid)
      throw new Error("Invalid event chain");
    const approval = b.events.findLastIndex((e) => e.type === "APPROVE");
    if (approval < 0) throw new Error("Approval required");
    const root = b.events[approval].hash,
      version = approval + 1;
    const { contract, provider } = await registry(true);
    const { data: existing } = await db()
      .from("proof_anchors")
      .select("*")
      .eq("batch_id", id)
      .eq("evidence_root", root)
      .maybeSingle();
    if (existing) {
      if (!existing.transaction_hash)
        return Response.json({
          message:
            "Anchor reserved. Submission outcome is uncertain; administrator reconciliation is required before retrying.",
        });
      const receipt = await provider.getTransactionReceipt(
        existing.transaction_hash,
      );
      if (!receipt)
        return Response.json({ message: "Transaction pending confirmation." });
      const matches =
        receipt.status === 1 &&
        (await contract.verify(batchKey(id), "0x" + root, version));
      await db()
        .from("proof_anchors")
        .update({ confirmation_status: matches ? "CONFIRMED" : "FAILED" })
        .eq("id", existing.id);
      return Response.json({
        message: matches
          ? "Confirmed transaction and matching on-chain proof."
          : "Transaction failed or proof mismatch.",
        transactionHash: existing.transaction_hash,
      });
    }
    const { data: reservation, error } = await db()
      .from("proof_anchors")
      .insert({
        batch_id: id,
        evidence_root: root,
        proof_version: version,
        confirmation_status: "PENDING",
      })
      .select()
      .single();
    if (error)
      throw new Error("Anchor already requested; reload to check status");
    try {
      const tx = await contract.anchor(batchKey(id), "0x" + root, version);
      const { error: saveError } = await db()
        .from("proof_anchors")
        .update({ transaction_hash: tx.hash })
        .eq("id", reservation.id);
      if (saveError)
        throw new Error(
          "Transaction broadcast; persistence requires administrator reconciliation",
        );
      return Response.json({
        message: "Transaction submitted. Check again for confirmation.",
        transactionHash: tx.hash,
      });
    } catch {
      throw new Error(
        "Network submission outcome uncertain. The reservation prevents duplicate transactions; reconcile with the signer transaction history.",
      );
    }
  } catch (e) {
    return failure(e);
  }
}
