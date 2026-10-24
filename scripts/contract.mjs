import fs from "node:fs";
import solc from "solc";
export function compile() {
  const input = {
    language: "Solidity",
    sources: {
      "EvidenceRegistry.sol": {
        content: fs.readFileSync(
          new URL("../contracts/EvidenceRegistry.sol", import.meta.url),
          "utf8",
        ),
      },
    },
    settings: {
      evmVersion: "shanghai",
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors?.filter((e) => e.severity === "error");
  if (errors?.length)
    throw new Error(errors.map((e) => e.formattedMessage).join("\n"));
  return output.contracts["EvidenceRegistry.sol"].EvidenceRegistry;
}
