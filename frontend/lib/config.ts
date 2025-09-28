"use client";

// Network Configuration for Rootstock Testnet
export const NETWORK_CONFIG = {
  chainId: 31,
  name: 'Rootstock Testnet',
  rpcUrl: 'https://public-node.testnet.rsk.co',
  nativeCurrency: {
    name: 'Test Bitcoin',
    symbol: 'tRBTC', 
    decimals: 18,
  },
  blockExplorer: {
    name: 'RSK Explorer',
    url: 'https://explorer.testnet.rsk.co',
  },
};

export const SUPPORTED_CHAINS = [NETWORK_CONFIG];
