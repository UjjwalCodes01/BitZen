#!/usr/bin/env python3
"""Minimal deployment using starknet.py v2 transactions"""
import asyncio
import json
from pathlib import Path

async def main():
    from starknet_py.net.full_node_client import FullNodeClient
    from starknet_py.net.account.account import Account
    from starknet_py.net.models import StarknetChainId
    from starknet_py.net.signer.stark_curve_signer import KeyPair
    
    RPC_URL = "https://starknet-sepolia.public.blastapi.io"
    PRIVATE_KEY = 0x06b7b806707e2f17ab5436da2edbdab6aed518cf70798436fd0a90fa40ed1442
    ACCOUNT_ADDRESS = 0x018f34152a21b9B458e4511860bf594885c14003C453b7DE326c4053fcf2a7f1
    
    print("\n🚀 BitZen Deployment to Sepolia")
    print("="*50)
    
    client = FullNodeClient(node_url=RPC_URL)
    key_pair = KeyPair.from_private_key(PRIVATE_KEY)
    account = Account(
        client=client,
        address=ACCOUNT_ADDRESS,
        key_pair=key_pair,
        chain=StarknetChainId.SEPOLIA,
    )
    
    print(f"✓ Account: {hex(ACCOUNT_ADDRESS)}")
    
    # Load AgentAccount
    base_dir = Path(__file__).parent.parent / "contracts" / "target" / "dev"
    with open(base_dir / "contracts_AgentAccount.contract_class.json") as f:
        sierra = json.load(f)
    with open(base_dir / "contracts_AgentAccount.compiled_contract_class.json") as f:
        casm = json.load(f)
    
    print("\n📝 Declaring AgentAccount...")
    casm_hash = int(casm["class_hash"], 16)
    
    # Try declare
    try:
        declare_tx = await account.sign_declare_v2(
            compiled_contract=sierra,
            compiled_class_hash=casm_hash,
            max_fee=int(1e17),  # 0.1 ETH
        )
        await account.client.wait_for_tx(declare_tx.transaction_hash)
        print(f"✅ Declared! Class: {hex(declare_tx.class_hash)}")
        print(f"   Tx: {hex(declare_tx.transaction_hash)}")
    except Exception as e:
        print(f"❌ Error: {e}")
        if "class" in str(e).lower() and "hash" in str(e).lower():
            print("\n⚠️  CASM Hash Mismatch Detected!")
            print("This confirms the Cairo 2.13.1 incompatibility with Sepolia v0.7.1")

if __name__ == "__main__":
    asyncio.run(main())
