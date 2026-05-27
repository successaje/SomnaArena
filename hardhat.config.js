import { defineConfig } from "hardhat/config";
import dotenv from "dotenv";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatVerify from "@nomicfoundation/hardhat-verify";

dotenv.config();

// Fallback zero key if key is not yet set in .env to prevent Hardhat from crashing on config load
const privateKey = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

export default defineConfig({
  plugins: [hardhatEthers, hardhatVerify],
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
    somniaTestnet: {
      type: "http",
      url: process.env.SOMNIA_RPC_URL || "https://api.infra.testnet.somnia.network/",
      chainId: 50312,
      accounts: [privateKey],
    },
  },
  etherscan: {
    apiKey: {
      somniaTestnet: "blockscout-key-not-needed",
      blockscout: "blockscout-key-not-needed"
    },
    customChains: [
      {
        network: "somniaTestnet",
        chainId: 50312,
        urls: {
          apiURL: "https://shannon-explorer.somnia.network/api",
          browserURL: "https://shannon-explorer.somnia.network"
        }
      }
    ]
  },
  chainDescriptors: {
    50312: {
      name: "somniaTestnet",
      blockExplorers: {
        blockscout: {
          name: "Blockscout",
          url: "https://shannon-explorer.somnia.network",
          apiUrl: "https://shannon-explorer.somnia.network/api",
        },
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
});
