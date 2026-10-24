import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";
import { compile } from "./contract.mjs";
if (!process.env.SEPOLIA_RPC_URL || !process.env.ANCHOR_PRIVATE_KEY)
  throw new Error("Set SEPOLIA_RPC_URL and ANCHOR_PRIVATE_KEY server-side.");
const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
if ((await provider.getNetwork()).chainId !== 11155111n)
  throw new Error("Only Sepolia is allowed");
const wallet = new Wallet(process.env.ANCHOR_PRIVATE_KEY, provider),
  artifact = compile();
const contract = await new ContractFactory(
  artifact.abi,
  artifact.evm.bytecode.object,
  wallet,
).deploy(wallet.address);
await contract.waitForDeployment();
console.log("EVIDENCE_REGISTRY_ADDRESS=" + (await contract.getAddress()));
console.log("Deployment transaction: " + contract.deploymentTransaction().hash);
