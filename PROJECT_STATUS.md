# BitZen Project Structure

## Project initialized with Scaffold-Stark 2 ✅

```
BitZen/
├── packages/
│   ├── snfoundry/          # Cairo contracts + deployment scripts
│   │   ├── contracts/      # AgentAccount, ZKPassport, ServiceRegistry
│   │   ├── scripts-ts/     # Deployment automation
│   │   └── .env            # RPC URLs, private keys, API keys
│   └── nextjs/             # Web3 frontend (Next.js 14)
│       ├── app/            # App router pages
│       └── components/     # Web3 UI components
├── plugins/                # SNAK plugins for agent functionality
│   ├── bitcoin/            # Garden SDK integration (BTC↔STRK swaps)
│   ├── zkproof/            # Garaga ZK proof verification
│   └── account/            # Session key management
├── config/agents/          # Agent configuration files
│   └── bitzen.agent.json   # Main agent config
└── .env                    # Root environment variables
```

## Next Steps

**Phase 2: Smart Contracts (Days 2-5)**
1. Create AgentAccount.cairo with session key support
2. Implement ZKPassport.cairo with Garaga integration
3. Build ServiceRegistry.cairo with staking mechanism

**Phase 3: Agent Brain (Days 6-10)**
1. Develop SNAK plugins (bitcoin, zkproof, account)
2. Integrate Garden SDK for Bitcoin atomic swaps
3. Implement natural language command parsing

**Phase 4: Frontend + Bitcoin (Days 11-14)**
1. Build Next.js dashboard with Web3 components
2. Test Bitcoin testnet swaps
3. Deploy to Starknet Sepolia

## Required Configuration

Fill in your `.env` file:
- `PRIVATE_KEY_SEPOLIA`: Your Starknet wallet private key
- `ACCOUNT_ADDRESS_SEPOLIA`: Your Starknet account address
- `OPENAI_API_KEY`: For SNAK agent natural language processing

## Development Commands

```bash
# Start local Starknet devnet
yarn chain

# Deploy contracts to Sepolia
yarn deploy

# Start Next.js frontend
yarn start
```

## RE{DEFINE} Hackathon Submission (Feb 28, 2026)

BitZen will be submitted to:
- Bitcoin track: Garden SDK integration for BTC liquidity
- Privacy track: ZK-verified agent identity with Garaga

Prize pool: $21,500+
