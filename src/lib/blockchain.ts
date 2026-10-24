import "server-only";
import { Contract, JsonRpcProvider, Wallet, id } from "ethers";
export const registryAbi = [
  "function anchor(bytes32 batchId,bytes32 root,uint64 version)",
  "function latest(bytes32) view returns(bytes32 root,uint64 version)",
  "function verify(bytes32,bytes32,uint64) view returns(bool)",
];
export function chainConfigured() {
  return Boolean(
    process.env.SEPOLIA_RPC_URL && process.env.EVIDENCE_REGISTRY_ADDRESS,
  );
}
export async function registry(sign = false) {
  if (!chainConfigured())
    throw new Error(
      "Network unavailable: configure SEPOLIA_RPC_URL and EVIDENCE_REGISTRY_ADDRESS",
    );
  const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL, undefined, {
    staticNetwork: false,
  });
  if ((await provider.getNetwork()).chainId !== 11155111n)
    throw new Error("Invalid network: Sepolia required");
  if (sign && !process.env.ANCHOR_PRIVATE_KEY)
    throw new Error("ANCHOR_PRIVATE_KEY is not configured");
  const runner = sign
    ? new Wallet(process.env.ANCHOR_PRIVATE_KEY!, provider)
    : provider;
  return {
    contract: new Contract(
      process.env.EVIDENCE_REGISTRY_ADDRESS!,
      registryAbi,
      runner,
    ),
    provider,
  };
}
export const batchKey = (batchId: string) => id(batchId);
