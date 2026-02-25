#!/bin/bash
# Full trusted setup for AgentIdentity circuit
# Groth16 over BN254 — real ceremony for Starknet/Garaga

set -e
CIRCUITS_DIR="$(cd "$(dirname "$0")" && pwd)"
SNARKJS=/home/ujwal/.npm-global/bin/snarkjs
cd "$CIRCUITS_DIR"

echo "=== Step 1: Compile circuit ==="
circom agent_identity.circom --r1cs --wasm --sym -o .
echo "Circuit compiled: agent_identity.r1cs"

echo "=== Step 2: Powers of Tau (Phase 1) ==="
# Size 12 = supports up to 2^12 = 4096 constraints (our circuit has ~10)
$SNARKJS powersoftau new bn128 12 pot12_0000.ptau -v 2>&1 | tail -3
echo "Entropy contribution 1..."
$SNARKJS powersoftau contribute pot12_0000.ptau pot12_0001.ptau \
  --name="BitZen Initial Contribution" -e="$(openssl rand -hex 64)" 2>&1 | tail -3

echo "=== Step 3: Phase 2 preparation ==="
$SNARKJS powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v 2>&1 | tail -3
echo "Powers of tau complete."

echo "=== Step 4: Groth16 circuit-specific setup ==="
$SNARKJS groth16 setup agent_identity.r1cs pot12_final.ptau agent_id_0000.zkey 2>&1 | tail -3
echo "Entropy contribution to circuit zkey..."
$SNARKJS zkey contribute agent_id_0000.zkey agent_id_final.zkey \
  --name="BitZen ZKey Contribution" -e="$(openssl rand -hex 64)" 2>&1 | tail -3

echo "=== Step 5: Export verification key ==="
$SNARKJS zkey export verificationkey agent_id_final.zkey verification_key.json
echo "Verification key exported: verification_key.json"

echo ""
echo "=== Setup complete ==="
echo "Files generated:"
ls -lh agent_identity.r1cs agent_id_final.zkey verification_key.json agent_identity_js/
