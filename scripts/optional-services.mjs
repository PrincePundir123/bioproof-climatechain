import {
  Contract,
  JsonRpcProvider,
  Wallet,
  formatEther,
  isAddress,
} from "ethers";

/** @param {Record<string, string | undefined>} env */
export async function checkGemini(env = process.env, fetcher = fetch) {
  if (!env.GEMINI_API_KEY?.trim())
    return { ready: false, message: "Add GEMINI_API_KEY to .env.local." };
  const model = env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
  try {
    const response = await fetcher(
      "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model),
      {
        headers: { "x-goog-api-key": env.GEMINI_API_KEY },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      return {
        ready: false,
        message:
          "Gemini model/key check failed (HTTP " +
          response.status +
          "). Check model access, key permissions and quota.",
      };
    const data = await response.json();
    if (!data.supportedGenerationMethods?.includes("generateContent"))
      return {
        ready: false,
        message: "Configured Gemini model does not support generateContent.",
      };
    return {
      ready: true,
      message:
        "Gemini key and model access verified. Extraction still requires an uploaded document and available quota.",
    };
  } catch {
    return {
      ready: false,
      message: "Gemini connection unavailable. Retry the check.",
    };
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<{ready: boolean, message: string, address?: string, balance?: string}>}
 */
export async function checkSepolia(env = process.env, dependencies = {}) {
  if (!env.SEPOLIA_RPC_URL?.trim())
    return { ready: false, message: "Add SEPOLIA_RPC_URL to .env.local." };
  const provider =
    dependencies.provider ?? new JsonRpcProvider(env.SEPOLIA_RPC_URL);
  try {
    if ((await provider.getNetwork()).chainId !== 11155111n)
      return {
        ready: false,
        message: "Wrong RPC network. Ethereum Sepolia (11155111) is required.",
      };
    if (!env.ANCHOR_PRIVATE_KEY?.trim())
      return {
        ready: false,
        message:
          "RPC verified. Run npm run setup:optional to create a dedicated local testnet signer.",
      };
    let wallet;
    try {
      wallet = new Wallet(env.ANCHOR_PRIVATE_KEY);
    } catch {
      return { ready: false, message: "ANCHOR_PRIVATE_KEY is invalid." };
    }
    const balance = await provider.getBalance(wallet.address);
    const details = { address: wallet.address, balance: formatEther(balance) };
    if (!env.EVIDENCE_REGISTRY_ADDRESS?.trim())
      return {
        ready: false,
        ...details,
        message:
          balance > 0n
            ? "Signer funded. Run npm run deploy:contract to deploy the registry."
            : "Fund this signer with Sepolia test ETH, then run npm run deploy:contract.",
      };
    if (!isAddress(env.EVIDENCE_REGISTRY_ADDRESS))
      return {
        ready: false,
        ...details,
        message: "EVIDENCE_REGISTRY_ADDRESS is invalid.",
      };
    if ((await provider.getCode(env.EVIDENCE_REGISTRY_ADDRESS)) === "0x")
      return {
        ready: false,
        ...details,
        message: "No contract exists at EVIDENCE_REGISTRY_ADDRESS on Sepolia.",
      };
    const contract =
      dependencies.contract ??
      new Contract(
        env.EVIDENCE_REGISTRY_ADDRESS,
        ["function authority() view returns(address)"],
        provider,
      );
    if (
      (await contract.authority()).toLowerCase() !==
      wallet.address.toLowerCase()
    )
      return {
        ready: false,
        ...details,
        message: "Registry authority does not match the configured signer.",
      };
    return {
      ready: balance > 0n,
      ...details,
      message:
        balance > 0n
          ? "Sepolia registry, authority and signer balance verified."
          : "Registry verified, but the signer needs Sepolia test ETH for anchoring.",
    };
  } catch {
    return {
      ready: false,
      message:
        "Sepolia RPC/registry check failed. Verify RPC access and contract configuration.",
    };
  } finally {
    if (!dependencies.provider) provider.destroy();
  }
}
