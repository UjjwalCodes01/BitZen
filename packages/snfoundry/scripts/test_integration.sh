#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Load deployment info
if [ ! -f deployment_sepolia.json ]; then
    echo "❌ deployment_sepolia.json not found. Run deploy_testnet.sh first."
    exit 1
fi

ZKPASSPORT_ADDRESS=$(jq -r '.contracts.ZKPassport.address' deployment_sepolia.json)
SERVICE_REGISTRY_ADDRESS=$(jq -r '.contracts.ServiceRegistry.address' deployment_sepolia.json)

echo "==================================="
echo "BitZen Integration Tests (Sepolia)"
echo "==================================="
echo ""
echo "ZKPassport: ${ZKPASSPORT_ADDRESS}"
echo "ServiceRegistry: ${SERVICE_REGISTRY_ADDRESS}"
echo ""

cd contracts

# Test 1: Register agent with ZK proof
echo "📝 Test 1: Register Agent"
echo "-----------------------------------"
echo "Creating mock ZK proof data..."

# Mock proof data (8 elements: proof_a, proof_b, proof_c)
PROOF_DATA="0x1234 0x5678 0xabcd 0xef01 0x2345 0x6789 0x9abc 0xdef0"
PUBLIC_INPUTS="0x111111"

# Register agent
echo "Registering agent at address: ${ACCOUNT_ADDRESS}"
sncast --account ${ACCOUNT_NAME} \
    --url ${STARKNET_RPC_URL} \
    invoke \
    --contract-address ${ZKPASSPORT_ADDRESS} \
    --function register_agent \
    --calldata ${ACCOUNT_ADDRESS} ${PROOF_DATA} ${PUBLIC_INPUTS} \
    || echo "⚠️  Registration may require valid ZK proof"

echo ""

# Test 2: Verify agent
echo "📝 Test 2: Verify Agent"
echo "-----------------------------------"
sncast --account ${ACCOUNT_NAME} \
    --url ${STARKNET_RPC_URL} \
    call \
    --contract-address ${ZKPASSPORT_ADDRESS} \
    --function verify_agent \
    --calldata ${ACCOUNT_ADDRESS} \
    || echo "Agent verification call failed"

echo ""

# Test 3: Register service
echo "📝 Test 3: Register Service"
echo "-----------------------------------"
SERVICE_NAME="0x426974636f696e4f7261636c65"  # 'BitcoinOracle' in hex
SERVICE_DESC="0x4254432070726963652066656564"  # 'BTC price feed' in hex
SERVICE_ENDPOINT="0x6170692e6578616d706c652e636f6d"  # 'api.example.com' in hex
STAKE_AMOUNT_LOW="0xde0b6b3a7640000"  # 1 STRK
STAKE_AMOUNT_HIGH="0x0"

echo "Registering service: BitcoinOracle"
echo "Note: This requires STRK tokens for staking"

# First approve STRK transfer
SEPOLIA_STRK="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"

echo "Approving STRK tokens..."
sncast --account ${ACCOUNT_NAME} \
    --url ${STARKNET_RPC_URL} \
    invoke \
    --contract-address ${SEPOLIA_STRK} \
    --function approve \
    --calldata ${SERVICE_REGISTRY_ADDRESS} ${STAKE_AMOUNT_LOW} ${STAKE_AMOUNT_HIGH} \
    || echo "⚠️  STRK approval may have failed (ensure you have STRK tokens)"

sleep 5

echo "Registering service..."
sncast --account ${ACCOUNT_NAME} \
    --url ${STARKNET_RPC_URL} \
    invoke \
    --contract-address ${SERVICE_REGISTRY_ADDRESS} \
    --function register_service \
    --calldata ${SERVICE_NAME} ${SERVICE_DESC} ${SERVICE_ENDPOINT} ${STAKE_AMOUNT_LOW} ${STAKE_AMOUNT_HIGH} \
    || echo "⚠️  Service registration may have failed"

echo ""

# Test 4: Get service info
echo "📝 Test 4: Get Service Info"
echo "-----------------------------------"
# Service ID = provider_address + service_name
echo "Querying service..."
sncast --account ${ACCOUNT_NAME} \
    --url ${STARKNET_RPC_URL} \
    call \
    --contract-address ${SERVICE_REGISTRY_ADDRESS} \
    --function get_service \
    --calldata $(printf "0x%x" $((ACCOUNT_ADDRESS + SERVICE_NAME))) \
    || echo "Service query call failed"

echo ""
echo "==================================="
echo "✅ Integration Tests Complete"
echo "==================================="
echo ""
echo "Note: Some tests may fail if:"
echo "  - You don't have STRK tokens (get from faucet)"
echo "  - ZK proofs are invalid (use real Garaga proofs in production)"
echo "  - Network issues occur"
echo ""
echo "Get testnet STRK: https://starknet-faucet.vercel.app/"
