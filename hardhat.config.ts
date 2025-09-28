import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    rskTestnet: {
      url: process.env.RSK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co",
      chainId: 31,
      gasPrice: 60000000, // 60 Gwei
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,
      gasMultiplier: 1.25,
    },
    rskMainnet: {
      url: process.env.RSK_MAINNET_RPC_URL || "https://public-node.rsk.co",
      chainId: 30,
      gasPrice: 60000000, // 60 Gwei
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,
      gasMultiplier: 1.25,
    },
  },
  etherscan: {
    apiKey: {
      rskTestnet: "dummy", // Blockscout doesn't require API key
      rskMainnet: "dummy", // Blockscout doesn't require API key
    },
    customChains: [
      {
        network: "rskTestnet",
        chainId: 31,
        urls: {
          apiURL: "https://rootstock-testnet.blockscout.com/api",
          browserURL: "https://rootstock-testnet.blockscout.com",
        },
      },
      {
        network: "rskMainnet",
        chainId: 30,
        urls: {
          apiURL: "https://rootstock.blockscout.com/api",
          browserURL: "https://rootstock.blockscout.com",
        },
      },
    ],
  },
};

export default config;