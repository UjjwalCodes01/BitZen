/**
 * BitZen Agent Plugin System - Core Types
 *
 * Defines the plugin architecture for AI agents on Starknet
 */
export interface PluginConfig {
    name: string;
    enabled: boolean;
    config: Record<string, any>;
}
export interface PluginAction {
    name: string;
    description: string;
    parameters: ActionParameter[];
    execute: (params: any, context: AgentContext) => Promise<ActionResult>;
}
export interface ActionParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    description: string;
    default?: any;
}
export interface ActionResult {
    success: boolean;
    data?: any;
    error?: string;
    txHash?: string;
    metadata?: Record<string, any>;
}
export interface AgentContext {
    agentAddress: string;
    sessionKey?: string;
    network: 'mainnet' | 'sepolia' | 'devnet';
    rpcUrl: string;
    backendUrl: string;
    logger?: Logger;
}
export interface Logger {
    info: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
}
export interface Plugin {
    name: string;
    version: string;
    description: string;
    actions: PluginAction[];
    initialize: (config: PluginConfig, context: AgentContext) => Promise<void>;
    shutdown: () => Promise<void>;
    healthCheck: () => Promise<boolean>;
}
export interface SwapQuote {
    inputAmount: string;
    outputAmount: string;
    exchangeRate: number;
    fee: string;
    slippage: number;
    estimatedTime: number;
    route: string[];
}
export interface SwapResult {
    success: boolean;
    swapId: string;
    inputTx?: string;
    outputTx?: string;
    actualAmount?: string;
    error?: string;
}
export interface ZKProof {
    proof: string;
    publicInputs: string[];
    verifierType: 's2' | 'garaga';
    timestamp: number;
    expiresAt: number;
}
export interface SessionKey {
    publicKey: string;
    privateKey: string;
    agentAddress: string;
    expiresAt: number;
    permissions: SessionPermissions;
}
export interface SessionPermissions {
    canExecuteTasks: boolean;
    canMakeSwaps: boolean;
    canStake: boolean;
    maxDailySpend: string;
    maxTransactionAmount: string;
}
//# sourceMappingURL=types.d.ts.map