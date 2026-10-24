import { checkGemini, checkSepolia } from "./optional-services.mjs";
const results = await Promise.all([checkGemini(), checkSepolia()]);
for (let i = 0; i < results.length; i++) {
  const result = results[i];
  console.log(
    (result.ready ? "PASS" : "PENDING") +
      " " +
      ["Gemini", "Sepolia"][i] +
      ": " +
      result.message,
  );
  if (result.address) console.log("Testnet signer address: " + result.address);
  if (result.balance)
    console.log("Sepolia balance: " + result.balance + " test ETH");
}
if (results.some((result) => !result.ready)) process.exitCode = 1;
