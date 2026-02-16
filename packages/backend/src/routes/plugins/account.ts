/**
 * Account Plugin Routes
 * Session key management and autonomous task execution
 */

import express, { Request, Response } from 'express';
import { logger } from '../../utils/logger';

const router = express.Router();

// In-memory storage for session keys (in production, use database)
const sessionStore = new Map<string, any>();

/**
 * POST /api/v1/plugins/account/session
 * Create session key with permissions and spending limits
 */
router.post('/session', async (req: Request, res: Response) => {
  try {
    const { agentAddress, expirationBlocks, permissions, metadata } = req.body;

    if (!agentAddress || !expirationBlocks || !permissions) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentAddress, expirationBlocks, permissions',
      });
    }

    // Validate permissions array
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Permissions must be a non-empty array',
      });
    }

    // Generate session key ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock session key generation
    // In production, this would:
    // 1. Generate session keypair
    // 2. Register session key on-chain with Account Abstraction
    // 3. Set permission policies and spending limits
    const sessionKey = {
      sessionId,
      agentAddress,
      publicKey: `0x${Math.random().toString(16).substr(2, 64)}`,
      privateKey: `0x${Math.random().toString(16).substr(2, 64)}`, // Never expose in production!
      permissions,
      expirationBlocks,
      expiresAt: Date.now() + (expirationBlocks * 180000), // ~3min per block
      spendingLimit: {
        daily: metadata?.dailyLimit || '1000',
        perTransaction: metadata?.transactionLimit || '100',
        currency: 'STRK',
      },
      usage: {
        totalSpent: '0',
        transactionCount: 0,
        lastUsed: null,
      },
      status: 'active',
      createdAt: Date.now(),
      metadata: metadata || {},
    };

    // Store session key
    sessionStore.set(sessionId, sessionKey);

    logger.info(`Session key created: ${sessionId} for agent ${agentAddress}`);

    return res.json({
      success: true,
      data: {
        sessionId: sessionKey.sessionId,
        publicKey: sessionKey.publicKey,
        permissions: sessionKey.permissions,
        expirationBlocks: sessionKey.expirationBlocks,
        expiresAt: sessionKey.expiresAt,
        spendingLimit: sessionKey.spendingLimit,
        status: sessionKey.status,
        createdAt: sessionKey.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('Create session key error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create session key',
    });
  }
});

/**
 * GET /api/v1/plugins/account/sessions/:agentAddress
 * List all active session keys for an agent
 */
router.get('/sessions/:agentAddress', async (req: Request, res: Response) => {
  try {
    const { agentAddress } = req.params;

    if (!agentAddress) {
      return res.status(400).json({
        success: false,
        error: 'Agent address required',
      });
    }

    // Filter sessions by agent address
    const agentSessions = Array.from(sessionStore.values())
      .filter((s) => s.agentAddress === agentAddress && s.status === 'active')
      .map((s) => ({
        sessionId: s.sessionId,
        publicKey: s.publicKey,
        permissions: s.permissions,
        expiresAt: s.expiresAt,
        isExpired: Date.now() > s.expiresAt,
        spendingLimit: s.spendingLimit,
        usage: s.usage,
        status: s.status,
        createdAt: s.createdAt,
      }));

    logger.info(`Retrieved ${agentSessions.length} sessions for agent ${agentAddress}`);

    return res.json({
      success: true,
      data: {
        agentAddress,
        sessions: agentSessions,
        count: agentSessions.length,
      },
    });
  } catch (error: any) {
    logger.error('List sessions error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to list sessions',
    });
  }
});

/**
 * POST /api/v1/plugins/account/sessions/:id/revoke
 * Revoke a session key
 */
router.post('/sessions/:id/revoke', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required',
      });
    }

    // Get session from store
    const session = sessionStore.get(id);

    if (session) {
      // Update status to revoked
      session.status = 'revoked';
      session.revokedAt = Date.now();
      sessionStore.set(id, session);

      logger.info(`Session key revoked: ${id}`);

      return res.json({
        success: true,
        data: {
          sessionId: id,
          status: 'revoked',
          revokedAt: session.revokedAt,
        },
      });
    }

    // Mock revocation for unknown sessions
    logger.info(`Mock session key revocation: ${id}`);

    return res.json({
      success: true,
      data: {
        sessionId: id,
        status: 'revoked',
        revokedAt: Date.now(),
        isMock: true,
      },
    });
  } catch (error: any) {
    logger.error('Revoke session error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to revoke session',
    });
  }
});

/**
 * PATCH /api/v1/plugins/account/sessions/:id/limit
 * Update spending limits for a session key
 */
router.patch('/sessions/:id/limit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dailyLimit, transactionLimit } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required',
      });
    }

    if (!dailyLimit && !transactionLimit) {
      return res.status(400).json({
        success: false,
        error: 'At least one limit must be provided',
      });
    }

    // Get session from store
    const session = sessionStore.get(id);

    if (session) {
      // Update spending limits
      if (dailyLimit) session.spendingLimit.daily = dailyLimit;
      if (transactionLimit) session.spendingLimit.perTransaction = transactionLimit;
      session.updatedAt = Date.now();
      sessionStore.set(id, session);

      logger.info(`Session spending limits updated: ${id}`);

      return res.json({
        success: true,
        data: {
          sessionId: id,
          spendingLimit: session.spendingLimit,
          updatedAt: session.updatedAt,
        },
      });
    }

    // Mock update for unknown sessions
    logger.info(`Mock session limit update: ${id}`);

    return res.json({
      success: true,
      data: {
        sessionId: id,
        spendingLimit: {
          daily: dailyLimit || '1000',
          perTransaction: transactionLimit || '100',
          currency: 'STRK',
        },
        updatedAt: Date.now(),
        isMock: true,
      },
    });
  } catch (error: any) {
    logger.error('Update session limit error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update spending limit',
    });
  }
});

/**
 * POST /api/v1/plugins/account/execute
 * Execute autonomous task with session key
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { sessionId, taskType, parameters } = req.body;

    if (!sessionId || !taskType || !parameters) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, taskType, parameters',
      });
    }

    // Get session from store
    const session = sessionStore.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Check if session is active
    if (session.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Session is ${session.status}`,
      });
    }

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      session.status = 'expired';
      sessionStore.set(sessionId, session);
      return res.status(403).json({
        success: false,
        error: 'Session has expired',
      });
    }

    // Mock task execution
    // In production, this would:
    // 1. Validate permissions
    // 2. Check spending limits
    // 3. Execute transaction with session key
    // 4. Update usage statistics
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    // Update session usage
    session.usage.transactionCount += 1;
    session.usage.lastUsed = Date.now();
    if (parameters.amount) {
      const currentSpent = parseFloat(session.usage.totalSpent);
      session.usage.totalSpent = (currentSpent + parseFloat(parameters.amount)).toString();
    }
    sessionStore.set(sessionId, session);

    logger.info(`Task executed: ${taskId} with session ${sessionId}, type: ${taskType}`);

    return res.json({
      success: true,
      data: {
        taskId,
        sessionId,
        taskType,
        txHash: mockTxHash,
        status: 'success',
        executedAt: Date.now(),
        result: parameters,
      },
    });
  } catch (error: any) {
    logger.error('Execute task error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute task',
    });
  }
});

/**
 * GET /api/v1/plugins/account/session/:id
 * Get session key details
 */
router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required',
      });
    }

    // Get session from store
    const session = sessionStore.get(id);

    if (session) {
      logger.info(`Session details retrieved: ${id}`);

      return res.json({
        success: true,
        data: {
          sessionId: session.sessionId,
          agentAddress: session.agentAddress,
          publicKey: session.publicKey,
          permissions: session.permissions,
          expiresAt: session.expiresAt,
          isExpired: Date.now() > session.expiresAt,
          spendingLimit: session.spendingLimit,
          usage: session.usage,
          status: session.status,
          createdAt: session.createdAt,
        },
      });
    }

    // Mock session details
    return res.json({
      success: true,
      data: {
        sessionId: id,
        agentAddress: null,
        status: 'unknown',
        isMock: true,
      },
    });
  } catch (error: any) {
    logger.error('Get session details error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get session details',
    });
  }
});

export default router;
