import { afterEach, beforeEach, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => ({
  getNetwork: vi.fn(),
  getCode: vi.fn(),
  authority: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("ethers", async (original) => ({
  ...(await original<typeof import("ethers")>()),
  JsonRpcProvider: class {
    getNetwork = rpc.getNetwork;
    getCode = rpc.getCode;
  },
  Contract: class {
    authority = rpc.authority;
  },
}));
import { Wallet } from "ethers";
import { registry } from "../src/lib/blockchain";
const wallet = Wallet.createRandom();
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SEPOLIA_RPC_URL", "https://test.invalid");
  vi.stubEnv(
    "EVIDENCE_REGISTRY_ADDRESS",
    "0x1111111111111111111111111111111111111111",
  );
  vi.stubEnv("ANCHOR_PRIVATE_KEY", wallet.privateKey);
  rpc.getNetwork.mockResolvedValue({ chainId: 11155111n });
  rpc.getCode.mockResolvedValue("0x1234");
  rpc.authority.mockResolvedValue(wallet.address);
});
afterEach(() => vi.unstubAllEnvs());
it("refuses a non-Sepolia network", async () => {
  rpc.getNetwork.mockResolvedValue({ chainId: 1n });
  await expect(registry(true)).rejects.toThrow("Sepolia required");
});
it("refuses an address with no deployed registry", async () => {
  rpc.getCode.mockResolvedValue("0x");
  await expect(registry(true)).rejects.toThrow("contract not found");
});
it("refuses to sign with a wallet other than the registry authority", async () => {
  rpc.authority.mockResolvedValue("0x1111111111111111111111111111111111111111");
  await expect(registry(true)).rejects.toThrow("Invalid registry authority");
});
it("accepts the correct Sepolia registry and authority", async () => {
  await expect(registry(true)).resolves.toHaveProperty("contract");
});
it("allows public registry reads without a signing key", async () => {
  vi.stubEnv("ANCHOR_PRIVATE_KEY", "");
  await expect(registry()).resolves.toHaveProperty("provider");
  expect(rpc.authority).not.toHaveBeenCalled();
  await expect(registry(true)).rejects.toThrow("not configured");
});
