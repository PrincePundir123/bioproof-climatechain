import fs from "node:fs";
import { Wallet } from "ethers";
const path = new URL("../.env.local", import.meta.url);
let content = fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
function setMissing(name, value) {
  if (process.env[name]?.trim()) return;
  const pattern = new RegExp("^" + name + "=.*$", "m");
  const line = name + "=" + value;
  if (pattern.test(content)) content = content.replace(pattern, line);
  else content += (content.endsWith("\n") ? "" : "\n") + line + "\n";
}
const wallet = process.env.ANCHOR_PRIVATE_KEY?.trim()
  ? new Wallet(process.env.ANCHOR_PRIVATE_KEY)
  : Wallet.createRandom();
setMissing("ANCHOR_PRIVATE_KEY", wallet.privateKey);
setMissing("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com");
setMissing("GEMINI_API_KEY", "");
setMissing("GEMINI_MODEL", "gemini-3.1-flash-lite");
setMissing("EVIDENCE_REGISTRY_ADDRESS", "");
fs.writeFileSync(path, content, { mode: 0o600 });
console.log(
  "Optional settings prepared in ignored .env.local. Existing values preserved.",
);
console.log("Dedicated testnet signer address: " + wallet.address);
console.log(
  "Add GEMINI_API_KEY locally. Fund the address with Sepolia test ETH.",
);
