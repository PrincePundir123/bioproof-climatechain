import { describe, expect, it, vi } from "vitest";
import { Wallet } from "ethers";
import { checkGemini, checkSepolia } from "../scripts/optional-services.mjs";

describe("optional service readiness", () => {
  it("does not call Gemini without a key", async () => {
    const fetcher = vi.fn();
    expect((await checkGemini({}, fetcher)).ready).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("verifies model access without generating content or printing credentials", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ supportedGenerationMethods: ["generateContent"] }),
    });
    const result = await checkGemini(
      { GEMINI_API_KEY: "private-key", GEMINI_MODEL: "test-model" },
      fetcher,
    );
    expect(result.ready).toBe(true);
    expect(fetcher.mock.calls[0][0]).toContain("/models/test-model");
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty("method", "POST");
    expect(JSON.stringify(result)).not.toContain("private-key");
  });
  it("sanitizes provider failures", async () => {
    const result = await checkGemini(
      { GEMINI_API_KEY: "private-key" },
      vi.fn().mockRejectedValue(new Error("https://secret-rpc/private-key")),
    );
    expect(result.ready).toBe(false);
    expect(JSON.stringify(result)).not.toContain("private-key");
  });
  it("rejects unavailable or incompatible models", async () => {
    expect(
      (
        await checkGemini(
          { GEMINI_API_KEY: "key" },
          vi.fn().mockResolvedValue({ ok: false, status: 403 }),
        )
      ).ready,
    ).toBe(false);
    expect(
      (
        await checkGemini(
          { GEMINI_API_KEY: "key" },
          vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
        )
      ).ready,
    ).toBe(false);
  });

  const wallet = Wallet.createRandom();
  const env = {
    SEPOLIA_RPC_URL: "https://test.invalid",
    ANCHOR_PRIVATE_KEY: wallet.privateKey,
    EVIDENCE_REGISTRY_ADDRESS: "0x1111111111111111111111111111111111111111",
  };
  const provider = (
    chainId = 11155111n,
    balance = 100000n,
    code = "0x1234",
  ) => ({
    getNetwork: async () => ({ chainId }),
    getBalance: async () => balance,
    getCode: async () => code,
  });
  it("rejects mainnet before checking funds or contract", async () => {
    const result = await checkSepolia(env, { provider: provider(1n) });
    expect(result.ready).toBe(false);
    expect(result.message).toContain("Wrong RPC network");
  });
  it("requires a deployed contract and matching authority", async () => {
    expect(
      (await checkSepolia(env, { provider: provider(11155111n, 100n, "0x") }))
        .ready,
    ).toBe(false);
    expect(
      (
        await checkSepolia(env, {
          provider: provider(),
          contract: { authority: async () => env.EVIDENCE_REGISTRY_ADDRESS },
        })
      ).ready,
    ).toBe(false);
  });
  it("requires funds even with a matching registry", async () => {
    const contract = { authority: async () => wallet.address };
    expect(
      (await checkSepolia(env, { provider: provider(11155111n, 0n), contract }))
        .ready,
    ).toBe(false);
    expect(
      (await checkSepolia(env, { provider: provider(), contract })).ready,
    ).toBe(true);
  });
  it("shows only a public funding address when deployment is pending", async () => {
    const result = await checkSepolia(
      { ...env, EVIDENCE_REGISTRY_ADDRESS: "" },
      { provider: provider(11155111n, 0n) },
    );
    expect(result.ready).toBe(false);
    expect(result.address).toBe(wallet.address);
    expect(JSON.stringify(result)).not.toContain(wallet.privateKey);
  });
});
