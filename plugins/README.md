# BitZen AI Agent Plugins

**Autonomous AI agents with Bitcoin liquidity and ZK privacy on Starknet**

## 🎯 Overview

BitZen plugins enable AI agents to:
- 💰 Execute Bitcoin ↔ Starknet atomic swaps (Garden SDK)
- 🔐 Generate & verify ZK proofs for privacy (Garaga)
- 🔑 Manage session keys for autonomous operations
- 🤖 Execute tasks with time-bounded permissions

## 📦 Architecture

```
plugins/
├── types.ts              # Core type definitions
├── PluginManager.ts      # Plugin lifecycle management
├── BitZenAgent.ts        # Main agent orchestrator
│
├── bitcoin/              # Garden SDK integration
│   ├── BitcoinPlugin.ts
│   └── actions/
│       └── schemas.ts
│
├── zkproof/              # Garaga ZK proofs
│   └── ZKProofPlugin.ts
│
└── account/              # Session keys
    └── AccountPlugin.ts
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /home/ujwal/Desktop/coding/BitZen/plugins
npm install starknet dotenv node-fetch
```

### 2. Configure Environment

```bash
# Add to .env
ACCOUNT_ADDRESS=0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e
STARKNET_PRIVATE_KEY=0x2b8f583c70a829a3a3f2fd12005eb3a7ea28a9c9a24c85e657022e4ee66f18
STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/K_hKu4IgnPgrF8O82GLuYU
BACKEND_URL=http://localhost:3001
```

### 3. Run Agent

```typescript
import { BitZenAgent } from './BitZenAgent';
import { AgentContext } from './types';

const context: AgentContext = {
  agentAddress: process.env.ACCOUNT_ADDRESS!,
  network: 'sepolia',
  rpcUrl: process.env.STARKNET_RPC_URL!,
  backendUrl: process.env.BACKEND_URL!
};

const agent = new BitZenAgent('./config/agents/bitzen.agent.json', context);
await agent.initialize();

// Execute commands
const result = await agent.executeCommand('swap', {
  fromCurrency: 'BTC',
  toCurrency: 'STRK',
  amount: '10000000',
  destinationAddress: '0x...'
});

console.log(result);
```

## 🔌 Plugin API

### Bitcoin Plugin

**Actions:**
- `getSwapQuote` - Get BTC ↔ STRK exchange rate
- `executeSwap` - Execute atomic swap via Garden SDK
- `getSwapStatus` - Check swap transaction status
- `getBTCBalance` - Query Bitcoin balance

**Example:**
```typescript
// Get swap quote
const quote = await agent.executeCommand('getQuote', {
  fromCurrency: 'BTC',
  toCurrency: 'STRK',
  amount: '10000000' // 0.1 BTC in satoshis
});

console.log(quote.data);
// {
//   inputAmount: '10000000',
//   outputAmount: '500000000000000000', // ~500 STRK
//   exchangeRate: 50000,
//   fee: '1000',
//   slippage: 0.02,
//   estimatedTime: 600
// }

// Execute swap
const swap = await agent.executeCommand('swap', {
  fromCurrency: 'BTC',
  toCurrency: 'STRK',
  amount: '10000000',
  destinationAddress: '0x0447ae02...'
});

console.log(swap.data.swapId); // Track swap
```

### ZKProof Plugin

**Actions:**
- `generateProof` - Create ZK proof for agent identity
- `verifyProof` - Verify proof using Garaga
- `getProofStatus` - Check if proof is valid
- `registerAgent` - Register in ZKPassport contract

**Example:**
```typescript
// Generate ZK proof
const proof = await agent.executeCommand('verifyProof', {
  agentAddress: '0x0447ae02...',
  message: 'Agent registration'
});

console.log(proof.data);
// {
//   proof: '0x1a2b3c...',
//   publicInputs: ['0x0447ae02...', '1675432100'],
//   verifierType: 's2',
//   timestamp: 1675432100,
//   expiresAt: 1675518500
// }

// Register agent with proof
const registration = await agent.executeCommand('register', {
  agentAddress: '0x0447ae02...',
  zkProof: proof.data.proof
});

console.log(registration.txHash);
```

### Account Plugin

**Actions:**
- `createSessionKey` - Generate time-bounded session key
- `revokeSessionKey` - Revoke active session
- `getSessionInfo` - Query session details
- `listActiveSessions` - List all active sessions
- `executeTask` - Run task with session key
- `setSpendingLimit` - Update spending limits

**Example:**
```typescript
// Create session key (24 hours)
const session = await agent.executeCommand('createSession', {
  duration: 86400,
  permissions: {
    canExecuteTasks: true,
    canMakeSwaps: true,
    canStake: false,
    maxDailySpend: '1000000000000000000', // 1 STRK
    maxTransactionAmount: '100000000000000000' // 0.1 STRK
  }
});

console.log(session.data);
// {
//   sessionPublicKey: '0x7f8e9d...',
//   agentAddress: '0x0447ae02...',
//   expiresAt: 1675518500,
//   permissions: { ... }
// }

// Execute task with session
const task = await pluginManager.executeAction('account', 'executeTask', {
  taskType: 'swap',
  taskData: { amount: '0.01 BTC' },
  sessionKey: session.data.sessionPublicKey
});
```

## 🎮 Interactive Agent

```typescript
import { runAgent } from './BitZenAgent';

// Start interactive session
await runAgent();

// Chat with agent:
// > What is my Bitcoin balance?
// Bitcoin Balance:
// Address: tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx
// Balance: 0.15000000 BTC
// Network: testnet

// > Get quote for 0.1 BTC to STRK
// Swap Quote:
// Input: 10000000 satoshis
// Output: 500000000000000000 wei
// Rate: 50000 STRK/BTC
// Fee: 0.0001 BTC
//
// Would you like to execute this swap?

// > Create a session key
// Session Key Created:
// Public Key: 0x7f8e9d1a2b3c4d5e...
// Expires: 2026-02-07T00:38:28.778Z
// Permissions: Full access
```

## 📋 Configuration

Edit `/config/agents/bitzen.agent.json`:

```json
{
  "name": "BitZen Agent",
  "description": "Sovereign AI agent with Bitcoin liquidity",
  "model": "gpt-4",
  "temperature": 0.7,
  "plugins": [
    {
      "name": "bitcoin",
      "enabled": true,
      "config": {
        "network": "testnet",
        "defaultSwapAmount": "0.001",
        "slippageTolerance": 0.02,
        "gardenApiUrl": "https://testnet.api.garden.finance",
        "gardenApiKey": "your-api-key"
      }
    },
    {
      "name": "zkproof",
      "enabled": true,
      "config": {
        "verifierType": "s2",
        "proofExpiration": 86400
      }
    },
    {
      "name": "account",
      "enabled": true,
      "config": {
        "sessionKeyExpiration": 100000,
        "maxDailySpend": "1000000000000000000"
      }
    }
  ],
  "autonomousMode": false,
  "chatMode": true
}
```

## 🧪 Testing

```bash
# Install test dependencies
npm install --save-dev jest @types/jest ts-jest

# Run tests
npm test

# Test individual plugin
npm test -- bitcoin.test.ts
```

## 🔐 Security

**Session Key Best Practices:**
1. Always set expiration times
2. Limit permissions per session
3. Set reasonable spending limits
4. Revoke unused sessions
5. Monitor session activity

**Bitcoin Integration:**
1. Use testnet for development
2. Verify swap quotes before executing
3. Set slippage tolerance
4. Monitor swap status
5. Keep API keys secure

**ZK Proofs:**
1. Verify proof expiration
2. Store proofs securely
3. Use latest Garaga version
4. Test proof generation
5. Monitor verification costs

## 🚨 Error Handling

```typescript
try {
  const result = await agent.executeCommand('swap', params);
  
  if (!result.success) {
    console.error('Command failed:', result.error);
    // Handle error
  }
  
  // Success
  console.log('Transaction:', result.txHash);
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## 📊 Monitoring

```typescript
// Health check all plugins
const health = await agent.pluginManager.healthCheckAll();
console.log(health);
// {
//   bitcoin: true,
//   zkproof: true,
//   account: true
// }

// List active sessions
const sessions = await agent.executeCommand('listActiveSessions', {});
console.log(`Active sessions: ${sessions.data.total}`);
```

## 🎯 Hackathon Integration

**Bitcoin Track:**
```typescript
// Demo BTC → STRK swap
const demo = async () => {
  // 1. Get quote
  const quote = await agent.executeCommand('getQuote', {
    fromCurrency: 'BTC',
    toCurrency: 'STRK',
    amount: '1000000' // 0.01 BTC
  });
  
  // 2. Execute swap
  const swap = await agent.executeCommand('swap', {
    fromCurrency: 'BTC',
    toCurrency: 'STRK',
    amount: '1000000',
    destinationAddress: context.agentAddress
  });
  
  // 3. Monitor status
  const status = await agent.executeCommand('getSwapStatus', {
    swapId: swap.data.swapId
  });
  
  console.log('Swap complete:', status.data);
};
```

**Privacy Track:**
```typescript
// Demo ZK-verified agent registration
const demo = async () => {
  // 1. Generate proof
  const proof = await agent.executeCommand('generateProof', {
    agentAddress: context.agentAddress
  });
  
  // 2. Register agent
  const registration = await agent.executeCommand('register', {
    agentAddress: context.agentAddress,
    zkProof: proof.data.proof
  });
  
  console.log('Agent registered:', registration.txHash);
};
```

## 📚 Resources

- **Garden Finance:** https://garden.finance/docs
- **Garaga ZK:** https://github.com/keep-starknet-strange/garaga
- **Starknet.js:** https://www.starknetjs.com/
- **Backend API:** http://localhost:3001/api/v1/docs

## 🤝 Contributing

See `CONTRIBUTING.md` for development guidelines.

## 📄 License

MIT License - see LICENSE file for details.

---

**Built for RE{DEFINE} Hackathon 2026** 🚀
