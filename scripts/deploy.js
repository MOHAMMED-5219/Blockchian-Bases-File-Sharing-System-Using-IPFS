import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import hre from "hardhat";
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Get the first account from hardhat node
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const signer = new ethers.Wallet(privateKey, provider);
  
  console.log("Deploying with:", signer.address);

  // Read the artifact
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "FileStorage.sol",
    "FileStorage.json"
  );
  
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  
  // Create contract factory
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const fileStorage = await factory.deploy();
  await fileStorage.waitForDeployment();

  const address = await fileStorage.getAddress();
  console.log("FileStorage deployed to:", address);

  // Export address + ABI to the frontend
  const frontendUtilsDir = path.join(__dirname, "..", "frontend", "src", "utils");
  fs.mkdirSync(frontendUtilsDir, { recursive: true });

  const addressPath = path.join(frontendUtilsDir, "contractAddress.json");
  fs.writeFileSync(addressPath, JSON.stringify({ FileStorage: address }, null, 2));

  const abiPath = path.join(frontendUtilsDir, "FileStorage.abi.json");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));

  console.log("Exported frontend config to:");
  console.log("-", addressPath);
  console.log("-", abiPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
