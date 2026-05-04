import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { network } from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const { ethers } = await network.create();
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const fileStorage = await ethers.deployContract("FileStorage");
  await fileStorage.waitForDeployment();

  const address = await fileStorage.getAddress();
  console.log("FileStorage deployed to:", address);

  // Export address + ABI to the frontend
  const frontendUtilsDir = path.join(__dirname, "..", "frontend", "src", "utils");
  fs.mkdirSync(frontendUtilsDir, { recursive: true });

  const addressPath = path.join(frontendUtilsDir, "contractAddress.json");
  fs.writeFileSync(addressPath, JSON.stringify({ FileStorage: address }, null, 2));

  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "FileStorage.sol",
    "FileStorage.json"
  );

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
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
