// ============================================
// BitZen — Contract Constants
// ============================================

export const CONTRACTS = {
  ZK_PASSPORT:
    process.env.NEXT_PUBLIC_ZKPASSPORT_ADDRESS ||
    "0x045298a1c7f2f2faf2aa75f794c5f96a5c282a80d2dbcfd4bfb5045a76101667",
  SERVICE_REGISTRY:
    process.env.NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS ||
    "0x06b3b6f139090875372d25adfa8401c50474a05aeb8e4c1d0365601563aa32da",
  AGENT_ACCOUNT_CLASS_HASH:
    process.env.NEXT_PUBLIC_AGENT_ACCOUNT_CLASS_HASH ||
    "0x12ccc0cdeddc1eea432f376c78dca4d54db8bd0de66b3e150ecfb9d5cf47f00",
} as const;

export const NETWORK = process.env.NEXT_PUBLIC_STARKNET_NETWORK || "sepolia";

export const RPC_URLS = {
  devnet:
    process.env.NEXT_PUBLIC_DEVNET_PROVIDER_URL || "http://127.0.0.1:5050",
  sepolia:
    process.env.NEXT_PUBLIC_SEPOLIA_PROVIDER_URL ||
    "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/demo",
  mainnet:
    process.env.NEXT_PUBLIC_MAINNET_PROVIDER_URL ||
    "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_7/demo",
} as const;

export const EXPLORER_URL = "https://sepolia.starkscan.co";

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
