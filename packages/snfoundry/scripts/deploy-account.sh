#!/bin/bash
# Deploy Argent X account on Sepolia

set -e

echo "🚀 Deploying Argent X Account to Sepolia"
echo "========================================"

PRIVATE_KEY="0x06b7b806707e2f17ab5436da2edbdab6aed518cf70798436fd0a90fa40ed1442"
ACCOUNT_ADDRESS="0x018f34152a21b9B458e4511860bf594885c14003C453b7DE326c4053fcf2a7f1"
RPC_URL="https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/oX6CVMWKcDva93Z4ZrmZ1"

# Argent X account class hash (official v0.3.0)
ARGENT_CLASS_HASH="0x01a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003"

source ~/.starkli/env

# Deploy the account
echo "Deploying account..."
starkli account deploy \
  ~/.starkli-wallets/keystore.json \
  --rpc $RPC_URL \
  --max-fee 0.01

echo ""
echo "✅ Account deployed successfully!"
echo "Address: $ACCOUNT_ADDRESS"
