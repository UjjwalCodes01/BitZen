/**
 * Plugin Types
 * Shared type definitions for AI agent plugins
 */

export interface AgentContext {
  agentAddress: string;
  network: string;
  rpcUrl: string;
  backendUrl: string;
  logger?: {
    info: (msg: string, data?: any) => void;
    error: (msg: string, error?: any) => void;
    warn: (msg: string, data?: any) => void;
  };
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    timestamp?: string;
    [key: string]: any;
  };
}

export interface SwapQuote {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  exchangeRate: number;
  fees: {
    network: string;
    service: string;
    total: string;
  };
  estimatedTime: string;
  provider: string;
}

export interface ZKProof {
  proofId: string;
  agentAddress: string;
  proof: string;
  publicInputs: string[];
  verified: boolean;
  timestamp: string;
}

export interface SessionKey {
  sessionId: string;
  publicKey: string;
  agentAddress: string;
  createdAt: string;
  expiresAt: string;
  permissions: string[];
  isActive: boolean;
}

export interface PluginConfig {
  enabled: boolean;
  name: string;
  version: string;
  description: string;
}
