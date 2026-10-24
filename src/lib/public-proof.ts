import "server-only";
import { demoBatches } from "./demo";
import { batches, configured, db } from "./server";
import { registry, batchKey, chainConfigured } from "./blockchain";
import { publicRecord } from "./workflow";
import { verifyChain } from "./proof";
export async function getPublicProof(id: string) {
  const b = /^BP-00[1-4]$/.test(id)
    ? (await demoBatches()).find((b) => b.id === id)
    : configured()
      ? (await batches()).find((r) => r.batch.id === id)?.batch
      : undefined;
  if (!b || (!b.synthetic && !b.decision)) return null;
  let chainCheck = "No on-chain anchor";
  if (!b.synthetic) {
    const { data: anchor } = await db()
      .from("proof_anchors")
      .select("*")
      .eq("batch_id", id)
      .order("proof_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (anchor) {
      b.anchor = {
        status: anchor.confirmation_status,
        root: anchor.evidence_root,
        transactionHash: anchor.transaction_hash ?? undefined,
      };
      chainCheck = "Network unavailable";
      if (chainConfigured()) {
        try {
          const { contract, provider } = await registry();
          const receipt = anchor.transaction_hash
            ? await provider.getTransactionReceipt(anchor.transaction_hash)
            : null;
          const matches =
            receipt?.status === 1 &&
            (await contract.verify(
              batchKey(id),
              "0x" + anchor.evidence_root,
              anchor.proof_version,
            )) &&
            b.events[anchor.proof_version - 1]?.hash === anchor.evidence_root;
          b.anchor.status = matches
            ? "CONFIRMED"
            : receipt
              ? "FAILED"
              : "PENDING";
          chainCheck = matches
            ? "On-chain proof matches the approved event prefix"
            : receipt
              ? "Proof mismatch or failed transaction"
              : "Transaction pending";
        } catch {
          b.anchor.status = "PENDING";
        }
      } else b.anchor.status = "PENDING";
    }
  }
  return {
    record: publicRecord(b),
    integrity: await verifyChain(b.events),
    chainCheck,
    checkedAt: new Date().toISOString(),
  };
}
