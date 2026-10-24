import assert from "node:assert/strict";
import { network } from "hardhat";
import { BrowserProvider, ContractFactory, id } from "ethers";
import { compile } from "./contract.mjs";
const connection = await network.connect("local");
const local = connection.provider;
try {
  const provider = new BrowserProvider(local),
    owner = await provider.getSigner(0),
    other = await provider.getSigner(1),
    artifact = compile();
  const contract = await new ContractFactory(
    artifact.abi,
    artifact.evm.bytecode.object,
    owner,
  ).deploy(await owner.getAddress());
  await contract.waitForDeployment();
  await assert.rejects(
    contract.connect(other).anchor(id("batch"), id("root"), 1),
  );
  await (await contract.anchor(id("batch"), id("root"), 1)).wait();
  assert.equal(await contract.verify(id("batch"), id("root"), 1), true);
  assert.equal(await contract.verify(id("batch"), id("tampered"), 1), false);
  await assert.rejects(contract.anchor(id("batch"), id("root"), 1));
  await (await contract.anchor(id("batch"), id("new root"), 2)).wait();
  assert.equal(await contract.verify(id("batch"), id("root"), 1), false);
  console.log(
    "PASS: authorized anchor, unauthorized rejection, replay prevention, mismatch, version update.",
  );
} finally {
  await connection.close();
}
