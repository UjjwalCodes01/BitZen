#!/usr/bin/env python3
"""
Full deployment of BitZen contracts to Sepolia
Uses starknet-py with v0.7 RPC compatibility
"""
import asyncio
import json
from pathlib import Path

async def main():
    from starknet_py.net.full_node_client import FullNodeClient
    from starknet_py.net.account.account import Account
    from starknet_py.net.models import StarknetChainId
    from starknet_py.net.signer.stark_curve_signer import KeyPair
    
    # Use Alchemy v0.7 RPC
    RPC_URL = "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/oX6CVMWKcDva93Z4ZrmZ1"
    PRIVATE_KEY = 0x06b7b806707e2f17ab5436da2edbdab6aed518cf70798436fd0a90fa40ed1442
    ACCOUNT_ADDRESS = 0x018f34152a21b9B458e4511860bf594885c14003C453b7DE326c4053fcf2a7f1
   
    print("\n🚀 BitZen Full Deployment to Sepolia")
    print("="*60)
    
    client = FullNodeClient(node_url=RPC_URL)
    key_pair = KeyPair.from_private_key(PRIVATE_KEY)
    account = Account(
        client=client,
        address=ACCOUNT_ADDRESS,
        key_pair=key_pair,
        chain=StarknetChainId.SEPOLIA,
    )
    
    print(f"✓ Account: {hex(ACCOUNT_ADDRESS)}")
    
    base_dir = Path(__file__).parent.parent / "contracts" / "target" / "dev"
    
    # Step 1: Declare ServiceRegistry (no dependencies)
    print("\n📝 Step 1: Declaring ServiceRegistry...")
    try:
        with open(base_dir / "contracts_ServiceRegistry.contract_class.json") as f:
            sierra = json.load(f)
        with open(base_dir / "contracts_ServiceRegistry.compiled_contract_class.json") as f:
            casm = json.load(f)
        
        casm_hash = int(casm["class_hash"], 16)
        declare_tx = await account.sign_declare_v2(
            compiled_contract=sierra,
            compiled_class_hash=casm_hash,
            max_fee=int(5e16),  # 0.05 ETH
        )
        await account.client.wait_for_tx(declare_tx.transaction_hash)
        registry_class_hash = declare_tx.class_hash
        print(f"✅ ServiceRegistry declared: {hex(registry_class_hash)}")
        print(f"   Tx: {hex(declare_tx.transaction_hash)}")
    except Exception as e:
        if "already" in str(e).lower():
            print(f"⚠️  ServiceRegistry already declared")
            # Extract class hash from error or use known value
            registry_class_hash = 0x4829f1031a1efd16792cf98e16b08c147de25837cdc03f285ffbc9b1e248c1c
            print(f"   Using: {hex(registry_class_hash)}")
        else:
            print(f"❌ Failed: {e}")
            return
    
    # Step 2: Deploy ServiceRegistry
    print("\n🚀 Step 2: Deploying ServiceRegistry...")
    try:
        deploy_result = await account.sign_invoke_v1(
            calls=[{
                "contractAddress": registry_class_hash,
                "entrypoint": "constructor",
                "calldata": [ACCOUNT_ADDRESS],  # admin
            }],
            max_fee=int(5e16),
        )
        await account.client.wait_for_tx(deploy_result.transaction_hash)
        registry_address = deploy_result.contract_address if hasattr(deploy_result, 'contract_address') else None
        print(f"✅ ServiceRegistry deployed: {hex(registry_address) if registry_address else 'Check explorer'}")
        print(f"   Tx: {hex(deploy_result.transaction_hash)}")
    except Exception as e:
        print(f"❌ Deploy failed: {e}")
    
    print("\n" + "="*60)
    print("🎉 Deployment Summary")
    print("="*60)
    print(f"\nServiceRegistry Class: {hex(registry_class_hash)}")
    if registry_address:
        print(f"ServiceRegistry Address: {hex(registry_address)}")
    print(f"\nExplorer: https://sepolia.starkscan.co/contract/{hex(registry_address) if registry_address else ''}")
    print("\n⚠️  Note: ZKPassport requires Garaga verifier library which must be")
    print("   obtained from https://github.com/keep-starknet-strange/garaga")
    print("   and declared separately before deploying ZKPassport.")

if __name__ == "__main__":
    asyncio.run(main())
