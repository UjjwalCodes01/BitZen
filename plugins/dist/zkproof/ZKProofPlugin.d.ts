/**
 * ZKProof Plugin - Garaga Integration
 *
 * Enables ZK proof generation and verification for AI agents
 * Critical for Privacy track hackathon prize
 */
import { Plugin, PluginConfig, AgentContext, PluginAction } from '../types';
export interface ZKProofPluginConfig {
    verifierType: 's2' | 'garaga';
    proofExpiration: number;
    backendUrl?: string;
}
export declare class ZKProofPlugin implements Plugin {
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
     * Generate ZK proof for agent identity
     */
    private generateProof;
    /**
     * Verify ZK proof using Garaga verifier
     */
    private verifyProof;
    /**
     * Get proof status (valid/expired)
     */
    private getProofStatus;
    /**
     * Register agent with ZK proof in ZKPassport contract
     */
    private registerAgent;
}
//# sourceMappingURL=ZKProofPlugin.d.ts.map