# BitZen Full Stack Development Roadmap

**Project Status:** Smart Contracts ✅ | Backend 🔄 | Agent 🔄 | Database 🔄 | Frontend 🔄

---

## 📋 Project Architecture

```
BitZen Platform
├── Smart Contracts (✅ DONE)
│   ├── ZKPassport - Identity verification
│   ├── AgentAccount - Autonomous execution
│   └── ServiceRegistry - Auditor ecosystem
│
├── Backend API (🔄 TO BUILD)
│   ├── Node.js/Express or Python/FastAPI
│   ├── REST/GraphQL endpoints
│   ├── Contract interaction layer
│   └── Authentication & authorization
│
├── AI Agent Service (🔄 TO BUILD)
│   ├── Agent orchestration
│   ├── Task execution engine
│   ├── Policy enforcement
│   └── Decision making logic
│
├── Database (🔄 TO BUILD)
│   ├── PostgreSQL (relational data)
│   ├── MongoDB (flexible data)
│   └── Redis (caching)
│
└── Frontend (🔄 TO BUILD)
    ├── Next.js UI
    ├── Wallet integration
    ├── Dashboard
    └── Agent management
```

---

## 🛠️ Backend Service

### Tech Stack Options:
- **Node.js + Express** (Fast, JavaScript ecosystem)
- **Python + FastAPI** (Data-heavy, ML-friendly)
- **Go + Gin** (High performance)

### Key Components:
```
Backend/
├── src/
│   ├── controllers/
│   │   ├── agents.ts
│   │   ├── services.ts
│   │   ├── auditors.ts
│   │   └── auth.ts
│   ├── services/
│   │   ├── starknet.ts (contract interaction)
│   │   ├── agent-orchestrator.ts
│   │   ├── proof-generator.ts
│   │   └── reputation.ts
│   ├── models/
│   │   ├── agent.ts
│   │   ├── service.ts
│   │   └── review.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── validation.ts
│   ├── utils/
│   │   ├── starknet-provider.ts
│   │   ├── signature-verification.ts
│   │   └── error-handling.ts
│   └── routes/
│       ├── agents.ts
│       ├── services.ts
│       └── auditors.ts
├── config/
│   └── database.ts
└── server.ts
```

### API Endpoints:
```
Agents:
  POST   /api/agents/register
  GET    /api/agents/:address
  PUT    /api/agents/:address
  DELETE /api/agents/:address

Services:
  POST   /api/services/register
  GET    /api/services
  GET    /api/services/:id
  POST   /api/services/:id/reviews

Auditors:
  POST   /api/auditors/stake
  POST   /api/auditors/unstake
  GET    /api/auditors/:address

Auth:
  POST   /api/auth/sign-message
  POST   /api/auth/verify
```

---

## 🤖 AI Agent Service

### Agent Types:
1. **Autonomous Agent** - Self-executing tasks
2. **Supervised Agent** - Requires approval
3. **Hybrid Agent** - Mix of both

### Components:
```
Agent Service/
├── src/
│   ├── core/
│   │   ├── agent-engine.ts
│   │   ├── policy-engine.ts
│   │   ├── executor.ts
│   │   └── validator.ts
│   ├── capabilities/
│   │   ├── contract-interaction.ts
│   │   ├── data-processing.ts
│   │   ├── decision-making.ts
│   │   └── reporting.ts
│   ├── models/
│   │   ├── agent-state.ts
│   │   ├── task-queue.ts
│   │   └── execution-log.ts
│   └── integrations/
│       ├── starknet-integration.ts
│       ├── llm-integration.ts (Optional: OpenAI, Claude)
│       └── event-listener.ts
├── config/
│   ├── policies.yaml
│   └── agent-config.yaml
└── server.ts
```

### Agent Workflow:
```
1. Task Request → 2. Policy Check → 3. Capability Match
        ↓                ↓                    ↓
   Queue Task      Validate Rules    Plan Execution
        ↓                ↓                    ↓
   4. Execute → 5. Monitor → 6. Report → 7. Update State
```

### Example Task:
```json
{
  "agent_address": "0x...",
  "task_type": "service_registration",
  "parameters": {
    "service_name": "AI Oracle",
    "stake_amount": "1000"
  },
  "policies": {
    "max_daily_stake": "5000",
    "requires_approval": false
  }
}
```

---

## 💾 Database Schema

### PostgreSQL Tables:

```sql
-- Agents Table
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  address VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  registered_at TIMESTAMP,
  is_verified BOOLEAN,
  reputation_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Services Table
CREATE TABLE services (
  id UUID PRIMARY KEY,
  service_id VARCHAR UNIQUE NOT NULL,
  provider_address VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  endpoint VARCHAR,
  total_stake DECIMAL,
  auditor_count INT,
  is_active BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (provider_address) REFERENCES agents(address)
);

-- Reviews Table
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  service_id UUID NOT NULL,
  reviewer_address VARCHAR NOT NULL,
  rating INT (1-5),
  review_hash VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (reviewer_address) REFERENCES agents(address)
);

-- Auditor Stakes Table
CREATE TABLE auditor_stakes (
  id UUID PRIMARY KEY,
  service_id UUID NOT NULL,
  auditor_address VARCHAR NOT NULL,
  amount DECIMAL,
  staked_at TIMESTAMP,
  unstaked_at TIMESTAMP,
  is_active BOOLEAN,
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (auditor_address) REFERENCES agents(address)
);

-- Agent Sessions Table
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY,
  agent_address VARCHAR NOT NULL,
  session_key VARCHAR UNIQUE NOT NULL,
  expiration_block INT,
  max_spend DECIMAL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN,
  FOREIGN KEY (agent_address) REFERENCES agents(address)
);

-- Task Logs Table
CREATE TABLE task_logs (
  id UUID PRIMARY KEY,
  agent_address VARCHAR NOT NULL,
  task_type VARCHAR,
  status VARCHAR (pending, executing, completed, failed),
  parameters JSONB,
  result JSONB,
  error_message TEXT,
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (agent_address) REFERENCES agents(address)
);

-- Reputation Table
CREATE TABLE reputation_scores (
  id UUID PRIMARY KEY,
  service_id UUID NOT NULL,
  total_rating INT,
  review_count INT,
  average_score FLOAT,
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (service_id) REFERENCES services(id)
);
```

### MongoDB Collections (Optional - for flexible data):

```javascript
// Agent Activity Logs
db.activity_logs.insertOne({
  agent_id: ObjectId(),
  action: "service_registered",
  details: {
    service_name: "AI Oracle",
    stake_amount: 1000
  },
  timestamp: new Date(),
  tx_hash: "0x..."
});

// Audit Trails
db.audit_trails.insertOne({
  user_address: "0x...",
  action: "stake_placed",
  changes: {
    before: { stake: 0 },
    after: { stake: 1000 }
  },
  timestamp: new Date()
});
```

### Redis Cache Keys:
```
agent:{address}:profile
service:{id}:details
reputation:{service_id}:score
session:{key}:data
task:{id}:status
```

---

## 📊 Integration Points

### 1. Backend ↔ Smart Contracts
```typescript
// Contract Interaction Service
class StarknetService {
  async registerAgent(address, proof) {
    // Call ZKPassport.register_agent
    // Store in DB
    // Emit event
  }

  async registerService(name, stake) {
    // Call ServiceRegistry.register_service
    // Store metadata in DB
  }

  async submitReview(serviceId, rating) {
    // Call ServiceRegistry.submit_review
    // Update reputation in DB
  }
}
```

### 2. Agent ↔ Backend
```typescript
// Agent Manager
class AgentOrchestrator {
  async executeTask(task) {
    // 1. Validate task against policies
    // 2. Call backend API to check authorization
    // 3. Execute task
    // 4. Call backend API to log result
  }
}
```

### 3. Database ↔ All Services
```typescript
// All services use unified DB connection
const db = new Database({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
```

---

## 🔐 Security Considerations

1. **API Authentication**
   - JWT tokens for users
   - Signature verification for agents
   - Rate limiting

2. **Database Security**
   - Encrypted passwords
   - SQL injection prevention
   - Row-level security

3. **Agent Security**
   - Policy enforcement
   - Spending limits
   - Kill switch mechanism

4. **Contract Interaction**
   - Transaction signing
   - Nonce management
   - Error handling

---

## 🚀 Implementation Priority

### Phase 1 (Week 1):
- [ ] Backend API setup
- [ ] Database schema
- [ ] Contract interaction service
- [ ] Basic authentication

### Phase 2 (Week 2):
- [ ] Agent service foundation
- [ ] Task execution engine
- [ ] Policy enforcement
- [ ] Event listeners

### Phase 3 (Week 3):
- [ ] Frontend UI
- [ ] Wallet integration
- [ ] Dashboard
- [ ] Agent management interface

### Phase 4 (Week 4):
- [ ] Testing & QA
- [ ] Performance optimization
- [ ] Security audit
- [ ] Deployment

---

## 📦 Tech Stack Summary

| Component | Tech | Purpose |
|-----------|------|---------|
| Backend | Node.js/Express | API, Contract interaction |
| Agent | Node.js/Python | Task execution, Policy engine |
| Database | PostgreSQL + MongoDB | Data persistence |
| Cache | Redis | Performance optimization |
| Auth | JWT + Signatures | Security |
| Contracts | Cairo/Starknet | On-chain logic |
| Frontend | Next.js/React | User interface |
| Deployment | Docker + Kubernetes | Scalability |

---

## 📝 Next Steps

1. **Choose tech stack** for backend & agent
2. **Set up development environment**
3. **Create database schema**
4. **Build API endpoints**
5. **Implement agent service**
6. **Create frontend UI**
7. **Test integration**
8. **Deploy to production**

Ready to start? Let me know which component you want to build first! 🎯
