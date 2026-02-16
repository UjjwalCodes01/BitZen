#!/bin/bash
# BitZen - Redeploy with MockGaragaVerifier
# This script declares the mock verifier and redeploys ZKPassport with it

set -e

echo "🚀 BitZen - Redeploying with MockGaragaVerifier"
echo "================================================"
echo ""

# Use argent_account (the one with private key)
ACCOUNT="argent_account"
ADMIN="0x018f34152a21b9b458e4511860bf594885c14003c453b7de326c4053fcf2a7f1"

echo "Step 1: Checking account status..."
echo "✅ Using account: $ACCOUNT"

echo ""
echo "Step 2: Building contracts..."
cd /home/ujwal/Desktop/coding/BitZen/packages/snfoundry/contracts
scarb build

echo ""
echo "Step 3: Declaring MockGaragaVerifier..."
MOCK_VERIFIER_OUTPUT=$(sncast -a $ACCOUNT declare --contract-name MockGaragaVerifier 2>&1 || true)
echo "$MOCK_VERIFIER_OUTPUT"
MOCK_VERIFIER_CLASS_HASH=$(echo "$MOCK_VERIFIER_OUTPUT" | grep -oP 'class_hash: \K0x[0-9a-fA-F]+' | head -1)

if [ -z "$MOCK_VERIFIER_CLASS_HASH" ]; then
    # Check if already declared
    if echo "$MOCK_VERIFIER_OUTPUT" | grep -q "already declared"; then
        echo "⚠️  MockGaragaVerifier already declared, extracting class hash..."
        MOCK_VERIFIER_CLASS_HASH=$(echo "$MOCK_VERIFIER_OUTPUT" | grep -oP '0x[0-9a-fA-F]{60,}' | head -1)
    else
        # Try alternative parsing
        MOCK_VERIFIER_CLASS_HASH=$(echo "$MOCK_VERIFIER_OUTPUT" | grep -oP '0x[0-9a-fA-F]{60,}' | head -1)
    fi
fi

if [ -z "$MOCK_VERIFIER_CLASS_HASH" ]; then
    echo "❌ Failed to extract MockGaragaVerifier class hash"
    exit 1
fi

echo "✅ MockGaragaVerifier class hash: $MOCK_VERIFIER_CLASS_HASH"

echo ""
echo "Step 4: Declaring ZKPassport..."
ZKPASSPORT_OUTPUT=$(sncast -a $ACCOUNT declare --contract-name ZKPassport 2>&1 || true)
echo "$ZKPASSPORT_OUTPUT"
ZKPASSPORT_CLASS_HASH=$(echo "$ZKPASSPORT_OUTPUT" | grep -oP 'class_hash: \K0x[0-9a-fA-F]+' | head -1)

if [ -z "$ZKPASSPORT_CLASS_HASH" ]; then
    if echo "$ZKPASSPORT_OUTPUT" | grep -q "already declared"; then
        echo "⚠️  ZKPassport already declared, extracting class hash..."
        ZKPASSPORT_CLASS_HASH=$(echo "$ZKPASSPORT_OUTPUT" | grep -oP '0x[0-9a-fA-F]{60,}' | head -1)
    else
        ZKPASSPORT_CLASS_HASH=$(echo "$ZKPASSPORT_OUTPUT" | grep -oP '0x[0-9a-fA-F]{60,}' | head -1)
    fi
fi

if [ -z "$ZKPASSPORT_CLASS_HASH" ]; then
    echo "❌ Failed to extract ZKPassport class hash"
    exit 1
fi

echo "✅ ZKPassport class hash: $ZKPASSPORT_CLASS_HASH"

echo ""
echo "Step 5: Deploying ZKPassport with MockGaragaVerifier..."
# Constructor params: admin, verifier_class_hash

DEPLOY_OUTPUT=$(sncast -a $ACCOUNT deploy \
    --class-hash "$ZKPASSPORT_CLASS_HASH" \
    --constructor-calldata "$ADMIN" "$MOCK_VERIFIER_CLASS_HASH" 2>&1 || true)

echo "$DEPLOY_OUTPUT"
ZKPASSPORT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'contract_address: \K0x[0-9a-fA-F]+' | head -1)

if [ -z "$ZKPASSPORT_ADDRESS" ]; then
    ZKPASSPORT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP '0x[0-9a-fA-F]{60,}' | grep -v "$ZKPASSPORT_CLASS_HASH" | grep -v "$MOCK_VERIFIER_CLASS_HASH" | head -1)
fi

if [ -z "$ZKPASSPORT_ADDRESS" ]; then
    echo "❌ Failed to extract ZKPassport address"
    exit 1
fi

echo "✅ ZKPassport deployed at: $ZKPASSPORT_ADDRESS"

echo ""
echo "=========================================="
echo "🎉 Deployment Complete!"
echo "=========================================="
echo ""
echo "Contract Addresses:"
echo "-------------------"
echo "MockGaragaVerifier: $MOCK_VERIFIER_CLASS_HASH (class hash)"
echo "ZKPassport:         $ZKPASSPORT_ADDRESS"
echo ""
echo "Update these in your backend .env:"
echo "-----------------------------------"
echo "ZKPASSPORT_ADDRESS=$ZKPASSPORT_ADDRESS"
echo ""
echo "View on Explorer:"
echo "https://sepolia.starkscan.co/contract/$ZKPASSPORT_ADDRESS"
echo ""
echo "Next steps:"
echo "1. Update /home/ujwal/Desktop/coding/BitZen/packages/backend/.env with ZKPASSPORT_ADDRESS=$ZKPASSPORT_ADDRESS"
echo "2. Restart your backend server"
echo "3. Try registering an agent again"
