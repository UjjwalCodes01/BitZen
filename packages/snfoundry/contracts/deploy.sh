#!/bin/bash
# BitZen Testnet Deployment Script

set -e

echo "🚀 BitZen Testnet Deployment Script"
echo "===================================="
echo ""

# Check if account is deployed
echo "Step 1: Checking account status..."
if ! sncast account list --network sepolia | grep -q "oz-deployer.*deployed"; then
    echo "⚠️  Account not yet deployed. Deploying now..."
    sncast account deploy --profile oz-deployer
    echo "✅ Account deployed successfully"
else
    echo "✅ Account already deployed"
fi

echo ""
echo "Step 2: Building contracts..."
scarb build

echo ""
echo "Step 3: Declaring ZKPassport..."
ZKPASSPORT_CLASS_HASH=$(sncast --profile oz-deployer declare --contract-name ZKPassport | grep "class_hash" | awk '{print $2}')
echo "✅ ZKPassport class hash: $ZKPASSPORT_CLASS_HASH"

echo ""
echo "Step 4: Declaring AgentAccount..."
AGENT_CLASS_HASH=$(sncast --profile oz-deployer declare --contract-name AgentAccount | grep "class_hash" | awk '{print $2}')
echo "✅ AgentAccount class hash: $AGENT_CLASS_HASH"

echo ""
echo "Step 5: Declaring ServiceRegistry..."
REGISTRY_CLASS_HASH=$(sncast --profile oz-deployer declare --contract-name ServiceRegistry | grep "class_hash" | awk '{print $2}')
echo "✅ ServiceRegistry class hash: $REGISTRY_CLASS_HASH"

echo ""
echo "Step 6: Deploying ZKPassport..."
# Constructor params: admin, verifier_class_hash
ADMIN="0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e"
GARAGA_VERIFIER="0x59d24936f0a7d9df4eb0c87c4d6f6843fe13b2ad89d6e9a46ea6b3c16c410c0"

ZKPASSPORT_ADDRESS=$(sncast --profile oz-deployer deploy \
    --class-hash "$ZKPASSPORT_CLASS_HASH" \
    --constructor-calldata "$ADMIN" "$GARAGA_VERIFIER" | grep "contract_address" | awk '{print $2}')
echo "✅ ZKPassport deployed at: $ZKPASSPORT_ADDRESS"

echo ""
echo "Step 7: Deploying ServiceRegistry..."
REGISTRY_ADDRESS=$(sncast --profile oz-deployer deploy \
    --class-hash "$REGISTRY_CLASS_HASH" \
    --constructor-calldata "$ADMIN" | grep "contract_address" | awk '{print $2}')
echo "✅ ServiceRegistry deployed at: $REGISTRY_ADDRESS"

echo ""
echo "=========================================="
echo "🎉 Deployment Complete!"
echo "=========================================="
echo ""
echo "Contract Addresses:"
echo "-------------------"
echo "ZKPassport:       $ZKPASSPORT_ADDRESS"
echo "ServiceRegistry:  $REGISTRY_ADDRESS"
echo ""
echo "Class Hashes:"
echo "-------------"
echo "ZKPassport:       $ZKPASSPORT_CLASS_HASH"
echo "AgentAccount:     $AGENT_CLASS_HASH"
echo "ServiceRegistry:  $REGISTRY_CLASS_HASH"
echo ""
echo "View on Explorer:"
echo "ZKPassport: https://sepolia.starkscan.co/contract/$ZKPASSPORT_ADDRESS"
echo "ServiceRegistry: https://sepolia.starkscan.co/contract/$REGISTRY_ADDRESS"
