/**
 * Account Plugin - Session Key Management
 *
 * Enables autonomous agent operations with time-bounded permissions
 */
import { Plugin, PluginConfig, AgentContext, PluginAction } from '../types';
export interface AccountPluginConfig {
    sessionKeyExpiration: number;
    maxDailySpend: string;
    maxTransactionAmount?: string;
    allowedContracts?: string[];
}
export declare class AccountPlugin implements Plugin {
    name: string;
    version: string;
    description: string;
    private config;
    private context;
    private initialized;
    private activeSessions;
    actions: PluginAction[];
    initialize(config: PluginConfig, context: AgentContext): Promise<void>;
    shutdown(): Promise<void>;
    healthCheck(): Promise<boolean>;
    /**
     * Create a new session key
     */
    private createSessionKey;
    /**
     * Revoke a session key
     */
    private revokeSessionKey;
    /**
     * Get session information
     */
    private getSessionInfo;
    /**
     * List all active sessions
     */
    private listActiveSessions;
    /**
     * Execute a task using session key
     */
    private executeTask;
    /**
     * Set spending limits
     */
    private setSpendingLimit;
    /**
     * Load active sessions from backend
     */
    private loadActiveSessions;
    /**
     * Get default session permissions
     */
    private getDefaultPermissions;
}
//# sourceMappingURL=AccountPlugin.d.ts.map