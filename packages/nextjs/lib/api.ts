// ============================================
// BitZen — API Client
// Single HTTP layer for all backend communication
// ============================================

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || "v1";

function getBaseUrl() {
  return `${API_BASE}/api/${API_VERSION}`;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  // NOTE: For hackathon scope, JWT is stored in localStorage.
  // For production, migrate to httpOnly cookies to prevent XSS token theft.
  return localStorage.getItem("bitzen_token");
}

function setTokens(token: string, refreshToken: string) {
  localStorage.setItem("bitzen_token", token);
  localStorage.setItem("bitzen_refresh_token", refreshToken);
}

function clearTokens() {
  localStorage.removeItem("bitzen_token");
  localStorage.removeItem("bitzen_refresh_token");
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // M7+M8: Auto-refresh on 401 and retry once
  if (response.status === 401 && !_isRetry) {
    const refreshToken = typeof window !== "undefined"
      ? localStorage.getItem("bitzen_refresh_token")
      : null;
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${getBaseUrl()}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData?.data?.token) {
            setTokens(refreshData.data.token, refreshToken);
            // Retry original request with new token
            return request<T>(endpoint, options, true);
          }
        }
      } catch {
        // Refresh failed — fall through to error
      }
    }
    // Refresh not available or failed — clear tokens
    clearTokens();
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    throw new ApiError(
      response.status,
      errorData?.error || errorData?.message || "Request failed",
      errorData
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============================================
// Auth Endpoints
// ============================================

export const auth = {
  signMessage: (address: string) =>
    request<{ message: string; address: string }>("/auth/sign-message", {
      method: "POST",
      body: JSON.stringify({ address }),
    }),

  verify: (address: string, message: string, signature: string[]) =>
    request<{ token: string; refreshToken: string; expiresIn: string }>(
      "/auth/verify",
      {
        method: "POST",
        body: JSON.stringify({ address, message, signature }),
      }
    ),

  refresh: (refreshToken: string) =>
    request<{ token: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  me: () => request<{ address: string; iat: number; exp: number }>("/auth/me"),
};

// ============================================
// Agents Endpoints
// ============================================

export interface Agent {
  id?: string;
  address: string;
  name: string;
  description: string;
  capabilities: string[];
  public_key?: string;
  status?: string;
  created_at?: string;
  tx_hash?: string | null;
}

export interface AgentSession {
  id: string;
  agent_address: string;
  session_key: string;
  expires_at: string;
  allowed_methods?: string[];
  spending_limit?: string;
  created_at?: string;
}

export const agents = {
  register: (data: {
    name: string;
    description: string;
    address: string;
    capabilities: string[];
  }) =>
    request<{ agent: Agent; tx_hash?: string | null }>("/agents/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: () => request<Agent[]>("/agents"),

  get: (address: string) => request<Agent>(`/agents/${address}`),

  delete: (address: string) =>
    request<{ message: string }>(`/agents/${address}`, {
      method: "DELETE",
    }),

  createSession: (address: string) =>
    request<AgentSession>(`/agents/${address}/sessions`, {
      method: "POST",
    }),

  getSessions: (address: string) =>
    request<AgentSession[]>(`/agents/${address}/sessions`),
};

// ============================================
// Services Endpoints
// ============================================

export interface Service {
  id?: string;
  name: string;
  description: string;
  category: string;
  price: string;
  provider_address: string;
  status?: string;
  created_at?: string;
  tx_hash?: string | null;
}

export interface Review {
  id?: string;
  service_id: string;
  reviewer_address: string;
  rating: number;
  comment: string;
  created_at?: string;
  tx_hash?: string | null;
}

export interface Reputation {
  service_id: string;
  average_rating: number;
  total_reviews: number;
  score: number;
}

export const services = {
  register: (data: {
    name: string;
    description: string;
    category: string;
    price: string;
  }) =>
    request<{ service: Service; tx_hash?: string | null }>(
      "/services/register",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  list: () => request<Service[]>("/services"),

  get: (id: string) => request<Service>(`/services/${id}`),

  submitReview: (
    id: string,
    data: { rating: number; comment: string }
  ) =>
    request<{ review: Review; tx_hash?: string | null }>(
      `/services/${id}/reviews`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  getReviews: (id: string) => request<Review[]>(`/services/${id}/reviews`),

  getReputation: (id: string) =>
    request<Reputation>(`/services/${id}/reputation`),
};

// ============================================
// Auditors Endpoints
// ============================================

export interface Stake {
  id?: string;
  auditor_address: string;
  service_id: string;
  amount: string;
  status?: string;
  created_at?: string;
  tx_hash?: string | null;
}

export const auditors = {
  stake: (data: { serviceId: string; amount: string }) =>
    request<{ stake: Stake; tx_hash?: string | null }>("/auditors/stake", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  unstake: (data: { serviceId: string }) =>
    request<{ message: string; tx_hash?: string | null }>("/auditors/unstake", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getStakes: (address: string) =>
    request<Stake[]>(`/auditors/${address}/stakes`),

  getServiceAuditors: (serviceId: string) =>
    request<Stake[]>(`/auditors/service/${serviceId}`),
};

// ============================================
// Plugin: Bitcoin
// ============================================

export interface SwapQuote {
  id: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  fee: string;
  expiresAt: string;
}

export interface SwapStatus {
  id: string;
  status: string;
  fromAmount?: string;
  toAmount?: string;
  txHash?: string;
}

export interface ExchangeRates {
  BTC_USD: number;
  BTC_ETH: number;
  BTC_STRK: number;
  [key: string]: number;
}

export const bitcoin = {
  getQuote: (data: {
    fromToken: string;
    toToken: string;
    amount: string;
  }) =>
    request<SwapQuote>("/plugins/bitcoin/quote", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  executeSwap: (data: {
    fromToken: string;
    toToken: string;
    amount: string;
    recipientAddress: string;
  }) =>
    request<{ swapId: string; status: string }>("/plugins/bitcoin/swap", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getSwapStatus: (swapId: string) =>
    request<SwapStatus>(`/plugins/bitcoin/swap/${swapId}/status`),

  getBalance: (address: string) =>
    request<{ address: string; balance: string }>(
      `/plugins/bitcoin/balance/${address}`
    ),

  getRates: () => request<ExchangeRates>("/plugins/bitcoin/rates"),
};

// ============================================
// Plugin: Account (Session Keys)
// ============================================

export interface SessionKey {
  id: string;
  agent_address: string;
  session_key: string;
  expires_at: string;
  allowed_methods?: string[];
  spending_limit?: string;
  status?: string;
  created_at?: string;
}

export const account = {
  createSession: (data: {
    agentAddress: string;
    duration?: number;
    allowedMethods?: string[];
    spendingLimit?: string;
  }) =>
    request<SessionKey>("/plugins/account/session", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getSessions: (agentAddress: string) =>
    request<SessionKey[]>(`/plugins/account/sessions/${agentAddress}`),

  getSession: (id: string) =>
    request<SessionKey>(`/plugins/account/session/${id}`),

  revokeSession: (id: string) =>
    request<{ message: string }>(`/plugins/account/sessions/${id}/revoke`, {
      method: "POST",
    }),

  updateSpendingLimit: (id: string, limit: string) =>
    request<SessionKey>(`/plugins/account/sessions/${id}/limit`, {
      method: "PATCH",
      body: JSON.stringify({ spendingLimit: limit }),
    }),

  execute: (data: {
    sessionId: string;
    contractAddress: string;
    entrypoint: string;
    calldata: string[];
  }) =>
    request<{ tx_hash: string }>("/plugins/account/execute", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ============================================
// Plugin: ZK Proofs
// ============================================

export interface ZKProof {
  id: string;
  agent_address: string;
  proof_type: string;
  status: string;
  proof_data?: unknown;
  created_at?: string;
  verified_at?: string;
}

export const zkproof = {
  generate: (data: {
    agentAddress: string;
    proofType: string;
    inputData: Record<string, unknown>;
  }) =>
    request<ZKProof>("/plugins/zkproof/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verify: (data: { proofId: string }) =>
    request<{ verified: boolean; proof: ZKProof }>("/plugins/zkproof/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getStatus: (proofId: string) =>
    request<ZKProof>(`/plugins/zkproof/status/${proofId}`),

  getAgentProofs: (agentAddress: string) =>
    request<ZKProof[]>(`/plugins/zkproof/agent/${agentAddress}`),
};

// ============================================
// Token helpers
// ============================================

export { setTokens, clearTokens, getToken };
