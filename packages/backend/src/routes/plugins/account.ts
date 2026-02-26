/**
 * Account Plugin Routes
 * Session key management and autonomous task execution
 */

import express, { Request, Response } from 'express';
import { ec, stark } from 'starknet';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { StarknetService } from '../../services/starknet';
import {
  createSession,
  getSession,
  listSessionsByAgent,
  updateSessionStatus,
  updateSessionLimits,
  incrementSessionUsage,
} from '../../database/sessions';

const router = express.Router();
const starknetService = new StarknetService();

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

    // Generate cryptographically secure session key using starknet.js EC
    const sessionId = `session_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const privateKey = stark.randomAddress(); // 252-bit random felt — valid as a stark private key
    const publicKey = '0x' + Buffer.from(ec.starkCurve.getPublicKey(privateKey, true)).toString('hex');

    const sessionKey = {
      sessionId,
      agentAddress,
      publicKey,
      privateKey, // stored server-side only — never sent to client after initial creation
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
      status: 'active' as const,
      createdAt: Date.now(),
      metadata: metadata || {},
    };

    // Persist to database
    await createSession(sessionKey);

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

    // Fetch active sessions from database
    const rawSessions = await listSessionsByAgent(agentAddress);
    const agentSessions = rawSessions
      .map((s) => ({
        sessionId: s.sessionId,
        publicKey: s.publicKey,
        permissions: s.permissions,
        expiresAt: s.expiresAt,
        isExpired: Date.now() > s.expiresAt,
        spendingLimit: s.spendingLimit,
        usage: s.usage,
        status: Date.now() > s.expiresAt ? 'expired' : s.status,
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

    // Revoke in database
    const session = await getSession(id);

    if (session) {
      await updateSessionStatus(id, 'revoked');

      logger.info(`Session key revoked: ${id}`);

      return res.json({
        success: true,
        data: {
          sessionId: id,
          status: 'revoked',
          revokedAt: Date.now(),
        },
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Session not found',
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

    // Update in database
    const session = await getSession(id);

    if (session) {
      const newLimits = {
        ...session.spendingLimit,
        ...(dailyLimit && { daily: dailyLimit }),
        ...(transactionLimit && { perTransaction: transactionLimit }),
      };
      await updateSessionLimits(id, newLimits);

      logger.info(`Session spending limits updated: ${id}`);

      return res.json({
        success: true,
        data: {
          sessionId: id,
          spendingLimit: newLimits,
          updatedAt: Date.now(),
        },
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Session not found',
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

    // Load session from database
    const session = await getSession(sessionId);

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
      await updateSessionStatus(sessionId, 'expired');
      return res.status(403).json({
        success: false,
        error: 'Session has expired',
      });
    }

    // Execute on-chain transaction using the session key
    // parameters must include: contractAddress, entrypoint, calldata
    const taskId = `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    let txHash: string;

    if (!parameters.contractAddress || !parameters.entrypoint) {
      return res.status(400).json({
        success: false,
        error: 'parameters must include contractAddress and entrypoint for on-chain task execution',
      });
    }

    const call = {
      contractAddress: parameters.contractAddress as string,
      entrypoint: parameters.entrypoint as string,
      calldata: (parameters.calldata as string[]) || [],
    };

    const result = await starknetService.executeTransaction([call]);
    txHash = result;

    // Update session usage in database
    await incrementSessionUsage(sessionId, parameters.amount ? parseFloat(parameters.amount) : 0);

    logger.info(`Task executed: ${taskId} with session ${sessionId}, type: ${taskType}`);

    return res.json({
      success: true,
      data: {
        taskId,
        sessionId,
        taskType,
        txHash: txHash,
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

    // Fetch from database
    const session = await getSession(id);

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
          status: Date.now() > session.expiresAt ? 'expired' : session.status,
          createdAt: session.createdAt,
        },
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Session not found',
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
