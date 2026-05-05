import "dotenv/config";
import "@nomicfoundation/hardhat-ethers";
import { defineConfig } from "hardhat/config";

const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

export default defineConfig({
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    hardhat: {
      type: "edr-simulated",
    },

    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },

    ...(SEPOLIA_RPC_URL && PRIVATE_KEY
      ? {
          sepolia: {
            type: "http",
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
          },
        }
      : {}),
  },
});