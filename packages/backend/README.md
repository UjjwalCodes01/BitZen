# BitZen Backend API

Production-ready Express.js backend for the BitZen AI Agent platform on Starknet.

## Features

✅ **REST API** - Complete RESTful endpoints for agents, services, and auditors  
✅ **Starknet Integration** - Direct contract interaction layer  
✅ **Authentication** - JWT-based auth with Starknet signature verification  
✅ **Database** - PostgreSQL with connection pooling  
✅ **Caching** - Redis integration for performance  
✅ **Security** - Helmet, CORS, rate limiting  
✅ **Logging** - Winston logger with file rotation  
✅ **TypeScript** - Full type safety  
✅ **Validation** - Request validation with express-validator  

## Architecture

```
backend/
├── src/
│   ├── controllers/      # Route handlers
│   │   ├── agents.ts
│   │   ├── services.ts
│   │   ├── auditors.ts
│   │   └── auth.ts
│   ├── routes/           # API routes
│   │   ├── agents.ts
│   │   ├── services.ts
│   │   ├── auditors.ts
│   │   └── auth.ts
│   ├── services/         # Business logic
│   │   ├── starknet.ts   # Contract interaction
│   │   ├── agent.ts      # Agent operations
│   │   ├── service.ts    # Service operations
│   │   └── auditor.ts    # Auditor operations
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── validation.ts
│   ├── database/         # Database layer
│   │   ├── pool.ts
│   │   └── init.ts
│   ├── utils/            # Utilities
│   │   ├── logger.ts
│   │   ├── signature.ts
│   │   └── redis.ts
│   └── server.ts         # Main server file
├── package.json
├── tsconfig.json
└── .env.example
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/sign-message` - Get message to sign
- `POST /api/v1/auth/verify` - Verify signature & get JWT
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user

### Agents
- `POST /api/v1/agents/register` - Register agent with ZK proof
- `GET /api/v1/agents/:address` - Get agent details
- `GET /api/v1/agents` - Get all agents (paginated)
- `DELETE /api/v1/agents/:address` - Revoke agent (auth required)
- `POST /api/v1/agents/:address/sessions` - Create session key (auth required)
- `GET /api/v1/agents/:address/sessions` - Get agent sessions

### Services
- `POST /api/v1/services/register` - Register service (auth required)
- `GET /api/v1/services` - Get all services (with filters)
- `GET /api/v1/services/:id` - Get service details
- `POST /api/v1/services/:id/reviews` - Submit review (auth required)
- `GET /api/v1/services/:id/reviews` - Get service reviews
- `GET /api/v1/services/:id/reputation` - Get reputation score

### Auditors
- `POST /api/v1/auditors/stake` - Stake as auditor (auth required)
- `POST /api/v1/auditors/unstake` - Unstake (auth required)
- `GET /api/v1/auditors/:address/stakes` - Get auditor stakes
- `GET /api/v1/auditors/service/:id` - Get service auditors

### Health
- `GET /health` - Health check endpoint

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Starknet account with deployed contracts

### Installation

```bash
cd packages/backend
npm install
```

### Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/bitizen

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

# Starknet
STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/...
ZKPASSPORT_ADDRESS=0x045298a1c7f2f2faf2aa75f794c5f96a5c282a80d2dbcfd4bfb5045a76101667
SERVICE_REGISTRY_ADDRESS=0x06b3b6f139090875372d25adfa8401c50474a05aeb8e4c1d0365601563aa32da
```

### Database Setup

```bash
# Create PostgreSQL database
createdb bitizen

# Tables will be auto-created on first run
npm run dev
```

### Redis Setup

```bash
# Start Redis (Linux/Mac)
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:alpine
```

## Running

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Testing
```bash
npm test
```

## Contract ABIs

Place contract ABIs in `packages/backend/abis/`:
- `ZKPassport.json`
- `ServiceRegistry.json`
- `AgentAccount.json`

Extract ABIs from compiled contracts:
```bash
# From snfoundry directory
cp target/dev/BitZen_ZKPassport.contract_class.json ../backend/abis/ZKPassport.json
cp target/dev/BitZen_ServiceRegistry.contract_class.json ../backend/abis/ServiceRegistry.json
cp target/dev/BitZen_AgentAccount.contract_class.json ../backend/abis/AgentAccount.json
```

## Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin protection
- **Rate Limiting** - 100 requests per 15 minutes
- **JWT Authentication** - Secure token-based auth
- **Input Validation** - All requests validated
- **Signature Verification** - Starknet signature checking

## Performance

- **Connection Pooling** - PostgreSQL pool (max 20)
- **Redis Caching** - 1-hour TTL by default
- **Compression** - Gzip response compression
- **Logging** - File rotation (5MB max, 5 files)

## Error Handling

All errors return consistent format:
```json
{
  "success": false,
  "message": "Error description",
  "stack": "Stack trace (dev only)"
}
```

## License

MIT
