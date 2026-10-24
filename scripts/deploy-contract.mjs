import fs from "node:fs";
import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";
import { compile } from "./contract.mjs";

class SetupError extends Error {}

async function main() {
  if (!process.env.SEPOLIA_RPC_URL || !process.env.ANCHOR_PRIVATE_KEY)
    throw new SetupError(
      "Set SEPOLIA_RPC_URL and ANCHOR_PRIVATE_KEY server-side.",
    );
  if (process.env.EVIDENCE_REGISTRY_ADDRESS?.trim())
    throw new SetupError(
      "Registry address already configured. Run npm run check:optional before considering another deployment.",
    );
  if (process.env.REGISTRY_DEPLOYMENT_TX?.trim())
    throw new SetupError(
      "A deployment transaction is already recorded. Reconcile it before retrying.",
    );

  const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  try {
    if ((await provider.getNetwork()).chainId !== 11155111n)
      throw new SetupError("Only Sepolia is allowed");
    const wallet = new Wallet(process.env.ANCHOR_PRIVATE_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    if (balance === 0n)
      throw new SetupError(
        "The signer has no Sepolia test ETH. Fund it before deployment.",
      );
    const artifact = compile();
    const factory = new ContractFactory(
      artifact.abi,
      artifact.evm.bytecode.object,
      wallet,
    );
    const deployment = await factory.getDeployTransaction(wallet.address);
    const gas = await provider.estimateGas({
      ...deployment,
      from: wallet.address,
    });
    const fees = await provider.getFeeData();
    const price = fees.maxFeePerGas ?? fees.gasPrice;
    if (!price || (await provider.getBalance(wallet.address)) < gas * price)
      throw new SetupError(
        "Insufficient Sepolia test ETH for estimated deployment gas. Fund the signer and retry.",
      );

    const contract = await factory.deploy(wallet.address);
    const address = await contract.getAddress();
    const hash = contract.deploymentTransaction().hash;
    const envPath = new URL("../.env.local", import.meta.url);
    let content = fs.readFileSync(envPath, "utf8");
    for (const [name, value] of Object.entries({
      EVIDENCE_REGISTRY_ADDRESS: address,
      REGISTRY_DEPLOYMENT_TX: hash,
    })) {
      const pattern = new RegExp("^" + name + "=.*$", "m");
      const line = name + "=" + value;
      content = pattern.test(content)
        ? content.replace(pattern, line)
        : content + "\n" + line + "\n";
    }
    fs.writeFileSync(envPath, content);
    console.log("Registry address saved to .env.local: " + address);
    console.log("Deployment transaction: " + hash);
    const receipt = await provider.waitForTransaction(hash, 1, 60000);
    if (!receipt || receipt.status !== 1)
      throw new SetupError(
        "Deployment is pending or failed. Inspect the saved transaction before retrying.",
      );
    console.log(
      "Sepolia deployment confirmed. Restart the app and run npm run check:optional.",
    );
  } finally {
    provider.destroy();
  }
}
main().catch((error) => {
  if (error instanceof SetupError) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  // Provider errors may contain authenticated RPC URLs or signed transactions.
  console.error(
    "Deployment not completed. Check signer funds, Sepolia RPC and any saved deployment transaction. Existing deployment settings prevent duplicate submissions.",
  );
  process.exitCode = 1;
});
