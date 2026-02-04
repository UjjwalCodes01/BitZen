#!/bin/bash

# BitZen Starkli Deployment Script
# Uses starkli which handles Cairo compiler version correctly

set -e

echo "🚀 BitZen Starkli Deployment"
echo "========================================"

# Configuration
ACCOUNT_FILE="/home/ujwal/Desktop/coding/BitZen/argent_account.json"
RPC_URL="https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/oX6CVMWKcDva93Z4ZrmZ1"
ACCOUNT_ADDR="0x018f34152a21b9B458e4511860bf594885c14003C453b7DE326c4053fcf2a7f1"
PRIVATE_KEY="0x06b7b806707e2f17ab5436da2edbdab6aed518cf70798436fd0a90fa40ed1442"
GARAGA_VERIFIER="0x59d24936725776758dc34d74b254d15f74b26683018470b6357d23dcab6b4bd"
STRK_TOKEN="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"

cd /home/ujwal/Desktop/coding/BitZen/packages/snfoundry/contracts

echo ""
echo "📋 STEP 1: Declaring AgentAccount..."
AGENT_CLASS_HASH=$(starkli declare target/dev/contracts_AgentAccount.contract_class.json \
  --rpc "$RPC_URL" \
  --account "$ACCOUNT_FILE" \
  --private-key "$PRIVATE_KEY" \
  2>&1 | tee /dev/tty | grep -oP '0x[0-9a-f]{64}' | tail -1)

echo "✅ AgentAccount class hash: $AGENT_CLASS_HASH"

echo ""
echo "📋 STEP 2: Declaring ZKPassport..."
ZKPASSPORT_CLASS_HASH=$(starkli declare target/dev/contracts_ZKPassport.contract_class.json \
  --rpc "$RPC_URL" \
  --account "$ACCOUNT_FILE" \
  --private-key "$PRIVATE_KEY" \
  2>&1 | tee /dev/tty | grep -oP '0x[0-9a-f]{64}' | tail -1)

echo "✅ ZKPassport class hash: $ZKPASSPORT_CLASS_HASH"

echo ""
echo "📋 STEP 3: Declaring ServiceRegistry..."
SERVICE_CLASS_HASH=$(starkli declare target/dev/contracts_ServiceRegistry.contract_class.json \
  --rpc "$RPC_URL" \
  --account "$ACCOUNT_FILE" \
  --private-key "$PRIVATE_KEY" \
  2>&1 | tee /dev/tty | grep -oP '0x[0-9a-f]{64}' | tail -1)

echo "✅ ServiceRegistry class hash: $SERVICE_CLASS_HASH"

echo ""
echo "📋 STEP 4: Deploying AgentAccount..."
AGENT_ADDRESS=$(starkli deploy "$AGENT_CLASS_HASH" "$ACCOUNT_ADDR" \
  --rpc "$RPC_URL" \
  --account "$ACCOUNT_FILE" \
  --private-key "$PRIVATE_KEY" \
  2>&1 | tee /dev/tty | grep -oP '0x[0-9a-f]{64}' | tail -1)

echo "✅ AgentAccount deployed at: $AGENT_ADDRESS"

echo ""
echo "📋 STEP 5: Deploying ZKPassport..."
ZKPASSPORT_ADDRESS=$(starkli deploy "$ZKPASSPORT_CLASS_HASH" "$ACCOUNT_ADDR" "$GARAGA_VERIFIER" \
  --rpc "$RPC_URL" \
  --account "$ACCOUNT_FILE" \
  --private-key "$PRIVATE_KEY" \
  2>&1 | tee /dev/tty | grep -oP '0x[0-9a-f]{64}' | tail -1)

echo "✅ ZKPassport deployed at: $ZKPASSPORT_ADDRESS"

echo ""
echo "📋 STEP 6: Deploying ServiceRegistry..."
# Constructor: admin, strk_token, min_stake (u256 as 2 felts), slash_threshold
SERVICE_ADDRESS=$(starkli deploy "$SERVICE_CLASS_HASH" \
  "$ACCOUNT_ADDR" \
  "$STRK_TOKEN" \
  "0xde0b6b3a7640000" "0x0" \
  "0x46" \
  --rpc "$RPC_URL" \
  --account "$ACCOUNT_FILE" \
  --private-key "$PRIVATE_KEY" \
  2>&1 | tee /dev/tty | grep -oP '0x[0-9a-f]{64}' | tail -1)

echo "✅ ServiceRegistry deployed at: $SERVICE_ADDRESS"

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "========================================"
echo "AgentAccount: $AGENT_ADDRESS"
echo "ZKPassport: $ZKPASSPORT_ADDRESS"
echo "ServiceRegistry: $SERVICE_ADDRESS"

# Save to deployments.json
cat > ../deployments.json <<EOF
{
  "AgentAccount": {
    "classHash": "$AGENT_CLASS_HASH",
    "address": "$AGENT_ADDRESS"
  },
  "ZKPassport": {
    "classHash": "$ZKPASSPORT_CLASS_HASH",
    "address": "$ZKPASSPORT_ADDRESS"
  },
  "ServiceRegistry": {
    "classHash": "$SERVICE_CLASS_HASH",
    "address": "$SERVICE_ADDRESS"
  },
  "network": "sepolia",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo ""
echo "📝 Deployment info saved to deployments.json"
