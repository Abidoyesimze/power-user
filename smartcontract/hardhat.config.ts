import type { HardhatUserConfig } from "hardhat/config";
import dotenv from "dotenv";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";

dotenv.config();

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    version: "0.8.20",
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
      chainId: 31, // RSK Testnet chain ID
      forking: {
        url: "https://public-node.testnet.rsk.co",
        enabled: false, // Set to true when you want to fork
      },
    },
    rskTestnet: {
      type: "http",
      chainId: 31,
      url: process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,
    },
    rskMainnet: {
      type: "http",
      url: "https://public-node.rsk.co",
      chainId: 30,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 60000000,
    },
  },
  etherscan: {
    apiKey: {
      rskTestnet: process.env.ROOTSTOCK_TESTNET_API_KEY || "",
      rootstock: process.env.ROOTSTOCK_TESTNET_API_KEY || "",
    },
    customChains: [
      {
        network: "rskTestnet",
        chainId: 31,
        urls: {
          apiURL: "https://api-explorer.testnet.rootstock.io/api",
          browserURL: "https://explorer.testnet.rootstock.io"
        }
      },
      {
        network: "rootstock",
        chainId: 31,
        urls: {
          apiURL: "https://api-explorer.testnet.rootstock.io/api",
          browserURL: "https://explorer.testnet.rootstock.io"
        }
      }
    ]
  },
};

export default config;
