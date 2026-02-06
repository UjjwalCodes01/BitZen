# BitZen Backend API Documentation

## Base URL
```
Development: http://localhost:3001/api/v1
Production: https://api.bitizen.app/api/v1
```

---

## Authentication

### Get Sign Message
Generate a message for wallet signature authentication.

**Endpoint:** `POST /auth/sign-message`

**Request:**
```json
{
  "address": "0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "BitZen Login\nAddress: 0x0447...\nNonce: 1707091234567",
    "address": "0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e"
  }
}
```

### Verify Signature
Verify wallet signature and receive JWT token.

**Endpoint:** `POST /auth/verify`

**Request:**
```json
{
  "address": "0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e",
  "message": "BitZen Login\nAddress: 0x0447...\nNonce: 1707091234567",
  "signature": ["0x123...", "0x456..."]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

### Refresh Token
Get new access token using refresh token.

**Endpoint:** `POST /auth/refresh`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

### Get Current User
Get authenticated user information.

**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e"
  }
}
```

---

## Agents

### Register Agent
Register a new AI agent with ZK proof verification.

**Endpoint:** `POST /agents/register`

**Request:**
```json
{
  "address": "0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e",
  "proof_data": ["0x123...", "0x456..."],
  "public_inputs": ["0x789...", "0xabc..."]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent registration initiated",
  "data": {
    "agent": {
      "id": 1,
      "address": "0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e",
      "tx_hash": "0x0123456789abcdef...",
      "registered_at": "2026-02-05T10:30:00Z",
      "is_verified": false
    },
    "tx_hash": "0x0123456789abcdef..."
  }
}
```

### Get Agent
Retrieve agent information by address.

**Endpoint:** `GET /agents/:address`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "address": "0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e",
    "registered_at": "2026-02-05T10:30:00Z",
    "is_verified": true,
    "on_chain": {
      "is_registered": true,
      "registration_time": "1707132600",
      "is_revoked": false
    }
  }
}
```

### Get All Agents
List all registered agents with pagination.

**Endpoint:** `GET /agents?page=1&limit=10`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [...],
    "total": 42
  }
}
```

### Revoke Agent
Revoke an agent (owner only).

**Endpoint:** `DELETE /agents/:address`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Agent revoked successfully",
  "data": {
    "tx_hash": "0x0123456789abcdef..."
  }
}
```

### Create Session
Create a session key for autonomous operation.

**Endpoint:** `POST /agents/:address/sessions`

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "session_public_key": "0x0123456789abcdef...",
  "expiration_block": 1000000,
  "max_spend_per_tx": 1000000000000000000,
  "allowed_methods": ["transfer", "approve"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "session": {
      "id": 1,
      "agent_address": "0x0447...",
      "session_key": "0x0123...",
      "expiration_block": 1000000,
      "max_spend": 1000000000000000000
    },
    "tx_hash": "0x0123456789abcdef..."
  }
}
```

### Get Agent Sessions
List all sessions for an agent.

**Endpoint:** `GET /agents/:address/sessions`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "session_key": "0x0123...",
      "expiration_block": 1000000,
      "created_at": "2026-02-05T10:30:00Z"
    }
  ]
}
```

---

## Services

### Register Service
Register a new service in the marketplace.

**Endpoint:** `POST /services/register`

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "AI Trading Bot",
  "description": "Automated trading service for DeFi",
  "endpoint": "https://api.myservice.com",
  "stake_amount": 1000000000000000000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Service registered successfully",
  "data": {
    "service": {
      "id": 1,
      "provider_address": "0x0447...",
      "name": "AI Trading Bot",
      "total_stake": 1000000000000000000,
      "is_active": true
    },
    "tx_hash": "0x0123456789abcdef..."
  }
}
```

### Get All Services
List all services with optional filters.

**Endpoint:** `GET /services?page=1&limit=10&min_stake=1000`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `category` (optional): Service category
- `min_stake` (optional): Minimum stake amount

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": 1,
        "name": "AI Trading Bot",
        "endpoint": "https://api.myservice.com",
        "total_stake": 1000000000000000000,
        "avg_rating": 4.5,
        "review_count": 42
      }
    ],
    "total": 15
  }
}
```

### Get Service Details
Get detailed information about a service.

**Endpoint:** `GET /services/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "provider_address": "0x0447...",
    "name": "AI Trading Bot",
    "description": "Automated trading service",
    "endpoint": "https://api.myservice.com",
    "total_stake": 1000000000000000000,
    "avg_rating": 4.5,
    "review_count": 42,
    "on_chain": {
      "provider": "0x0447...",
      "is_active": true
    }
  }
}
```

### Submit Review
Submit a review for a service.

**Endpoint:** `POST /services/:id/reviews`

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "rating": 5,
  "review_hash": "0x0123456789abcdef..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "review": {
      "id": 1,
      "service_id": 1,
      "reviewer_address": "0x0447...",
      "rating": 5,
      "created_at": "2026-02-05T10:30:00Z"
    },
    "tx_hash": "0x0123456789abcdef..."
  }
}
```

### Get Service Reviews
Get all reviews for a service.

**Endpoint:** `GET /services/:id/reviews?page=1&limit=10`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "reviewer_address": "0x0447...",
      "rating": 5,
      "review_hash": "0x0123...",
      "created_at": "2026-02-05T10:30:00Z"
    }
  ]
}
```

### Get Service Reputation
Get reputation score for a service.

**Endpoint:** `GET /services/:id/reputation`

**Response:**
```json
{
  "success": true,
  "data": {
    "service_id": 1,
    "avg_rating": 4.5,
    "total_reviews": 42,
    "last_updated": "2026-02-05T10:30:00Z"
  }
}
```

---

## Auditors

### Stake as Auditor
Stake tokens to become an auditor for a service.

**Endpoint:** `POST /auditors/stake`

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "service_id": "1",
  "amount": 500000000000000000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Staked successfully",
  "data": {
    "stake": {
      "id": 1,
      "service_id": 1,
      "auditor_address": "0x0447...",
      "amount": 500000000000000000,
      "is_active": true
    },
    "tx_hash": "0x0123456789abcdef..."
  }
}
```

### Unstake
Remove stake from a service.

**Endpoint:** `POST /auditors/unstake`

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "service_id": "1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Unstaked successfully",
  "data": {
    "tx_hash": "0x0123456789abcdef..."
  }
}
```

### Get Auditor Stakes
Get all stakes for an auditor.

**Endpoint:** `GET /auditors/:address/stakes`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "service_id": 1,
      "service_name": "AI Trading Bot",
      "amount": 500000000000000000,
      "is_active": true,
      "staked_at": "2026-02-05T10:30:00Z"
    }
  ]
}
```

### Get Service Auditors
Get all auditors for a service.

**Endpoint:** `GET /auditors/service/:id`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "auditor_address": "0x0447...",
      "amount": 500000000000000000,
      "staked_at": "2026-02-05T10:30:00Z"
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limiting

- **Window:** 15 minutes
- **Max Requests:** 100 per IP
- **Headers:**
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (starts at 1)
- `limit`: Items per page (max 100)

**Response includes:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 150,
    "page": 1,
    "limit": 10
  }
}
```
