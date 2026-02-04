#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "==================================="
echo "BitZen Testnet Deployment Script"
echo "==================================="
echo ""
echo "Network: Sepolia"
echo "RPC: ${STARKNET_RPC_URL}"
echo "Account: ${ACCOUNT_NAME}"
echo ""

cd contracts

# Build contracts
echo "📦 Building contracts..."
scarb build
echo "✅ Build complete"
echo ""

# Declare contracts
echo "📝 Declaring contracts..."

echo "Declaring AgentAccount..."
AGENT_ACCOUNT_CLASS_HASH=$(sncast --account ${ACCOUNT_NAME} \
    --url ${STARKNET_RPC_URL} \
    declare \
    --contract-name AgentAccount \
    2>&1 | grep -oP 'class_hash: \K0x[a-fA-F0-9]+' || echo "")

if [ -z "$AGENT_ACCOUNT_CLASS_HASH" ]; then
    echo "⚠️  AgentAccount already declared or error occurred"
else
    echo "✅ AgentAccount declared: $AGENT_ACCOUNT_CLASS_HASH"
fi
echo ""

echo "Declaring ZKPassport..."
ZKPASSPORT_CLASS_HASH=$(sncast --account ${ACCOUNT_NAME} \
    --url ${STARKNET_RPC_URL} \
    declare \
    --contract-name ZKPassport \
    2>&1 | grep -oP 'class_hash: \K0x[a-fA-F0-9]+' || echo "")

if [ -z "$ZKPASSPORT_CLASS_HASH" ]; then
    echo "⚠️  ZKPassport already declared or error occurred"
else
    echo "✅ ZKPassport declared: $ZKPASSPORT_CLASS_HASH"
fi
echo ""

echo "Declaring ServiceRegistry..."
SERVICE_REGISTRY_CLASS_HASH=$(sncast --account ${ACCOUNT_NAME} \
    --url ${STARKNET_RPC_URL} \
    declare \
    --contract-name ServiceRegistry \
    2>&1 | grep -oP 'class_hash: \K0x[a-fA-F0-9]+' || echo "")

if [ -z "$SERVICE_REGISTRY_CLASS_HASH" ]; then
    echo "⚠️  ServiceRegistry already declared or error occurred"
else
    echo "✅ ServiceRegistry declared: $SERVICE_REGISTRY_CLASS_HASH"
fi
echo ""

# Deploy contracts
echo "🚀 Deploying contracts..."
echo ""

# Deploy ZKPassport with real Garaga verifier
echo "Deploying ZKPassport with Garaga verifier..."
echo "Using Garaga class hash: ${GARAGA_VERIFIER_CLASS_HASH}"

ZKPASSPORT_ADDRESS=$(sncast --account ${ACCOUNT_NAME} \
    --url ${STARKNET_RPC_URL} \
    deploy \
    --class-hash ${ZKPASSPORT_CLASS_HASH} \
    --constructor-calldata ${ACCOUNT_ADDRESS} ${GARAGA_VERIFIER_CLASS_HASH} \
    2>&1 | grep -oP 'contract_address: \K0x[a-fA-F0-9]+' || echo "")

if [ -n "$ZKPASSPORT_ADDRESS" ]; then
    echo "✅ ZKPassport deployed at: $ZKPASSPORT_ADDRESS"
else
    echo "❌ Failed to deploy ZKPassport"
    exit 1
fi
echo ""

# Deploy ServiceRegistry with Sepolia STRK token
SEPOLIA_STRK="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
MIN_STAKE_LOW="0xde0b6b3a7640000"  # 1 STRK in hex (low)
MIN_STAKE_HIGH="0x0"                # 1 STRK in hex (high)

echo "Deploying ServiceRegistry..."
SERVICE_REGISTRY_ADDRESS=$(sncast --account ${ACCOUNT_NAME} \
    --url ${STARKNET_RPC_URL} \
    deploy \
    --class-hash ${SERVICE_REGISTRY_CLASS_HASH} \
    --constructor-calldata ${ACCOUNT_ADDRESS} ${SEPOLIA_STRK} ${MIN_STAKE_LOW} ${MIN_STAKE_HIGH} \
    2>&1 | grep -oP 'contract_address: \K0x[a-fA-F0-9]+' || echo "")

if [ -n "$SERVICE_REGISTRY_ADDRESS" ]; then
    echo "✅ ServiceRegistry deployed at: $SERVICE_REGISTRY_ADDRESS"
else
    echo "❌ Failed to deploy ServiceRegistry"
    exit 1
fi
echo ""

# Save deployment addresses
echo "💾 Saving deployment info..."
cat > ../deployment_sepolia.json <<EOF
{
  "network": "sepolia",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contracts": {
    "AgentAccount": {
      "class_hash": "${AGENT_ACCOUNT_CLASS_HASH}"
    },
    "ZKPassport": {
      "class_hash": "${ZKPASSPORT_CLASS_HASH}",
      "address": "${ZKPASSPORT_ADDRESS}",
      "verifier_class_hash": "${GARAGA_VERIFIER_CLASS_HASH}"
    },
    "ServiceRegistry": {
      "class_hash": "${SERVICE_REGISTRY_CLASS_HASH}",
      "address": "${SERVICE_REGISTRY_ADDRESS}",
      "strk_token": "${SEPOLIA_STRK}",
      "min_stake": "1000000000000000000"
    }
  }
}
EOF

echo "✅ Deployment info saved to deployment_sepolia.json"
echo ""
echo "==================================="
echo "🎉 Deployment Complete!"
echo "==================================="
echo ""
echo "ZKPassport: ${ZKPASSPORT_ADDRESS}"
echo "ServiceRegistry: ${SERVICE_REGISTRY_ADDRESS}"
echo ""
echo "Verify on Voyager:"
echo "https://sepolia.voyager.online/contract/${ZKPASSPORT_ADDRESS}"
echo "https://sepolia.voyager.online/contract/${SERVICE_REGISTRY_ADDRESS}"
