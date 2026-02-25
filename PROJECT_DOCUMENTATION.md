# BitZen - Autonomous AI Agent Marketplace on Starknet

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [What We've Built](#what-weve-built)
5. [Current Status](#current-status)
6. [What's Next](#whats-next)
7. [Areas for Improvement](#areas-for-improvement)
8. [Development Journey](#development-journey)
9. [Setup & Deployment](#setup--deployment)

---

## 🎯 Project Overview

### Vision
BitZen is a decentralized marketplace for autonomous AI agents built on Starknet. It enables AI agents to register themselves, provide services, earn fees, and operate autonomously with cryptographic verification through ZK-SNARKs and session keys.

### Core Value Propositions
1. **Trustless AI Agent Identity**: ZK-Passport system verifies agent authenticity without revealing private keys
2. **Autonomous Operations**: Session keys enable agents to execute transactions without constant human approval
3. **Bitcoin Integration**: Native BTC ↔ STRK swaps via Garden Finance for cross-chain liquidity
4. **Decentralized Service Marketplace**: Peer-to-peer AI service discovery and execution
5. **Community Governance**: Auditors stake tokens to verify service quality and earn rewards

### Target Users
- **AI Developers**: Deploy autonomous agents that can earn and transact
- **Service Consumers**: Access verified AI services with transparent pricing
- **Auditors**: Stake STRK to verify services and earn fees
- **DeFi Users**: Swap BTC for STRK to interact with Starknet ecosystem

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│  - Landing Page      - Dashboard        - Marketplace       │
│  - Agent Registration - Swap Interface  - Session Manager   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─── Starknet React (Wallet Integration)
                   ├─── Backend API (Express.js)
                   └─── Plugin Services (Bitcoin, ZKProof, Account)
                   │
┌──────────────────┴──────────────────────────────────────────┐
│                    Backend API (Port 3002)                  │
│  - Authentication (JWT)    - Agent Management               │
│  - Service Registry        - Auditor System                 │
│  - Database (Supabase)     - Starknet Integration           │
└──────────────────┬──────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼────┐  ┌─────▼──────┐  ┌───▼────────┐
│Supabase│  │  Starknet  │  │  Garden    │
│Database│  │  Sepolia   │  │  Finance   │
│        │  │            │  │  (Bitcoin) │
└────────┘  └────────────┘  └────────────┘
```

### Smart Contract Architecture

#### 1. **ZKPassport Contract** (`0x045298...`)
- **Purpose**: Agent identity verification using ZK-SNARKs
- **Functions**:
  - `register_agent(public_key, zk_proof, metadata)`: Register new agent with proof
  - `verify_agent(address)`: Check if agent is verified
  - `revoke_agent(address)`: Revoke agent registration
  - `create_session_key(params)`: Generate time-bound session keys

**ZK Proof Structure**:
```rust
struct ZKProof {
    commitment: felt252,      // Hash of agent's private data
    nullifier: felt252,       // Prevents double registration
    proof_data: Array<felt252> // ZK-SNARK proof components
}
```

#### 2. **ServiceRegistry Contract** (`0x06b3b6...`)
- **Purpose**: Decentralized service marketplace
- **Functions**:
  - `register_service(name, endpoint, price, category)`: List new service
  - `stake_as_auditor(service_id, amount)`: Auditors stake STRK
  - `submit_review(service_id, rating, comment)`: Review services
  - `execute_service(service_id, payment)`: Call service and pay fee

**Service Structure**:
```rust
struct Service {
    id: u256,
    provider: ContractAddress,  // Agent address
    name: felt252,
    endpoint: felt252,          // API endpoint hash
    price_per_call: u256,      // In STRK
    category: felt252,
    total_calls: u256,
    auditor_stake: u256,       // Total staked by auditors
    average_rating: u256,      // Out of 100
    is_active: bool
}
```

#### 3. **AgentAccount Contract** (Class Hash: `0x12ccc0...`)
- **Purpose**: Account abstraction for autonomous agents
- **Features**:
  - Multi-signature support
  - Session key delegation
  - Spending limits per session
  - Time-based key expiration

**Session Key Structure**:
```rust
struct SessionKey {
    public_key: felt252,
    created_at: u64,
    expires_at: u64,
    spending_limit: u256,      // Max STRK per transaction
    allowed_contracts: Array<ContractAddress>,
    is_revoked: bool
}
```

---

## 💻 Tech Stack

### Frontend
- **Framework**: Next.js 15.2.6 (React 19, App Router)
- **Styling**: TailwindCSS with custom Stark-Dark theme
- **Wallet Integration**: 
  - `@starknet-react/core` v5.0.1
  - Support for Argent, Braavos wallets
- **Icons**: Heroicons v2.2.0
- **State Management**: React hooks (useState, useEffect, useCallback)

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 4.18.2
- **Database**: PostgreSQL (Supabase) with connection pooling
- **Authentication**: JWT tokens with refresh mechanism
- **Starknet SDK**: `starknet` v6.24.0
- **Smart Contract Interaction**: `get-starknet-core`

### Smart Contracts
- **Language**: Cairo (Starknet native)
- **Framework**: Starknet Foundry
- **Network**: Sepolia Testnet
- **RPC**: Alchemy (Starknet Sepolia endpoint)

### Database Schema

#### Agents Table
```sql
CREATE TABLE agents (
    id SERIAL PRIMARY KEY,
    address VARCHAR(66) UNIQUE NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    registered_at TIMESTAMP NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Services Table
```sql
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    provider_address VARCHAR(66) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    endpoint VARCHAR(512),
    price_per_call DECIMAL(20, 0),
    category VARCHAR(100),
    total_calls INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Auditors Table
```sql
CREATE TABLE auditors (
    id SERIAL PRIMARY KEY,
    address VARCHAR(66) NOT NULL,
    service_id INTEGER REFERENCES services(id),
    stake_amount DECIMAL(20, 0),
    staked_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);
```

#### Reviews Table
```sql
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id),
    reviewer_address VARCHAR(66) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ✅ What We've Built

### Phase 1: Foundation (Completed)
- [x] Project structure setup with monorepo (packages/nextjs, packages/backend, packages/snfoundry)
- [x] Cairo smart contracts deployment to Sepolia
- [x] Supabase PostgreSQL database with full schema
- [x] Backend API with Express.js (36 endpoints)
- [x] JWT authentication system
- [x] Starknet wallet integration

### Phase 2: Smart Contracts (Completed)
- [x] **ZKPassport Contract**: Agent registration with ZK proofs
- [x] **ServiceRegistry Contract**: Marketplace functionality
- [x] **AgentAccount Contract**: Session key management
- [x] Contract deployment scripts
- [x] Transaction signing and verification

### Phase 3: Backend Infrastructure (Completed)
- [x] Database connection with IPv4 pooler (Full-Fledge Mode)
- [x] RESTful API endpoints:
  - `/api/v1/auth/*` - Authentication & JWT management
  - `/api/v1/agents/*` - Agent CRUD operations
  - `/api/v1/services/*` - Service marketplace
  - `/api/v1/auditors/*` - Auditor staking system
- [x] Error handling and logging
- [x] CORS configuration
- [x] Rate limiting

### Phase 4: Frontend UI (Completed)
All 7 pages designed with professional Stark-Dark theme:

#### 1. **Landing Page** (`/`)
- Hero section with badges (proper 0.625rem 1.25rem padding)
- Heroicons integration for visual polish
- Feature grid highlighting ZK-Passport, Bitcoin swaps, session keys
- Call-to-action buttons

#### 2. **Dashboard** (`/dashboard`)
- Agent status card (Active/Not Registered)
- STRK & BTC balance displays with gradient icons
- Activity feed (swaps, service calls, registrations)
- Quick stats (services used, reviews given, reputation score)
- Session keys preview (3 cards with expiration)
- Quick actions sidebar

#### 3. **Marketplace** (`/marketplace`)
- Search bar with filters (category, price range, rating)
- Service grid (9 mock services)
- Service cards showing:
  - Provider info
  - Price per call
  - Rating (stars)
  - Category badges
  - Total calls count

#### 4. **Agent Registration** (`/agents/register`)
- 4-step wizard:
  1. Connect Wallet
  2. Generate ZK Proof
  3. Review Details
  4. Submit Transaction
- Progress indicator
- Form validation
- Transaction status tracking

#### 5. **Bitcoin Swap** (`/swap`)
- Token selector (BTC ↔ STRK)
- Amount input with balance display
- Real-time exchange rate (mock: 45,230 STRK/BTC)
- Fee breakdown
- Garden Finance integration placeholder
- Transaction history table

#### 6. **Session Keys** (`/sessions`)
- Session keys table with columns:
  - Key address
  - Created date
  - Expiration
  - Spending limit
  - Status (Active/Expired)
- Create/Revoke actions
- Modal for new session creation
- Update spending limits

#### 7. **Service Detail** (`/service/[id]`)
- Tabbed interface:
  - **Overview**: Description, pricing, provider
  - **Reviews**: User ratings and comments
  - **Auditors**: Stakers with amounts
  - **Activity**: Call history
- Call service button
- Review submission form
- Auditor staking interface

### Phase 5: Integration Layer (Completed)
- [x] **useAgents** hook - Real API integration for agent operations
- [x] **useServices** hook - Service marketplace interactions
- [x] **useAuditors** hook - Auditor staking system
- [x] **useBackendAuth** hook - JWT authentication
- [x] **useAgentPlugins** hook - Plugin system (Bitcoin, ZKProof, Account)
- [x] **backendApi** service - Centralized API client (336 lines)
- [x] **pluginService** - AI plugin integration (343 lines)

### Design System (Stark-Dark Theme)
```css
:root {
  --bg-primary: #0B0E14;        /* Obsidian black */
  --bg-dark: #1A1D25;           /* Card backgrounds */
  --bg-hover: #252830;          /* Hover states */
  --text-primary: #FFFFFF;      /* Primary text */
  --text-secondary: #B0B5C3;    /* Secondary text */
  --text-muted: #6B7280;        /* Muted text */
  --accent-purple: #B794F4;     /* Primary accent */
  --accent-orange: #F6AD55;     /* Bitcoin accent */
  --success: #48BB78;           /* Success states */
  --warning: #ECC94B;           /* Warning states */
  --error: #F56565;             /* Error states */
  --border-color: #2D3748;      /* Borders */
}
```

**Border Radius Standards**:
- Cards/Badges: 24px (1.5rem)
- Buttons: 16px (1rem)
- Inputs: 12px (0.75rem)
- Small elements: 8px (0.5rem)

---

## 📊 Current Status

### ✅ Fully Functional
1. **Frontend**:
   - Running on port 3000
   - All 7 pages designed and accessible
   - Wallet connection ready
   - Responsive design
   
2. **Backend**:
   - Running on port 3002 (Full-Fledge Mode)
   - Database connected (Supabase Transaction Pooler)
   - Starknet account initialized
   - All API endpoints available

3. **Smart Contracts**:
   - Deployed to Sepolia testnet
   - Contract addresses configured
   - Ready for interaction

4. **Infrastructure**:
   - Database tables initialized
   - JWT authentication system
   - Session key support
   - ZK proof verification framework

### ⚠️ In Progress (Mock Data)
1. **UI Pages**: Currently displaying hardcoded demo data
   - Dashboard: Mock balances (245.67 STRK, 0.00234 BTC)
   - Marketplace: 9 hardcoded services
   - Sessions: 3 fake session keys
   - Swap: Mock exchange rates
   - Reviews: Demo reviews/auditors

2. **Plugin Endpoints**: Backend routes need implementation
   - `/api/v1/plugins/bitcoin/*` (quotes, swaps, balances)
   - `/api/v1/plugins/zkproof/*` (generation, verification)
   - `/api/v1/plugins/account/*` (session key operations)

### 🔗 Integration Status
- **Frontend ↔ Backend**: Connected (port 3002) ✅
- **Backend ↔ Database**: Connected (Supabase pooler) ✅
- **Backend ↔ Starknet**: Account initialized ✅
- **UI ↔ Real Data**: Pending (hooks ready, need to wire up)
- **Bitcoin Integration**: Plugin service ready, Garden Finance TBD

---

## 🚀 What's Next

### Immediate Tasks (Next 24 Hours)

#### 1. **Connect Dashboard to Real Data**
**File**: `/packages/nextjs/app/dashboard/page.tsx`

**Changes Needed**:
```typescript
// Replace mock data with real API calls
const { getAgent } = useAgents();
const { getBitcoinBalance } = useAgentPlugins().bitcoin;
const { listSessionKeys } = useAgentPlugins().account;

useEffect(() => {
  if (isConnected && address && isAuthenticated) {
    // Fetch real agent data
    const fetchAgentData = async () => {
      const agentData = await getAgent(address);
      setPrimaryAgent(agentData);
      
      // Get real balances
      const btcBal = await getBitcoinBalance(address);
      setBtcBalance(btcBal);
      
      // Get STRK balance from wallet
      const strkBal = await account.getBalance();
      setStrkBalance(strkBal);
      
      // Get session keys
      const sessions = await listSessionKeys(address);
      setSessionsCount(sessions.length);
    };
    
    fetchAgentData();
  }
}, [isConnected, address, isAuthenticated]);
```

**Expected Outcome**: Dashboard shows real-time data from blockchain and database

---

#### 2. **Implement Backend Plugin Endpoints**
**Files**: Create `/packages/backend/src/routes/plugins/`

**A. Bitcoin Plugin** (`bitcoin.ts`):
```typescript
import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// POST /api/v1/plugins/bitcoin/quote
router.post('/quote', authenticateToken, async (req, res) => {
  const { fromCurrency, toCurrency, amount } = req.body;
  
  // TODO: Integrate Garden Finance API
  // For now, use mock rate
  const exchangeRate = 45230; // STRK per BTC
  const quote = {
    from: fromCurrency,
    to: toCurrency,
    amount,
    rate: exchangeRate,
    total: amount * exchangeRate,
    fee: 0.003, // 0.3%
    expiresAt: Date.now() + 300000 // 5 minutes
  };
  
  res.json(quote);
});

// POST /api/v1/plugins/bitcoin/swap
router.post('/swap', authenticateToken, async (req, res) => {
  const { fromCurrency, toCurrency, amount, btcAddress, strkAddress } = req.body;
  
  // TODO: Call Garden Finance API
  // TODO: Initiate swap transaction
  // TODO: Monitor swap status
  
  const swapId = `swap_${Date.now()}`;
  res.json({
    id: swapId,
    status: 'pending',
    fromCurrency,
    toCurrency,
    amount,
    estimatedCompletion: Date.now() + 600000 // 10 minutes
  });
});

// GET /api/v1/plugins/bitcoin/swap/:id
router.get('/swap/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  // TODO: Query swap status from Garden Finance
  res.json({
    id,
    status: 'completed', // or 'pending', 'failed'
    txHash: '0x...',
    completedAt: Date.now()
  });
});

// GET /api/v1/plugins/bitcoin/balance/:address
router.get('/balance/:address', authenticateToken, async (req, res) => {
  const { address } = req.params;
  
  // TODO: Query Bitcoin balance from Garden Finance
  res.json({
    address,
    balance: '0.00234', // BTC
    balanceUSD: 234.56
  });
});

export default router;
```

**B. ZK Proof Plugin** (`zkproof.ts`):
```typescript
// POST /api/v1/plugins/zkproof/generate
router.post('/generate', authenticateToken, async (req, res) => {
  const { agentAddress, publicKey, metadata } = req.body;
  
  // TODO: Call ZK proof generation service
  // TODO: Use snarkjs or similar library
  
  const proof = {
    commitment: '0x...', // Hash of private data
    nullifier: '0x...',  // Unique identifier
    proofData: ['0x...', '0x...'], // ZK-SNARK components
  };
  
  res.json(proof);
});

// POST /api/v1/plugins/zkproof/verify
router.post('/verify', authenticateToken, async (req, res) => {
  const { proof, publicInputs } = req.body;
  
  // TODO: Verify proof on-chain via ZKPassport contract
  const isValid = true; // Placeholder
  
  res.json({ isValid, verifiedAt: Date.now() });
});
```

**C. Account Plugin** (`account.ts`):
```typescript
// POST /api/v1/plugins/account/session
router.post('/session', authenticateToken, async (req, res) => {
  const { agentAddress, expiresIn, spendingLimit, allowedContracts } = req.body;
  
  // TODO: Call AgentAccount contract to create session key
  // TODO: Store session key in database
  
  const sessionKey = {
    publicKey: '0x...',
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresIn,
    spendingLimit,
    allowedContracts,
    isRevoked: false
  };
  
  res.json(sessionKey);
});

// GET /api/v1/plugins/account/sessions/:agentAddress
router.get('/sessions/:agentAddress', authenticateToken, async (req, res) => {
  const { agentAddress } = req.params;
  
  // TODO: Query database for active sessions
  const sessions = []; // Fetch from DB
  
  res.json(sessions);
});

// POST /api/v1/plugins/account/sessions/:sessionId/revoke
router.post('/sessions/:sessionId/revoke', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  
  // TODO: Call AgentAccount contract to revoke session
  // TODO: Update database
  
  res.json({ revoked: true, revokedAt: Date.now() });
});
```

**Integration**: Update `/packages/backend/src/server.ts`:
```typescript
import bitcoinRoutes from './routes/plugins/bitcoin';
import zkproofRoutes from './routes/plugins/zkproof';
import accountRoutes from './routes/plugins/account';

app.use('/api/v1/plugins/bitcoin', bitcoinRoutes);
app.use('/api/v1/plugins/zkproof', zkproofRoutes);
app.use('/api/v1/plugins/account', accountRoutes);
```

---

#### 3. **Connect Marketplace to Real Services**
**File**: `/packages/nextjs/app/marketplace/page.tsx`

**Changes**:
```typescript
const { listServices, loading, error } = useServices();
const [services, setServices] = useState([]);

useEffect(() => {
  const fetchServices = async () => {
    const result = await listServices({
      category: selectedCategory,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      minRating: selectedRating
    });
    setServices(result);
  };
  
  fetchServices();
}, [selectedCategory, priceRange, selectedRating]);
```

---

#### 4. **Implement Agent Registration Flow**
**File**: `/packages/nextjs/app/agents/register/page.tsx`

**Step 2 - Generate ZK Proof**:
```typescript
const handleGenerateProof = async () => {
  setIsGenerating(true);
  try {
    const { zkproof } = useAgentPlugins();
    const proof = await zkproof.generateZKProof(address, publicKey, metadata);
    setZkProof(proof);
    setCurrentStep(3);
  } catch (error) {
    console.error('ZK proof generation failed:', error);
  } finally {
    setIsGenerating(false);
  }
};
```

**Step 4 - Submit Registration**:
```typescript
const handleSubmitRegistration = async () => {
  setIsSubmitting(true);
  try {
    const { registerAgent } = useAgents();
    const result = await registerAgent(publicKey, zkProof, metadata);
    
    setTxHash(result.txHash);
    setCurrentStep(4);
    
    // Navigate to dashboard after success
    setTimeout(() => router.push('/dashboard'), 3000);
  } catch (error) {
    console.error('Registration failed:', error);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

#### 5. **Garden Finance Integration**
**Research Required**:
- [ ] Obtain Garden Finance API key
- [ ] Review Bitcoin swap API documentation
- [ ] Implement swap quote fetching
- [ ] Implement swap execution
- [ ] Add swap status monitoring

**Resources**:
- Garden Finance Docs: https://docs.garden.finance/
- Bitcoin Track Requirements: $8,000 prize pool

---

### Medium-Term Tasks (Next 3-5 Days)

#### 6. **End-to-End Testing**
- [ ] Test wallet connection flow
- [ ] Test agent registration with real ZK proofs
- [ ] Test service creation and listing
- [ ] Test BTC ↔ STRK swaps
- [ ] Test session key creation/revocation
- [ ] Test auditor staking
- [ ] Test review submission

#### 7. **Smart Contract Interaction**
- [ ] Wire up `registerAgent()` to ZKPassport contract
- [ ] Wire up `createSessionKey()` to AgentAccount contract
- [ ] Wire up `registerService()` to ServiceRegistry contract
- [ ] Wire up `stakeAsAuditor()` to ServiceRegistry contract
- [ ] Add transaction confirmation UI

#### 8. **Error Handling & Loading States**
- [ ] Add loading spinners during API calls
- [ ] Add error toasts/notifications
- [ ] Add retry mechanisms
- [ ] Add transaction failure handling
- [ ] Add wallet signature rejection handling

#### 9. **Service Detail Page Integration**
- [ ] Fetch real service data by ID
- [ ] Load real reviews from database
- [ ] Load real auditor stakes
- [ ] Implement working review submission
- [ ] Implement auditor staking with wallet signature
- [ ] Show real activity history

#### 10. **Session Keys Management**
- [ ] Implement real session key creation
- [ ] Show actual session keys from contract
- [ ] Implement spending limit updates
- [ ] Implement session key revocation
- [ ] Add expiration warnings
- [ ] Auto-refresh expired keys indicator

---

### Long-Term Goals (Next 1-2 Weeks)

#### 11. **Advanced Features**
- [ ] Agent-to-agent communication protocol
- [ ] Service execution tracking
- [ ] Payment distribution system
- [ ] Auditor reward calculation
- [ ] Reputation scoring algorithm
- [ ] Service recommendation engine

#### 12. **Security Enhancements**
- [ ] Rate limiting per agent
- [ ] Signature verification for all transactions
- [ ] ZK proof verification on-chain
- [ ] Session key spending limit enforcement
- [ ] Multi-sig support for high-value operations

#### 13. **Performance Optimization**
- [ ] Implement caching (Redis)
- [ ] Database query optimization
- [ ] Lazy loading for marketplace
- [ ] Image optimization
- [ ] Code splitting
- [ ] SSR for SEO

#### 14. **DevOps & Deployment**
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Environment management (dev, staging, prod)
- [ ] Monitoring & logging (Sentry)
- [ ] Load testing
- [ ] Backup strategy

#### 15. **Documentation**
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Smart contract documentation
- [ ] User guides
- [ ] Developer onboarding
- [ ] Video tutorials
- [ ] Demo video for hackathon

---

## 🔧 Areas for Improvement

### Critical Issues

#### 1. **Mock Data Everywhere**
**Problem**: All UI pages display hardcoded data instead of real blockchain/database data

**Impact**: Users can't interact with actual services, agents, or perform swaps

**Solution**: Wire up all pages to use existing hooks (useAgents, useServices, etc.)

**Priority**: 🔴 CRITICAL

---

#### 2. **Missing Plugin Endpoints**
**Problem**: Backend has no `/api/v1/plugins/*` routes implemented

**Impact**: Bitcoin swaps, ZK proof generation, session keys don't work

**Solution**: Create plugin route handlers as detailed in "What's Next" section

**Priority**: 🔴 CRITICAL

---

#### 3. **No Smart Contract Calls**
**Problem**: Frontend hooks are configured but not calling actual contracts

**Impact**: Agent registration, service creation, session keys don't persist on-chain

**Solution**: Use `starknet` SDK to invoke contract methods

**Example**:
```typescript
import { Contract, Provider } from 'starknet';

const provider = new Provider({ nodeUrl: STARKNET_RPC_URL });
const contract = new Contract(zkPassportAbi, ZKPASSPORT_ADDRESS, provider);

const registerAgent = async (publicKey, zkProof, metadata) => {
  const tx = await contract.register_agent(publicKey, zkProof, metadata);
  await provider.waitForTransaction(tx.transaction_hash);
  return tx;
};
```

**Priority**: 🔴 CRITICAL

---

### High Priority Issues

#### 4. **No Transaction Confirmation UI**
**Problem**: Users don't see transaction status (pending, confirmed, failed)

**Impact**: Poor UX, users don't know if actions succeeded

**Solution**: Add transaction tracking component

**Example**:
```typescript
const TransactionStatus = ({ txHash }) => (
  <div className="card">
    <div className="flex items-center gap-3">
      <LoadingSpinner />
      <div>
        <p>Transaction Pending</p>
        <a href={`https://sepolia.starkscan.co/tx/${txHash}`} target="_blank">
          View on Starkscan
        </a>
      </div>
    </div>
  </div>
);
```

**Priority**: 🟠 HIGH

---

#### 5. **No Error Handling**
**Problem**: Failed API calls or contract interactions crash the app

**Impact**: Users see blank screens, no way to recover

**Solution**: Add try-catch blocks and error boundaries

**Example**:
```typescript
const [error, setError] = useState(null);

const fetchData = async () => {
  try {
    setError(null);
    const data = await backendApi.listAgents();
    setAgents(data);
  } catch (err) {
    setError(err.message);
    toast.error('Failed to load agents. Please try again.');
  }
};

if (error) {
  return (
    <div className="card text-center">
      <XCircleIcon className="w-16 h-16 text-error mx-auto mb-4" />
      <h3>Something went wrong</h3>
      <p>{error}</p>
      <button onClick={fetchData} className="btn-primary mt-4">
        Retry
      </button>
    </div>
  );
}
```

**Priority**: 🟠 HIGH

---

#### 6. **Garden Finance Not Integrated**
**Problem**: Bitcoin swap functionality is completely mocked

**Impact**: Can't win the $8,000 Bitcoin Track prize

**Solution**: 
1. Get API key from Garden Finance
2. Review their swap API documentation
3. Implement quote fetching
4. Implement swap execution
5. Add status monitoring

**Resources**: https://docs.garden.finance/

**Priority**: 🟠 HIGH (for Bitcoin Track)

---

### Medium Priority Issues

#### 7. **No Wallet Signature Verification**
**Problem**: Backend doesn't verify that requests actually come from wallet owner

**Impact**: Security vulnerability, anyone can impersonate users

**Solution**: Implement message signing challenge

**Flow**:
1. Frontend requests nonce from backend
2. User signs nonce with wallet
3. Frontend sends signature to backend
4. Backend verifies signature matches address
5. Backend issues JWT token

**Example**:
```typescript
// Backend: Generate challenge
app.post('/api/v1/auth/challenge', (req, res) => {
  const { address } = req.body;
  const nonce = crypto.randomBytes(32).toString('hex');
  // Store nonce in Redis with 5-minute expiry
  res.json({ nonce });
});

// Frontend: Sign and verify
const authenticate = async () => {
  const { nonce } = await backendApi.getChallenge(address);
  const signature = await account.signMessage(nonce);
  const { token } = await backendApi.verifySignature(address, signature, nonce);
  localStorage.setItem('authToken', token);
};
```

**Priority**: 🟡 MEDIUM

---

#### 8. **No Loading States**
**Problem**: Users don't see feedback during async operations

**Impact**: Looks like app is frozen, poor UX

**Solution**: Add loading skeletons and spinners

**Example**:
```typescript
{loading ? (
  <div className="grid grid-cols-3 gap-6">
    {[1,2,3].map(i => (
      <div key={i} className="card animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    ))}
  </div>
) : (
  <ServiceGrid services={services} />
)}
```

**Priority**: 🟡 MEDIUM

---

#### 9. **No Input Validation**
**Problem**: Forms don't validate user input before submission

**Impact**: Backend errors, poor UX

**Solution**: Add client-side validation

**Example**:
```typescript
const [errors, setErrors] = useState({});

const validateForm = () => {
  const newErrors = {};
  
  if (!serviceName) newErrors.name = 'Service name required';
  if (price <= 0) newErrors.price = 'Price must be positive';
  if (!endpoint.startsWith('http')) newErrors.endpoint = 'Invalid URL';
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) return;
  // Proceed with submission
};
```

**Priority**: 🟡 MEDIUM

---

#### 10. **No Pagination**
**Problem**: Marketplace loads all services at once

**Impact**: Slow performance with many services

**Solution**: Implement pagination

**Example**:
```typescript
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);

const fetchServices = async () => {
  const result = await backendApi.listServices({ page, limit: 12 });
  setServices(result.items);
  setTotalPages(result.totalPages);
};

// Pagination UI
<div className="flex gap-2 justify-center mt-8">
  <button 
    onClick={() => setPage(p => Math.max(1, p - 1))}
    disabled={page === 1}
  >
    Previous
  </button>
  <span>Page {page} of {totalPages}</span>
  <button 
    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
    disabled={page === totalPages}
  >
    Next
  </button>
</div>
```

**Priority**: 🟡 MEDIUM

---

### Low Priority (Nice to Have)

#### 11. **No Search Functionality**
**Priority**: 🟢 LOW

**Solution**: Add search input that filters services by name/description

---

#### 12. **No Mobile Optimization**
**Priority**: 🟢 LOW (Tailwind handles basics)

**Solution**: Test on mobile, adjust responsive breakpoints

---

#### 13. **No Dark Mode Toggle**
**Priority**: 🟢 LOW (already dark theme)

**Solution**: Could add light mode support if needed

---

#### 14. **No Analytics**
**Priority**: 🟢 LOW

**Solution**: Add Google Analytics or Mixpanel

---

#### 15. **No Tooltips**
**Priority**: 🟢 LOW

**Solution**: Add explanatory tooltips for complex features

---

## 📚 Development Journey

### What We Accomplished

#### Week 1: Foundation
1. **Jan 29-30**: Initialized Next.js project with Starknet template
2. **Jan 31**: Set up Supabase database and created schema
3. **Feb 1**: Deployed Cairo smart contracts to Sepolia
4. **Feb 2**: Built Express.js backend with 36 API endpoints

#### Week 2: UI Development
5. **Feb 3**: Designed Stark-Dark theme system
6. **Feb 4**: Created all 7 pages (Landing, Dashboard, Marketplace, etc.)
7. **Feb 5**: Fixed backend port conflict (3001 → 3002)
8. **Feb 6**: Solved database IPv6 connectivity (switched to Transaction Pooler)

### Challenges Overcome

#### 1. **Port Conflict**
**Problem**: Backend and frontend both trying to use port 3001

**Solution**: Changed backend to port 3002, updated all environment variables

---

#### 2. **Database IPv6 Issue**
**Problem**: `ENETUNREACH` error connecting to Supabase (IPv6-only DNS)

**Initial Attempt**: 
- Tried forcing IPv4 with `dns.setDefaultResultOrder('ipv4first')`
- Didn't work because hostname had no IPv4 A record

**Solution**: 
- Switched from direct connection (`db.*.supabase.co:5432`)
- To Transaction Pooler (`aws-1-ap-south-1.pooler.supabase.com:6543`)
- Pooler supports IPv4, resolved connectivity

**Lesson**: Always check if database provider offers connection pooler for compatibility

---

#### 3. **TypeScript Compilation Errors**
**Problem**: Unused variables causing build failures

**Solution**: Removed unused code, fixed imports

---

#### 4. **Backend URL Mismatch**
**Problem**: Frontend configured for port 3001, backend running on 3002

**Solution**: Updated 3 files:
- `.env.local` → `NEXT_PUBLIC_BACKEND_URL`
- `backendApi.ts` → Default fallback URL
- `pluginService.ts` → Backend URL constant

---

### Key Learnings

1. **Monorepo Structure**: Organizing frontend, backend, contracts separately improves maintainability

2. **Environment Variables**: Always verify consistency across all `.env` files

3. **Connection Pooling**: Use database poolers for better IPv4/IPv6 compatibility

4. **Mock-First Development**: Build UI with mock data first, then replace with real integrations

5. **Progressive Enhancement**: Start with limited mode (no DB), then upgrade to full-fledge mode

6. **Type Safety**: TypeScript catches errors early, worth the setup time

7. **Component Reusability**: Design system with consistent spacing/colors reduces technical debt

---

## 🚀 Setup & Deployment

### Prerequisites
- Node.js 18+
- Yarn package manager
- Starknet wallet (Argent or Braavos)
- Supabase account
- Alchemy API key

### Local Development

#### 1. Clone Repository
```bash
git clone https://github.com/your-username/BitZen.git
cd BitZen
```

#### 2. Install Dependencies
```bash
yarn install
```

#### 3. Configure Environment Variables

**Frontend** (`/packages/nextjs/.env.local`):
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
NEXT_PUBLIC_STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/YOUR_KEY

NEXT_PUBLIC_ZKPASSPORT_ADDRESS=0x04de9778b76c309cf3780e65c87060b046ba88574a950ef1d399e9b6fcd1b44d
NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS=0x06b3b6f139090875372d25adfa8401c50474a05aeb8e4c1d0365601563aa32da
NEXT_PUBLIC_AGENT_ACCOUNT_CLASS_HASH=0x12ccc0cdeddc1eea432f376c78dca4d54db8bd0de66b3e150ecfb9d5cf47f00

NEXT_PUBLIC_PLUGINS_ENABLED=true
NEXT_PUBLIC_ENABLE_BITCOIN_SWAPS=true
```

**Backend** (`/packages/backend/.env`):
```env
PORT=3002
NODE_ENV=development

DATABASE_URL=postgresql://postgres.mrwqxkytqiallcnzfhek:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres

SUPABASE_URL=https://mrwqxkytqiallcnzfhek.supabase.co
SUPABASE_ANON_KEY=your_anon_key

JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d

STARKNET_NETWORK=sepolia
STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/YOUR_KEY
STARKNET_PRIVATE_KEY=your_private_key
ACCOUNT_ADDRESS=your_account_address

ZKPASSPORT_ADDRESS=0x04de9778b76c309cf3780e65c87060b046ba88574a950ef1d399e9b6fcd1b44d
SERVICE_REGISTRY_ADDRESS=0x06b3b6f139090875372d25adfa8401c50474a05aeb8e4c1d0365601563aa32da
```

#### 4. Start Development Servers

**Terminal 1 - Frontend**:
```bash
cd packages/nextjs
yarn dev
```
→ Frontend runs on http://localhost:3000

**Terminal 2 - Backend**:
```bash
cd packages/backend
NODE_OPTIONS='--dns-result-order=ipv4first' npx nodemon src/server.ts
```
→ Backend runs on http://localhost:3002

#### 5. Verify Connection
```bash
curl http://localhost:3002/health
```

Expected output:
```json
{
  "status": "ok",
  "timestamp": "2026-02-06T10:24:22.000Z",
  "database": "connected"
}
```

---

### Production Deployment

#### Frontend (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd packages/nextjs
vercel --prod
```

#### Backend (Railway/Render)
```bash
# Build
cd packages/backend
npm run build

# Start
npm start
```

#### Environment Variables
- Set all `.env` variables in deployment platform
- Use production RPC URLs (not testnet)
- Enable CORS for frontend domain
- Set `NODE_ENV=production`

---

## 📈 Success Metrics

### Hackathon Goals
- [ ] **Demo Ready**: All features functional for demo day
- [ ] **Video Submitted**: 5-minute walkthrough video
- [ ] **Documentation**: README with setup instructions
- [ ] **Smart Contracts**: Verified on Starkscan
- [ ] **Live Demo**: Deployed frontend accessible to judges

### Bitcoin Track ($8,000)
- [ ] Garden Finance integration complete
- [ ] BTC ↔ STRK swaps functional
- [ ] Testnet BTC successfully swapped
- [ ] Bitcoin balance displayed correctly

### Starknet Track
- [ ] ZK-Passport verification working
- [ ] Session keys creating successfully
- [ ] Agent registration on-chain
- [ ] Service marketplace live

### Bonus Points
- [ ] Unique ZK-SNARK implementation
- [ ] Novel session key architecture
- [ ] Clean, professional UI
- [ ] Comprehensive documentation

---

## 🎓 Team & Resources

### Team
- **Developer**: Ujjwal Tyagi
- **Role**: Full-stack developer, smart contract engineer

### Resources Used
- Starknet Documentation: https://docs.starknet.io/
- Starknet React: https://www.starknet-react.com/
- Garden Finance: https://docs.garden.finance/
- Supabase Docs: https://supabase.com/docs
- Cairo Book: https://book.cairo-lang.org/

### Support
- Starknet Discord: https://discord.gg/starknet
- Stack Overflow: #starknet tag
- GitHub Discussions

---

## 📝 License
MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments
- Starknet Foundation for the hackathon
- Garden Finance for Bitcoin integration tools
- Supabase for database infrastructure
- Alchemy for RPC services

---

**Last Updated**: February 6, 2026  
**Version**: 1.0.0  
**Status**: Full-Fledge Mode Active 🚀
