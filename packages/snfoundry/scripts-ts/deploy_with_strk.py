"""
Deploy ZK contracts on Starknet Sepolia using STRK fees (v3 transactions).

Usage:
    python3 deploy_with_strk.py

This script:
1. Declares Groth16VerifierBN254 (agent_identity_verifier)
2. Declares ZKPassport (updated for real Garaga API)
3. Deploys ZKPassport with (admin=deployer, verifier_class_hash=Groth16VerifierBN254)
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# starknet-py is installed in garaga-env
from starknet_py.net.full_node_client import FullNodeClient
from starknet_py.net.account.account import Account
from starknet_py.net.signer.key_pair import KeyPair
from starknet_py.contract import Contract
from starknet_py.net.models import StarknetChainId

RPC_URL = "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/oX6CVMWKcDva93Z4ZrmZ1"
DEPLOYER_ADDRESS = 0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e
PRIVATE_KEY = 0x06b7b806707e2f17ab5436da2edbdab6aed518cf70798436fd0a90fa40ed1442

WORKSPACE = Path("/home/ujwal/Desktop/coding/BitZen")

# Compiled Sierra + CASM for Groth16VerifierBN254
GROTH16_SIERRA = WORKSPACE / "packages/backend/circuits/agent_identity_verifier/target/release/agent_identity_verifier_Groth16VerifierBN254.contract_class.json"
GROTH16_CASM   = WORKSPACE / "packages/backend/circuits/agent_identity_verifier/target/release/agent_identity_verifier_Groth16VerifierBN254.compiled_contract_class.json"

# Compiled Sierra + CASM for ZKPassport
ZKPASSPORT_SIERRA = WORKSPACE / "packages/snfoundry/contracts/target/release/contracts_ZKPassport.contract_class.json"
ZKPASSPORT_CASM   = WORKSPACE / "packages/snfoundry/contracts/target/release/contracts_ZKPassport.compiled_contract_class.json"


async def main():
    client = FullNodeClient(node_url=RPC_URL)
    key_pair = KeyPair.from_private_key(PRIVATE_KEY)
    account = Account(
        address=DEPLOYER_ADDRESS,
        client=client,
        key_pair=key_pair,
        chain=StarknetChainId.SEPOLIA,
    )

    nonce = await account.get_nonce()
    print(f"Current nonce: {nonce}")

    # Read compiled contracts
    if not GROTH16_SIERRA.exists():
        print(f"ERROR: {GROTH16_SIERRA} not found. Run 'scarb build' in agent_identity_verifier/")
        sys.exit(1)
    if not ZKPASSPORT_SIERRA.exists():
        print(f"ERROR: {ZKPASSPORT_SIERRA} not found. Run 'scarb build' in snfoundry/contracts/")
        sys.exit(1)

    groth16_sierra = GROTH16_SIERRA.read_text()
    groth16_casm   = GROTH16_CASM.read_text()
    zkpassport_sierra = ZKPASSPORT_SIERRA.read_text()
    zkpassport_casm   = ZKPASSPORT_CASM.read_text()

    # ─── Step 1: Declare Groth16VerifierBN254 ───────────────────────────────
    print("\n[1/3] Declaring Groth16VerifierBN254...")
    try:
        groth16_res = await Contract.declare_v3(
            account=account,
            compiled_contract=groth16_sierra,
            compiled_contract_casm=groth16_casm,
            auto_estimate=True,
            auto_estimate_tip=True,
        )
        print(f"  tx_hash: {hex(groth16_res.hash)}")
        print(f"  class_hash: {hex(groth16_res.class_hash)}")
        print("  Waiting for acceptance...")
        await groth16_res.wait_for_acceptance()
        groth16_class_hash = groth16_res.class_hash
        print(f"  ✓ Groth16VerifierBN254 declared: {hex(groth16_class_hash)}")
    except Exception as e:
        err = str(e)
        if "already declared" in err.lower() or "class_already_declared" in err.lower():
            groth16_class_hash = 0x58c77ac79de2da57dd66cdab4fdadb48130ff4ff38e13cc707acd22a66d8d54
            print(f"  Already declared. Using existing hash: {hex(groth16_class_hash)}")
        else:
            print(f"  ERROR: {e}")
            sys.exit(1)

    # ─── Step 2: Declare ZKPassport ─────────────────────────────────────────
    print("\n[2/3] Declaring ZKPassport...")
    try:
        zkp_res = await Contract.declare_v3(
            account=account,
            compiled_contract=zkpassport_sierra,
            compiled_contract_casm=zkpassport_casm,
            auto_estimate=True,
            auto_estimate_tip=True,
        )
        print(f"  tx_hash: {hex(zkp_res.hash)}")
        print(f"  class_hash: {hex(zkp_res.class_hash)}")
        print("  Waiting for acceptance...")
        await zkp_res.wait_for_acceptance()
        zkpassport_class_hash = zkp_res.class_hash
        print(f"  ✓ ZKPassport declared: {hex(zkpassport_class_hash)}")
    except Exception as e:
        err = str(e)
        if "already declared" in err.lower() or "class_already_declared" in err.lower():
            # Extract class hash from error or from compile output
            import re
            m = re.search(r'0x[0-9a-f]+', err)
            if m:
                zkpassport_class_hash = int(m.group(), 16)
                print(f"  Already declared: {hex(zkpassport_class_hash)}")
            else:
                print(f"  ERROR (cannot get class hash): {e}")
                sys.exit(1)
        else:
            print(f"  ERROR: {e}")
            sys.exit(1)

    # ─── Step 3: Deploy ZKPassport ───────────────────────────────────────────
    print(f"\n[3/3] Deploying ZKPassport instance...")
    print(f"  class_hash: {hex(zkpassport_class_hash)}")
    print(f"  admin: {hex(DEPLOYER_ADDRESS)}")
    print(f"  verifier_class_hash: {hex(groth16_class_hash)}")

    deployed = await Contract.deploy_contract_v3(
        account=account,
        class_hash=zkpassport_class_hash,
        abi=json.loads(zkpassport_sierra)["abi"],
        constructor_args=[DEPLOYER_ADDRESS, groth16_class_hash],
        auto_estimate=True,
        auto_estimate_tip=True,
    )
    print(f"  deploy tx_hash: {hex(deployed.hash)}")
    print("  Waiting for acceptance...")
    await deployed.wait_for_acceptance()
    zkpassport_address = deployed.deployed_contract.address
    print(f"\n  ✓ ZKPassport deployed at: {hex(zkpassport_address)}")

    # ─── Summary ──────────────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("DEPLOYMENT COMPLETE")
    print("="*60)
    print(f"Groth16VerifierBN254 class: {hex(groth16_class_hash)}")
    print(f"ZKPassport class:           {hex(zkpassport_class_hash)}")
    print(f"ZKPassport address:         {hex(zkpassport_address)}")
    print()
    print("Add to packages/backend/.env:")
    print(f"ZKPASSPORT_ADDRESS={hex(zkpassport_address)}")
    print(f"GARAGA_VERIFIER_CLASS_HASH={hex(groth16_class_hash)}")


if __name__ == "__main__":
    asyncio.run(main())
