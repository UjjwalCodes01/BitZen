/**
 * Account Plugin - Session Key Management
 * 
 * Enables autonomous agent operations with time-bounded permissions
 */

import {
  Plugin,
  PluginConfig,
  AgentContext,
  PluginAction,
  ActionResult,
  SessionKey,
  SessionPermissions
} from '../types';
import { Account, ec, stark, CallData, hash } from 'starknet';

export interface AccountPluginConfig {
  sessionKeyExpiration: number; // blocks
  maxDailySpend: string; // wei
  maxTransactionAmount?: string;
  allowedContracts?: string[];
}

export class AccountPlugin implements Plugin {
  name = 'account';
  version = '1.0.0';
  description = 'Session key management and agent task execution';
  
  private config!: AccountPluginConfig;
  private context!: AgentContext;
  private initialized = false;
  private activeSessions: Map<string, SessionKey> = new Map();

  actions: PluginAction[] = [
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

  async initialize(config: PluginConfig, context: AgentContext): Promise<void> {
    this.config = config.config as AccountPluginConfig;
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

  async shutdown(): Promise<void> {
    this.activeSessions.clear();
    this.initialized = false;
    this.context.logger?.info('Account plugin shutdown');
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      // Check backend connectivity
      const response = await fetch(`${this.context.backendUrl}/health`);
      return response.ok;
    } catch (error) {
      this.context.logger?.error('Account plugin health check failed:', error);
      return false;
    }
  }

  /**
   * Create a new session key
   */
  private async createSessionKey(params: any): Promise<ActionResult> {
    const duration = params.duration || this.config.sessionKeyExpiration;
    const permissions = params.permissions || this.getDefaultPermissions();

    try {
      // Generate new key pair
      const privateKey = stark.randomAddress();
      const publicKey = ec.starkCurve.getStarkKey(privateKey);

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + duration;

      const sessionKey: SessionKey = {
        publicKey,
        privateKey,
        agentAddress: this.context.agentAddress,
        expiresAt,
        permissions
      };

      // Register session key with backend
      const response = await fetch(
        `${this.context.backendUrl}/api/v1/agents/${this.context.agentAddress}/sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionPublicKey: publicKey,
            expiresAt,
            permissions
          })
        }
      );

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.message || 'Failed to create session key');
      }

      const result = await response.json() as any;

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
    } catch (error: any) {
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
  private async revokeSessionKey(params: any): Promise<ActionResult> {
    const { sessionPublicKey } = params;

    try {
      // Remove from backend
      const response = await fetch(
        `${this.context.backendUrl}/api/v1/agents/${this.context.agentAddress}/sessions/${sessionPublicKey}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.json() as any;
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
    } catch (error: any) {
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
  private async getSessionInfo(params: any): Promise<ActionResult> {
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
      const response = await fetch(
        `${this.context.backendUrl}/api/v1/agents/${this.context.agentAddress}/sessions`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Session not found');
      }

      const sessions = await response.json() as any;
      const session = sessions.find((s: any) => s.sessionKey === sessionPublicKey);

      if (!session) {
        throw new Error('Session not found');
      }

      return {
        success: true,
        data: session
      };
    } catch (error: any) {
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
  private async listActiveSessions(): Promise<ActionResult> {
    try {
      const response = await fetch(
        `${this.context.backendUrl}/api/v1/agents/${this.context.agentAddress}/sessions`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const sessions = await response.json() as any;

      return {
        success: true,
        data: {
          total: sessions.length,
          sessions: sessions.map((s: any) => ({
            sessionKey: s.sessionKey,
            expiresAt: s.expiresAt,
            isActive: s.isActive,
            permissions: s.permissions
          }))
        }
      };
    } catch (error: any) {
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
  private async executeTask(params: any): Promise<ActionResult> {
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

      // Execute task via backend execute endpoint
      // taskData must contain: contractAddress, entrypoint, and optionally calldata
      const response = await fetch(
        `${this.context.backendUrl}/api/v1/plugins/account/execute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionKey || 'default',
            taskType,
            parameters: {
              contractAddress: taskData.contractAddress,
              entrypoint: taskData.entrypoint,
              calldata: taskData.calldata || [],
              amount: taskData.amount,
              ...taskData,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json() as any;
        throw new Error(errorBody.error || `Backend returned HTTP ${response.status}`);
      }

      const execResult = await response.json() as any;

      this.context.logger?.info('Task executed', { taskType, txHash: execResult.data?.txHash });

      return {
        success: true,
        data: execResult.data,
        txHash: execResult.data?.txHash,
        metadata: {
          executedWith: sessionKey ? 'session-key' : 'main-account',
        },
      };
    } catch (error: any) {
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
  private async setSpendingLimit(params: any): Promise<ActionResult> {
    const { dailyLimit, transactionLimit } = params;

    try {
      // Update via the plugin session-limits endpoint
      // We update the most recent active session's spending limits
      const sessionsResp = await fetch(
        `${this.context.backendUrl}/api/v1/plugins/account/sessions/${this.context.agentAddress}`,
      );
      let targetSessionId: string | null = null;
      if (sessionsResp.ok) {
        const sessionsBody = await sessionsResp.json() as any;
        const sessions: any[] = sessionsBody?.data?.sessions ?? [];
        const active = sessions.find((s: any) => s.status === 'active');
        if (active) targetSessionId = active.sessionId;
      }
      if (!targetSessionId) {
        throw new Error('No active session found to update spending limits');
      }
      const response = await fetch(
        `${this.context.backendUrl}/api/v1/plugins/account/sessions/${targetSessionId}/limit`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dailyLimit,
            transactionLimit
          })
        }
      );

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.message || 'Failed to set spending limits');
      }

      const result = await response.json() as any;

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
    } catch (error: any) {
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
  private async loadActiveSessions(): Promise<void> {
    try {
      const response = await fetch(
        `${this.context.backendUrl}/api/v1/agents/${this.context.agentAddress}/sessions`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const sessions = await response.json() as any;
        this.context.logger?.info(`Loaded ${sessions.length} active sessions`);
      }
    } catch (error) {
      this.context.logger?.warn('Could not load active sessions:', error);
    }
  }

  /**
   * Get default session permissions
   */
  private getDefaultPermissions(): SessionPermissions {
    return {
      canExecuteTasks: true,
      canMakeSwaps: true,
      canStake: true,
      maxDailySpend: this.config.maxDailySpend,
      maxTransactionAmount: this.config.maxTransactionAmount!
    };
  }
}
