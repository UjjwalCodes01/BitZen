# BitZen Smart Contracts

Three Cairo contracts implementing the BitZen Sovereign Agent Stack:

## Contracts

### 1. AgentAccount.cairo
**Policy-based smart account with session keys for AI agents**

**Features:**
- ✅ Session key management with expiration blocks
- ✅ ECDSA signature verification for session execution
- ✅ Spending policies (daily limit, per-tx limit)
- ✅ Method whitelisting per session
- ✅ Automatic daily spending reset

**Security Improvements:**
- Proper ECDSA signature verification using `check_ecdsa_signature`
- Explicit `amount` parameter instead of extracting from calldata
- Message hash computation for signature verification
- Two execution modes: `execute()` for owner, `execute_with_session()` for session keys

**Usage:**
```cairo
// Create session key (owner only)
agent_account.create_session(
    session_public_key: 0x123...,
    expiration_block: current_block + 100000,
    max_spend_per_tx: 100 * 10^18, // 100 STRK
    allowed_methods: array![selector!("transfer"), selector!("swap")]
);

// Execute with session signature
agent_account.execute_with_session(
    to: contract_address,
    selector: selector!("transfer"),
    calldata: array![recipient, amount_low, amount_high],
    amount: 50 * 10^18,
    session_signature: (r, s)
);
```

---

### 2. ZKPassport.cairo
**Agent identity verification using Garaga ZK proofs**

**Features:**
- ✅ Register agents with Groth16 ZK proofs
- ✅ Proof replay protection
- ✅ Garaga verifier integration via library call
- ✅ Admin-controlled revocation

**Garaga Integration:**
- Uses `verify_groth16_proof_bn254` via library call
- Verifier class hash: `0x59d24936725776758dc34d74b254d15f74b26683018470b6357d23dcab6b4bd`
- Prevents proof reuse with commitment tracking

**Usage:**
```cairo
// Register agent with ZK proof
zkpassport.register_agent(
    agent_address: 0xAGENT...,
    proof_data: full_proof_with_hints,
    public_inputs: array![commitment]
);

// Verify agent is registered
let is_verified = zkpassport.verify_agent(agent_address);
```

---

### 3. ServiceRegistry.cairo
**Auditor hub with staking mechanism for agent discovery**

**Features:**
- ✅ Service registration with STRK staking
- ✅ Auditor staking for reputation building
- ✅ Service discovery by category and stake amount
- ✅ Review system with ratings
- ✅ Slashing mechanism for misbehavior

**STRK Token Configuration:**
- **Sepolia**: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`
- **Mainnet**: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`
- Minimum stake: 10 STRK (configurable at deployment)

**Usage:**
```cairo
// Register service (requires STRK approval first)
service_registry.register_service(
    service_name: 'BitcoinSwap',
    service_description: 'BTC swap service',
    service_endpoint: 'https://api.bitzen.xyz/swap',
    stake_amount: 100 * 10^18 // 100 STRK
);

// Auditors stake to vouch for service
service_registry.stake_as_auditor(
    service_id: service_id,
    stake_amount: 50 * 10^18
);
```

---

## Deployment

### Prerequisites
```bash
# Build contracts
scarb build

# Verify Garaga dependency
scarb metadata | grep garaga
```

### Deploy Order
1. **Declare contracts** (get class hashes)
2. **Deploy AgentAccount** → Pass owner address
3. **Deploy ZKPassport** → Pass admin + Garaga verifier class hash
4. **Deploy ServiceRegistry** → Pass admin + STRK token + min stake

### Using sncast
```bash
# Configure profile in snfoundry.toml
sncast --profile sepolia declare --contract-name AgentAccount

# Deploy with constructor args
sncast --profile sepolia deploy \
  --class-hash <CLASS_HASH> \
  --constructor-calldata <OWNER_ADDRESS>
```

### Deployment Script
```bash
cd packages/snfoundry
bun run scripts-ts/deploy-contracts.ts
```

---

## Testing

Run contract tests:
```bash
cd packages/snfoundry/contracts
scarb test
```

---

## Security Considerations

### AgentAccount
- **Session key rotation**: Revoke old sessions before creating new ones
- **Spending limits**: Set conservative daily/tx limits
- **Method whitelisting**: Only allow necessary functions per session

### ZKPassport
- **Proof uniqueness**: Each proof can only be used once
- **Verifier trust**: Uses Garaga's audited verifier contract
- **Admin control**: Only admin can revoke agents

### ServiceRegistry
- **Stake slashing**: Admin can slash misbehaving services
- **Token approval**: Users must approve STRK spending before registration
- **Auditor alignment**: Auditors lose stake if service is slashed

---

## RE{DEFINE} Hackathon Notes

**For the hackathon judges:**

1. **Bitcoin Track**: AgentAccount + ServiceRegistry enable discovery of Bitcoin swap services (Garden SDK integration in Phase 3)

2. **Privacy Track**: ZKPassport uses Garaga for ZK-verified agent identity without revealing credentials

3. **Innovation**: Session keys solve the "agent autonomy" problem—agents can transact within policy constraints without constant owner approval

4. **Production Ready**: 
   - ECDSA signature verification (not just address checks)
   - Proper spending policy enforcement
   - Garaga integration for ZK proofs
   - STRK token staking for reputation

---

## Next Steps (Phase 3)

1. Build SNAK plugins that interact with these contracts
2. Integrate Garden SDK for Bitcoin swaps via ServiceRegistry
3. Generate ZK proofs for ZKPassport registration
4. Build Next.js dashboard for agent management

---

## Resources

- [Garaga Documentation](https://garaga.gitbook.io/)
- [Starknet Book](https://book.starknet.io/)
- [OpenZeppelin Cairo Contracts](https://docs.openzeppelin.com/contracts-cairo/)
- [Session Keys (Ready Wallet)](https://docs.argent.xyz/starknet/session-keys)
