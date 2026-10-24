import { it, expect } from "vitest";
import { demoBatches } from "../src/lib/demo";
import { verifyChain } from "../src/lib/proof";
it("all four seeded scenarios have valid deterministic event chains", async () => {
  const first = await demoBatches(),
    second = await demoBatches();
  expect(first).toEqual(second);
  for (const b of first) expect((await verifyChain(b.events)).valid).toBe(true);
  expect(first[1].findings.some((f) => f.code === "SAME_RECEIPT_NUMBER")).toBe(
    true,
  );
  expect(first[0].status).toBe("APPROVED");
});
