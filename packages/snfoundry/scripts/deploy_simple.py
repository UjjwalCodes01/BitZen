#!/usr/bin/env python3
"""
Simple deployment script using starknet.py
Deploys AgentAccount and ServiceRegistry to Sepolia
"""

import asyncio
import json
from pathlib import Path
from starknet_py.net.full_node_client import FullNodeClient
from starknet_py.net.account.account import Account
from starknet_py.net.models import StarknetChainId, ResourceBounds
from starknet_py.net.signer.stark_curve_signer import KeyPair
from starknet_py.contract import Contract

# Configuration
RPC_URL = "https://starknet-sepolia.public.blastapi.io"
PRIVATE_KEY = 0x06b7b806707e2f17ab5436da2edbdab6aed518cf70798436fd0a90fa40ed1442
ACCOUNT_ADDRESS = 0x018f34152a21b9B458e4511860bf594885c14003C453b7DE326c4053fcf2a7f1

CONTRACTS_DIR = Path(__file__).parent.parent / "contracts" / "target" / "dev"

async def deploy_contract(contract_name: str, constructor_args: list):
    """Declare and deploy a contract"""
    print(f"\n{'='*60}")
    print(f"Deploying {contract_name}...")
    print(f"{'='*60}")
    
    # Load contract artifacts
    sierra_path = CONTRACTS_DIR / f"contracts_{contract_name}.contract_class.json"
    casm_path = CONTRACTS_DIR / f"contracts_{contract_name}.compiled_contract_class.json"
    
    with open(sierra_path) as f:
        sierra = json.load(f)
    with open(casm_path) as f:
        casm = json.load(f)
    
    # Setup client and account
    client = FullNodeClient(node_url=RPC_URL)
    key_pair = KeyPair.from_private_key(PRIVATE_KEY)
    account = Account(
        client=client,
        address=ACCOUNT_ADDRESS,
        key_pair=key_pair,
        chain=StarknetChainId.SEPOLIA,
    )
    
    print(f"✓ Account: {hex(ACCOUNT_ADDRESS)}")
    print(f"✓ Chain: Sepolia")
    
    # Declare contract
    print(f"\n📝 Declaring {contract_name}...")
    try:
        declare_result = await account.sign_declare_v3(
            compiled_contract=sierra,
            compiled_class_hash=int(casm["class_hash"], 16),
            l1_resource_bounds=ResourceBounds(
                max_amount=5000,
                max_price_per_unit=int(1e12),
            ),
        )
        await account.client.wait_for_tx(declare_result.transaction_hash)
        class_hash = declare_result.class_hash
        print(f"✅ Declared! Class hash: {hex(class_hash)}")
    except Exception as e:
        if "AlreadyDeclared" in str(e):
            # Extract class hash from error or compute it
            print(f"⚠️  Contract already declared")
            # We'll need to compute class hash manually
            from starknet_py.hash.class_hash import compute_sierra_class_hash
            class_hash = compute_sierra_class_hash(sierra)
            print(f"✓ Using existing class hash: {hex(class_hash)}")
        else:
            raise
    
    # Deploy contract
    print(f"\n🚀 Deploying {contract_name}...")
    deploy_result = await Contract.deploy_contract_v3(
        account=account,
        class_hash=class_hash,
        abi=sierra["abi"],
        constructor_args=constructor_args,
        l1_resource_bounds=ResourceBounds(
            max_amount=5000,
            max_price_per_unit=int(1e12),
        ),
    )
    await deploy_result.wait_for_acceptance()
    
    contract_address = deploy_result.deployed_contract.address
    print(f"✅ Deployed!")
    print(f"   Address: {hex(contract_address)}")
    print(f"   Tx Hash: {hex(deploy_result.hash)}")
    
    return {
        "name": contract_name,
        "class_hash": hex(class_hash),
        "address": hex(contract_address),
        "tx_hash": hex(deploy_result.hash),
    }

async def main():
    print("\n" + "="*60)
    print(" BitZen Contract Deployment to Sepolia")
    print("="*60)
    
    deployments = []
    
    # 1. Deploy AgentAccount
    print("\n[1/2] AgentAccount")
    agent_account = await deploy_contract(
        "AgentAccount",
        constructor_args=[ACCOUNT_ADDRESS],  # owner
    )
    deployments.append(agent_account)
    
    # 2. Deploy ServiceRegistry
    print("\n[2/2] ServiceRegistry")
    service_registry = await deploy_contract(
        "ServiceRegistry",
        constructor_args=[
            ACCOUNT_ADDRESS,  # admin
            0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d,  # STRK token
            1000000000000000000,  # min_stake (1 STRK - low part of u256)
            0,  # min_stake (high part of u256)
            70,  # slash_threshold
        ],
    )
    deployments.append(service_registry)
    
    # Save deployment info
    output_file = Path(__file__).parent.parent / "deployments_sepolia.json"
    with open(output_file, 'w') as f:
        json.dump({
            "network": "sepolia",
            "deployed_at": asyncio.get_event_loop().time(),
            "contracts": deployments,
        }, f, indent=2)
    
    print("\n" + "="*60)
    print("✅ All contracts deployed successfully!")
    print(f"📄 Deployment info saved to: {output_file}")
    print("="*60)
    
    for deployment in deployments:
        print(f"\n{deployment['name']}:")
        print(f"  Class Hash: {deployment['class_hash']}")
        print(f"  Address: {deployment['address']}")

if __name__ == "__main__":
    asyncio.run(main())
