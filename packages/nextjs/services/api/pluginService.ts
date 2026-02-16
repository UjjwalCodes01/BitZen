/**
 * AI Agent Plugin Service
 * Integration with BitZen AI agent plugins (Bitcoin, ZKProof, Account)
 */

import { AgentContext, ActionResult } from "./pluginTypes";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

class PluginService {
  private context: AgentContext | null = null;

  /**
   * Initialize plugin context with agent details
   */
  initializeContext(agentAddress: string, network: string = "sepolia"): void {
    this.context = {
      agentAddress,
      network,
      rpcUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || "",
      backendUrl: BACKEND_URL,
    };
  }

  /**
   * Get current context
   */
  getContext(): AgentContext | null {
    return this.context;
  }

  /**
   * Check if plugins are enabled
   */
  isEnabled(): boolean {
    return process.env.NEXT_PUBLIC_PLUGINS_ENABLED === "true";
  }

  // ==================== BITCOIN PLUGIN ====================

  /**
   * Get Bitcoin to Starknet swap quote
   */
  async getBitcoinSwapQuote(params: {
    fromCurrency: "BTC" | "STRK";
    toCurrency: "BTC" | "STRK";
    amount: string;
  }): Promise<ActionResult> {
    if (!this.context) throw new Error("Plugin context not initialized");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/bitcoin/quote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            agentAddress: this.context.agentAddress,
          }),
        },
      );

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get swap quote",
      };
    }
  }

  /**
   * Execute Bitcoin atomic swap
   */
  async executeBitcoinSwap(params: {
    fromCurrency: "BTC" | "STRK";
    toCurrency: "BTC" | "STRK";
    amount: string;
    destinationAddress: string;
  }): Promise<ActionResult> {
    if (!this.context) throw new Error("Plugin context not initialized");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/bitcoin/swap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            agentAddress: this.context.agentAddress,
          }),
        },
      );

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to execute swap",
      };
    }
  }

  /**
   * Get Bitcoin swap status
   */
  async getBitcoinSwapStatus(swapId: string): Promise<ActionResult> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/bitcoin/swap/${swapId}/status`,
      );
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get swap status",
      };
    }
  }

  /**
   * Get Bitcoin balance
   */
  async getBitcoinBalance(address: string): Promise<ActionResult> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/bitcoin/balance/${address}`,
      );
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get BTC balance",
      };
    }
  }

  /**
   * Get current exchange rates
   */
  async getExchangeRates(): Promise<ActionResult> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/bitcoin/rates`,
      );
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get exchange rates",
      };
    }
  }

  /**
   * Get current exchange rates
   */
  async getExchangeRates(): Promise<ActionResult> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/bitcoin/rates`,
      );
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get exchange rates",
      };
    }
  }

  // ==================== ZKPROOF PLUGIN ====================

  /**
   * Generate ZK proof for agent identity
   */
  async generateZKProof(params: {
    agentAddress: string;
    publicKey: string;
    metadata?: any;
  }): Promise<ActionResult> {
    if (!this.context) throw new Error("Plugin context not initialized");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/zkproof/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        },
      );

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to generate ZK proof",
      };
    }
  }

  /**
   * Verify ZK proof
   */
  async verifyZKProof(proof: string, publicInputs?: string[]): Promise<ActionResult> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/zkproof/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof, publicInputs: publicInputs || [] }),
        },
      );

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to verify ZK proof",
      };
    }
  }

  /**
   * Get ZK proof status
   */
  async getZKProofStatus(proofId: string): Promise<ActionResult> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/zkproof/status/${proofId}`,
      );
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get proof status",
      };
    }
  }

  // ==================== ACCOUNT PLUGIN ====================

  /**
   * Create session key
   */
  async createSessionKey(params: {
    expirationBlocks: number;
    permissions: string[];
    metadata?: any;
  }): Promise<ActionResult> {
    if (!this.context) throw new Error("Plugin context not initialized");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/account/session/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            agentAddress: this.context.agentAddress,
          }),
        },
      );

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to create session key",
      };
    }
  }

  /**
   * Revoke session key
   */
  async revokeSessionKey(sessionId: string): Promise<ActionResult> {
    if (!this.context) throw new Error("Plugin context not initialized");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/account/session/${sessionId}/revoke`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentAddress: this.context.agentAddress,
          }),
        },
      );

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to revoke session key",
      };
    }
  }

  /**
   * List active sessions
   */
  async listActiveSessions(): Promise<ActionResult> {
    if (!this.context) throw new Error("Plugin context not initialized");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/account/sessions/${this.context.agentAddress}`,
      );
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to list sessions",
      };
    }
  }

  /**
   * Execute task with session key
   */
  async executeTask(params: {
    sessionId: string;
    taskType: string;
    parameters: any;
  }): Promise<ActionResult> {
    if (!this.context) throw new Error("Plugin context not initialized");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/account/task`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            agentAddress: this.context.agentAddress,
          }),
        },
      );

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to execute task",
      };
    }
  }

  /**
   * Set spending limits
   */
  async setSpendingLimits(params: {
    dailyLimit: string;
    transactionLimit: string;
  }): Promise<ActionResult> {
    if (!this.context) throw new Error("Plugin context not initialized");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/plugins/account/spending-limits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            agentAddress: this.context.agentAddress,
          }),
        },
      );

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to set spending limits",
      };
    }
  }
}

// Export singleton instance
export const pluginService = new PluginService();
export default pluginService;
