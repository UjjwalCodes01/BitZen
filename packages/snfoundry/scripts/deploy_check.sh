#!/bin/bash
set -e

echo "======================================"
echo "BitZen Testnet Deployment"
echo "======================================"
echo ""

# Configuration
ACCOUNT="argent_account"
RPC_URL="https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/_hKu4IgnPgrF8O82GLuYU"
GARAGA_VERIFIER="0x59d24936f0a7d9df4eb0c87c4d6f6843fe13b2ad89d6e9a46ea6b3c16c410c0"
SEPOLIA_STRK="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
ADMIN_ADDRESS="0x018f34152a21b9B458e4511860bf594885c14003C453b7DE326c4053fcf2a7f1"

cd contracts

echo "Building contracts..."
scarb build
echo "✅ Build complete"
echo ""

# Try declaring with starkli instead
echo "Note: Using manual deployment approach due to sncast compatibility issues"
echo "Contracts are built and ready in target/dev/"
echo ""
echo "Contract artifacts:"
ls -lh target/dev/*.contract_class.json
echo ""

echo "======================================"
echo "⚠️  Manual Deployment Required"
echo "======================================"
echo ""
echo "Due to account signature issues with sncast, please deploy using:"
echo ""
echo "Option 1: Argent X Wallet (Recommended)"
echo "  1. Import your account to Argent X browser extension"
echo "  2. Use Remix or Voyager to deploy contracts"
echo ""
echo "Option 2: Create new OZ account"
echo "  sncast account create --name oz-deployer --add-profile"
echo "  # Fund the account from faucet"
echo "  sncast account deploy --name oz-deployer"
echo ""
echo "Alternatively, contracts are ready for direct integration testing"
echo "using the local test suite which covers 12/16 tests."
echo ""

