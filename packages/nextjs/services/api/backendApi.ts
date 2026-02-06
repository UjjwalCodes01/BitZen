/**
 * Backend API Service
 * Centralized service for all BitZen backend API calls
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || "v1";

class BackendApiService {
  private baseUrl: string;
  private apiVersion: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.apiVersion = API_VERSION;
  }

  /**
   * Get full API endpoint URL
   */
  private getEndpoint(path: string): string {
    return `${this.baseUrl}/api/${this.apiVersion}${path}`;
  }

  /**
   * Generic request handler
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getAuthToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(this.getEndpoint(endpoint), {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.message || "API request failed");
      }

      return await response.json();
    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Get stored auth token
   */
  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("bitizen_auth_token");
  }

  /**
   * Store auth token
   */
  setAuthToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("bitizen_auth_token", token);
    }
  }

  /**
   * Clear auth token
   */
  clearAuthToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("bitizen_auth_token");
    }
  }

  // ==================== AUTHENTICATION ====================

  /**
   * Get nonce for wallet signature
   */
  async getSignMessage(
    address: string,
  ): Promise<{ message: string; nonce: string }> {
    return this.request("/auth/sign-message", {
      method: "POST",
      body: JSON.stringify({ address }),
    });
  }

  /**
   * Verify signature and get JWT token
   */
  async verifySignature(data: {
    address: string;
    signature: string[];
    message: string;
  }): Promise<{ token: string; refreshToken: string; user: any }> {
    const result = await this.request<any>("/auth/verify", {
      method: "POST",
      body: JSON.stringify(data),
    });

    // Store token automatically
    if (result.token) {
      this.setAuthToken(result.token);
    }

    return result;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<any> {
    return this.request("/auth/me");
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    return this.request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  // ==================== AGENTS ====================

  /**
   * Register a new agent
   */
  async registerAgent(data: {
    address: string;
    publicKey: string;
    zkProof: string;
    metadata?: any;
  }): Promise<any> {
    return this.request("/agents/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get agent details
   */
  async getAgent(address: string): Promise<any> {
    return this.request(`/agents/${address}`);
  }

  /**
   * List all agents
   */
  async listAgents(params?: {
    page?: number;
    limit?: number;
    verified?: boolean;
  }): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/agents${query ? `?${query}` : ""}`);
  }

  /**
   * Revoke an agent
   */
  async revokeAgent(address: string): Promise<any> {
    return this.request(`/agents/${address}`, {
      method: "DELETE",
    });
  }

  /**
   * Create session key
   */
  async createSessionKey(
    agentAddress: string,
    data: {
      sessionPublicKey: string;
      expirationBlocks: number;
      permissions: string[];
      metadata?: any;
    },
  ): Promise<any> {
    return this.request(`/agents/${agentAddress}/sessions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * List agent sessions
   */
  async listSessions(agentAddress: string, activeOnly = true): Promise<any> {
    return this.request(
      `/agents/${agentAddress}/sessions?activeOnly=${activeOnly}`,
    );
  }

  // ==================== SERVICES ====================

  /**
   * Register a new service
   */
  async registerService(data: {
    name: string;
    category: string;
    description: string;
    endpoint: string;
    minStake: string;
    agentAddress: string;
    metadata?: any;
  }): Promise<any> {
    return this.request("/services/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * List services
   */
  async listServices(params?: {
    category?: string;
    minStake?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/services${query ? `?${query}` : ""}`);
  }

  /**
   * Get service details
   */
  async getService(serviceId: string): Promise<any> {
    return this.request(`/services/${serviceId}`);
  }

  /**
   * Submit a review
   */
  async submitReview(
    serviceId: string,
    data: {
      rating: number;
      comment: string;
      reviewerAddress: string;
    },
  ): Promise<any> {
    return this.request(`/services/${serviceId}/reviews`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get service reviews
   */
  async getReviews(serviceId: string): Promise<any> {
    return this.request(`/services/${serviceId}/reviews`);
  }

  /**
   * Get service reputation
   */
  async getReputation(serviceId: string): Promise<any> {
    return this.request(`/services/${serviceId}/reputation`);
  }

  // ==================== AUDITORS ====================

  /**
   * Stake as auditor
   */
  async stakeAsAuditor(data: {
    serviceId: string;
    amount: string;
    auditorAddress: string;
  }): Promise<any> {
    return this.request("/auditors/stake", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Unstake
   */
  async unstake(data: {
    serviceId: string;
    auditorAddress: string;
  }): Promise<any> {
    return this.request("/auditors/unstake", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get auditor stakes
   */
  async getAuditorStakes(auditorAddress: string): Promise<any> {
    return this.request(`/auditors/${auditorAddress}/stakes`);
  }

  /**
   * Get service auditors
   */
  async getServiceAuditors(serviceId: string): Promise<any> {
    return this.request(`/auditors/service/${serviceId}`);
  }

  // ==================== HEALTH ====================

  /**
   * Check backend health
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Export singleton instance
export const backendApi = new BackendApiService();
export default backendApi;
