"use strict";
/**
 * Account Plugin - Session Key Management
 *
 * Enables autonomous agent operations with time-bounded permissions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountPlugin = void 0;
const starknet_1 = require("starknet");
class AccountPlugin {
    constructor() {
        this.name = 'account';
        this.version = '1.0.0';
        this.description = 'Session key management and agent task execution';
        this.initialized = false;
        this.activeSessions = new Map();
        this.actions = [
            {
                name: 'createSessionKey',
                description: 'Generate time-bounded session key for agent operations',
                parameters: [
                    {
                        name: 'duration',
                        type: 'number',
                        required: false,
                        description: 'Session duration in seconds (default: config value)'
                    },
                    {
                        name: 'permissions',
                        type: 'object',
                        required: false,
                        description: 'Session permissions (tasks, swaps, staking, spending limits)'
                    }
                ],
                execute: this.createSessionKey.bind(this)
            },
            {
                name: 'revokeSessionKey',
                description: 'Revoke an active session key',
                parameters: [
                    {
                        name: 'sessionPublicKey',
                        type: 'string',
                        required: true,
                        description: 'Public key of session to revoke'
                    }
                ],
                execute: this.revokeSessionKey.bind(this)
            },
            {
                name: 'getSessionInfo',
                description: 'Get information about an active session',
                parameters: [
                    {
                        name: 'sessionPublicKey',
                        type: 'string',
                        required: true,
                        description: 'Public key of session'
                    }
                ],
                execute: this.getSessionInfo.bind(this)
            },
            {
                name: 'listActiveSessions',
                description: 'List all active session keys for agent',
                parameters: [],
                execute: this.listActiveSessions.bind(this)
            },
            {
                name: 'executeTask',
                description: 'Execute a task using session key',
                parameters: [
                    {
                        name: 'taskType',
                        type: 'string',
                        required: true,
                        description: 'Type of task to execute'
                    },
                    {
                        name: 'taskData',
                        type: 'object',
                        required: true,
                        description: 'Task execution data'
                    },
                    {
                        name: 'sessionKey',
                        type: 'string',
                        required: false,
                        description: 'Session key to use (optional)'
                    }
                ],
                execute: this.executeTask.bind(this)
            },
            {
                name: 'setSpendingLimit',
                description: 'Update spending limits for agent account',
                parameters: [
                    {
                        name: 'dailyLimit',
                        type: 'string',
                        required: true,
                        description: 'Daily spending limit in wei'
                    },
                    {
                        name: 'transactionLimit',
                        type: 'string',
                        required: true,
                        description: 'Per-transaction limit in wei'
                    }
                ],
                execute: this.setSpendingLimit.bind(this)
            }
        ];
    }
    async initialize(config, context) {
        this.config = config.config;
        this.context = context;
        // Set defaults
        this.config.maxTransactionAmount = this.config.maxTransactionAmount ||
            (BigInt(this.config.maxDailySpend) / BigInt(10)).toString();
        context.logger?.info('Account plugin initialized', {
            sessionKeyExpiration: this.config.sessionKeyExpiration,
            maxDailySpend: this.config.maxDailySpend
        });
        // Load active sessions from backend
        await this.loadActiveSessions();
        this.initialized = true;
    }
    async shutdown() {
        this.activeSessions.clear();
        this.initialized = false;
        this.context.logger?.info('Account plugin shutdown');
    }
    async healthCheck() {
        if (!this.initialized)
            return false;
        try {
            // Check backend connectivity
            const response = await fetch(`${this.context.backendUrl}/health`);
            return response.ok;
        }
        catch (error) {
            this.context.logger?.error('Account plugin health check failed:', error);
            return false;
        }
    }
    /**
     * Create a new session key
     */
    async createSessionKey(params) {
        const duration = params.duration || this.config.sessionKeyExpiration;
        const permissions = params.permissions || this.getDefaultPermissions();
        try {
            // Generate new key pair
            const privateKey = starknet_1.stark.randomAddress();
            const publicKey = starknet_1.ec.starkCurve.getStarkKey(privateKey);
            const now = Math.floor(Date.now() / 1000);
            const expiresAt = now + duration;
            const sessionKey = {
                publicKey,
                privateKey,
                agentAddress: this.context.agentAddress,
                expiresAt,
                permissions
            };
            // Register session key with backend
            const response = await fetch(`${this.context.backendUrl}/api/v1/agents/${this.context.agentAddress}/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionPublicKey: publicKey,
                    expiresAt,
                    permissions
                })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create session key');
            }
            const result = await response.json();
            // Store session locally
            this.activeSessions.set(publicKey, sessionKey);
            this.context.logger?.info('Session key created', {
                publicKey: publicKey.substring(0, 20) + '...',
                expiresAt: new Date(expiresAt * 1000).toISOString()
            });
            return {
                success: true,
                data: {
                    sessionPublicKey: publicKey,
                    agentAddress: this.context.agentAddress,
                    expiresAt,
                    permissions,
                    sessionId: result.id
                },
                txHash: result.txHash,
                metadata: {
                    validUntil: new Date(expiresAt * 1000).toISOString(),
                    createdAt: new Date(now * 1000).toISOString()
                }
            };
        }
        catch (error) {
            this.context.logger?.error('Failed to create session key:', error);
            return {
                success: false,
                error: error.message || 'Unknown error creating session key'
            };
        }
    }
    /**
     * Revoke a session key
     */
    async revokeSessionKey(params) {
        const { sessionPublicKey } = params;
        try {
            // Remove from backend
            const response = await fetch(`${this.context.backendUrl}/api/v1/agents/${this.context.agentAddress}/sessions/${sessionPublicKey}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to revoke session key');
            }
            // Remove from local cache
            this.activeSessions.delete(sessionPublicKey);
            this.context.logger?.info('Session key revoked', { sessionPublicKey });
            return {
                success: true,
                data: {
                    sessionPublicKey,
                    status: 'revoked'
                }
            };
        }
        catch (error) {
            this.context.logger?.error('Failed to revoke session key:', error);
            return {
                success: false,
                error: error.message || 'Unknown error revoking session key'
            };
        }
    }
    /**
     * Get session information
     */
    async getSessionInfo(params) {
        const { sessionPublicKey } = params;
        try {
            // Check local cache first
            const localSession = this.activeSessions.get(sessionPublicKey);
            if (localSession) {
                const now = Math.floor(Date.now() / 1000);
                const isActive = now < localSession.expiresAt;
                return {
                    success: true,
                    data: {
                        sessionPublicKey,
                        agentAddress: localSession.agentAddress,
                        expiresAt: localSession.expiresAt,
                        permissions: localSession.permissions,
                        isActive,
                        remainingTime: Math.max(0, localSession.expiresAt - now)
                    }
                };
            }
            // Query backend
            const response = await fetch(`${this.context.backendUrl}/api/v1/agents/${this.context.agentAddress}/sessions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Session not found');
            }
            const sessions = await response.json();
            const session = sessions.find((s) => s.sessionKey === sessionPublicKey);
            if (!session) {
                throw new Error('Session not found');
            }
            return {
                success: true,
                data: session
            };
        }
        catch (error) {
            this.context.logger?.error('Failed to get session info:', error);
            return {
                success: false,
                error: error.message || 'Unknown error getting session info'
            };
        }
    }
    /**
     * List all active sessions
     */
    async listActiveSessions() {
        try {
            const response = await fetch(`${this.context.backendUrl}/api/v1/agents/${this.context.agentAddress}/sessions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch sessions');
            }
            const sessions = await response.json();
            return {
                success: true,
                data: {
                    total: sessions.length,
                    sessions: sessions.map((s) => ({
                        sessionKey: s.sessionKey,
                        expiresAt: s.expiresAt,
                        isActive: s.isActive,
                        permissions: s.permissions
                    }))
                }
            };
        }
        catch (error) {
            this.context.logger?.error('Failed to list sessions:', error);
            return {
                success: false,
                error: error.message || 'Unknown error listing sessions'
            };
        }
    }
    /**
     * Execute a task using session key
     */
    async executeTask(params) {
        const { taskType, taskData, sessionKey } = params;
        try {
            // Validate session key if provided
            if (sessionKey) {
                const session = this.activeSessions.get(sessionKey);
                if (!session) {
                    throw new Error('Invalid or expired session key');
                }
                const now = Math.floor(Date.now() / 1000);
                if (now >= session.expiresAt) {
                    throw new Error('Session key has expired');
                }
                // Check permissions
                if (taskType === 'swap' && !session.permissions.canMakeSwaps) {
                    throw new Error('Session does not have swap permissions');
                }
                if (taskType === 'stake' && !session.permissions.canStake) {
                    throw new Error('Session does not have staking permissions');
                }
            }
            // Execute task (simplified for demo)
            const taskResult = {
                taskType,
                status: 'executed',
                data: taskData,
                executedAt: new Date().toISOString(),
                sessionKey: sessionKey || 'default'
            };
            this.context.logger?.info('Task executed', { taskType, sessionKey });
            return {
                success: true,
                data: taskResult,
                metadata: {
                    executedWith: sessionKey ? 'session-key' : 'main-account'
                }
            };
        }
        catch (error) {
            this.context.logger?.error('Failed to execute task:', error);
            return {
                success: false,
                error: error.message || 'Unknown error executing task'
            };
        }
    }
    /**
     * Set spending limits
     */
    async setSpendingLimit(params) {
        const { dailyLimit, transactionLimit } = params;
        try {
            // Update via backend API
            const response = await fetch(`${this.context.backendUrl}/api/v1/agents/${this.context.agentAddress}/spending-limits`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dailyLimit,
                    transactionLimit
                })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to set spending limits');
            }
            const result = await response.json();
            this.context.logger?.info('Spending limits updated', {
                dailyLimit,
                transactionLimit
            });
            return {
                success: true,
                data: {
                    dailyLimit,
                    transactionLimit,
                    updatedAt: new Date().toISOString()
                },
                txHash: result.txHash
            };
        }
        catch (error) {
            this.context.logger?.error('Failed to set spending limits:', error);
            return {
                success: false,
                error: error.message || 'Unknown error setting spending limits'
            };
        }
    }
    /**
     * Load active sessions from backend
     */
    async loadActiveSessions() {
        try {
            const response = await fetch(`${this.context.backendUrl}/api/v1/agents/${this.context.agentAddress}/sessions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const sessions = await response.json();
                this.context.logger?.info(`Loaded ${sessions.length} active sessions`);
            }
        }
        catch (error) {
            this.context.logger?.warn('Could not load active sessions:', error);
        }
    }
    /**
     * Get default session permissions
     */
    getDefaultPermissions() {
        return {
            canExecuteTasks: true,
            canMakeSwaps: true,
            canStake: true,
            maxDailySpend: this.config.maxDailySpend,
            maxTransactionAmount: this.config.maxTransactionAmount
        };
    }
}
exports.AccountPlugin = AccountPlugin;
//# sourceMappingURL=AccountPlugin.js.map