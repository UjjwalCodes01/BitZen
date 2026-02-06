/**
 * Bitcoin Plugin - Garden SDK Integration
 *
 * Enables BTC ↔ STRK atomic swaps for AI agents
 * Critical for Bitcoin track hackathon prize
 */
import { Plugin, PluginConfig, AgentContext, PluginAction } from '../types';
export interface BitcoinPluginConfig {
    network: 'mainnet' | 'testnet';
    defaultSwapAmount: string;
    slippageTolerance: number;
    gardenApiUrl?: string;
    gardenApiKey?: string;
}
export declare class BitcoinPlugin implements Plugin {
    name: string;
    version: string;
    description: string;
    private config;
    private context;
    private initialized;
    actions: PluginAction[];
    initialize(config: PluginConfig, context: AgentContext): Promise<void>;
    shutdown(): Promise<void>;
    healthCheck(): Promise<boolean>;
    /**
     * Get swap quote from Garden SDK
     */
    private getSwapQuote;
    /**
     * Execute atomic swap using Garden SDK
     */
    private executeSwap;
    /**
     * Get swap status
     */
    private getSwapStatus;
    /**
     * Get BTC balance
     */
    private getBTCBalance;
    /**
     * Derive BTC address from Starknet agent address
     * (Simplified - in production, use proper derivation)
     */
    private deriveBTCAddress;
}
//# sourceMappingURL=BitcoinPlugin.d.ts.map