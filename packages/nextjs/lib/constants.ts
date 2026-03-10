// ============================================
// BitZen — Contract Constants
// ============================================

export const CONTRACTS = {
  ZK_PASSPORT:
    process.env.NEXT_PUBLIC_ZKPASSPORT_ADDRESS ||
    "0x045298a1c7f2f2faf2aa75f794c5f96a5c282a80d2dbcfd4bfb5045a76101667",
  SERVICE_REGISTRY:
    process.env.NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS ||
    "0x003dd0b9ff0f9f41362c53072013af888ea0b3b5a787ed9fe3d3bccc837b013e",
  AGENT_ACCOUNT_CLASS_HASH:
    process.env.NEXT_PUBLIC_AGENT_ACCOUNT_CLASS_HASH ||
    "0x04fe9dcc162b3da8d164d2a92f273491e8d8e76562af8b7fe5f82b66f4253f91",
  AGENT_ACCOUNT_ADDRESS:
    process.env.NEXT_PUBLIC_AGENT_ACCOUNT_ADDRESS ||
    "0x00118c2393507d824ff5a4698f010b5a43f56aaa95de1bffef7e4fa0f3d32f54",
} as const;

export const NETWORK = process.env.NEXT_PUBLIC_STARKNET_NETWORK || "sepolia";

export const RPC_URLS = {
  devnet:
    process.env.NEXT_PUBLIC_DEVNET_PROVIDER_URL || "http://127.0.0.1:5050",
  sepolia:
    process.env.NEXT_PUBLIC_SEPOLIA_PROVIDER_URL ||
    "https://free-rpc.nethermind.io/sepolia-juno/v0_7",
  mainnet:
    process.env.NEXT_PUBLIC_MAINNET_PROVIDER_URL ||
    "https://free-rpc.nethermind.io/mainnet-juno/v0_7",
} as const;

export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://sepolia.starkscan.co";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "BitZen";
export const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
  "Autonomous AI Agent Marketplace on Starknet";

export const FEATURES = {
  bitcoinSwaps: process.env.NEXT_PUBLIC_ENABLE_BITCOIN_SWAPS === "true",
  zkProofs: process.env.NEXT_PUBLIC_ENABLE_ZK_PROOFS === "true",
  sessionKeys: process.env.NEXT_PUBLIC_ENABLE_SESSION_KEYS === "true",
  marketplace: process.env.NEXT_PUBLIC_ENABLE_MARKETPLACE === "true",
} as const;
