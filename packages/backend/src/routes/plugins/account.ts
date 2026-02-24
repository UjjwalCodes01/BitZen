/**
 * Account Plugin Routes
 * Session key management and autonomous task execution
 * Sessions persisted to Supabase (agent_sessions table)
 */

import express, { Request, Response } from 'express';
import { pool } from '../../database/pool';
import { logger } from '../../utils/logger';

const router = express.Router();

// ─── DB helpers ────────────────────────────────────────────────────────────────

async function dbCreateSession(data: {
  agentAddress: string;
  sessionId: string;
  publicKey: string;
  expirationBlocks: number;
  maxSpend: string;
  permissions: string[];
  metadata: Record<string, any>;
  status: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO agent_sessions
       (agent_address, session_key, expiration_block, max_spend, tx_hash, permissions, metadata, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      data.agentAddress,
      data.sessionId,
      data.expirationBlocks,
      parseFloat(data.maxSpend) || 100,
      null,
      JSON.stringify(data.permissions),
      JSON.stringify(data.metadata),
      data.status,
    ],
  );
}

async function dbGetSession(sessionId: string): Promise<any | null> {
  const result = await pool.query(
    `SELECT * FROM agent_sessions WHERE session_key = $1 LIMIT 1`,
    [sessionId],
  );
  return result.rows[0] || null;
}

async function dbGetAgentSessions(agentAddress: string): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM agent_sessions
     WHERE agent_address = $1 AND status = 'active'
     ORDER BY created_at DESC`,
    [agentAddress],
  );
  return result.rows;
}

async function dbUpdateSessionStatus(sessionId: string, status: string): Promise<void> {
  await pool.query(
    `UPDATE agent_sessions SET status = $1 WHERE session_key = $2`,
    [status, sessionId],
  );
}

async function dbUpdateSessionLimits(
  sessionId: string,
  dailyLimit?: string,
  txLimit?: string,
): Promise<void> {
  await pool.query(
    `UPDATE agent_sessions
     SET metadata = COALESCE(metadata, '{}')::jsonb
       || jsonb_build_object(
            'dailyLimit', COALESCE($2::text, (metadata->>'dailyLimit')),
            'transactionLimit', COALESCE($3::text, (metadata->>'transactionLimit'))
          )
     WHERE session_key = $1`,
    [sessionId, dailyLimit || null, txLimit || null],
  );
}

async function dbIncrementUsage(sessionId: string, amount?: string): Promise<void> {
  await pool.query(
    `UPDATE agent_sessions
     SET metadata = COALESCE(metadata, '{}')::jsonb
       || jsonb_build_object(
            'transactionCount',
              (COALESCE((metadata->>'transactionCount')::int, 0) + 1),
            'totalSpent',
              (COALESCE((metadata->>'totalSpent')::numeric, 0) + $2)::text,
            'lastUsed', extract(epoch from now())::text
          )
     WHERE session_key = $1`,
    [sessionId, parseFloat(amount || '0')],
  );
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/plugins/account/session
 */
const createSessionHandler = async (req: Request, res: Response) => {
  try {
    const { agentAddress, expirationBlocks, permissions, metadata } = req.body;

    if (!agentAddress || !expirationBlocks || !permissions) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentAddress, expirationBlocks, permissions',
      });
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Permissions must be a non-empty array',
      });
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const publicKey = `0x${Buffer.from(sessionId).toString('hex').padStart(64, '0').slice(0, 64)}`;
    const maxSpend = metadata?.transactionLimit || '100';
    const expiresAt = Date.now() + expirationBlocks * 180000;

    await dbCreateSession({
      agentAddress,
      sessionId,
      publicKey,
      expirationBlocks,
      maxSpend,
      permissions,
      metadata: {
        ...(metadata || {}),
        publicKey,
        expiresAt,
        dailyLimit: metadata?.dailyLimit || '1000',
        transactionLimit: maxSpend,
        totalSpent: '0',
        transactionCount: 0,
        lastUsed: null,
      },
      status: 'active',
    });

    logger.info(`Session key created (DB): ${sessionId} for agent ${agentAddress}`);

    return res.json({
      success: true,
      data: {
        sessionId,
        publicKey,
        permissions,
        expirationBlocks,
        expiresAt,
        spendingLimit: {
          daily: metadata?.dailyLimit || '1000',
          perTransaction: maxSpend,
          currency: 'STRK',
        },
        status: 'active',
        createdAt: Date.now(),
      },
    });
  } catch (error: any) {
    logger.error('Create session key error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create session key',
    });
  }
};
router.post('/session', createSessionHandler);

/**
 * GET /api/v1/plugins/account/sessions/:agentAddress
 */
router.get('/sessions/:agentAddress', async (req: Request, res: Response) => {
  try {
    const { agentAddress } = req.params;

    if (!agentAddress) {
      return res.status(400).json({ success: false, error: 'Agent address required' });
    }

    const rows = await dbGetAgentSessions(agentAddress);

    const sessions = rows.map((row) => {
      const meta = row.metadata || {};
      const expiresAt = meta.expiresAt || Date.now();
      return {
        sessionId: row.session_key,
        publicKey: meta.publicKey || row.session_key,
        permissions: row.permissions || [],
        expiresAt,
        isExpired: Date.now() > expiresAt,
        spendingLimit: {
          daily: meta.dailyLimit || '1000',
          perTransaction: meta.transactionLimit || '100',
          currency: 'STRK',
        },
        usage: {
          totalSpent: meta.totalSpent || '0',
          transactionCount: meta.transactionCount || 0,
          lastUsed: meta.lastUsed || null,
        },
        status: row.status,
        createdAt: row.created_at,
      };
    });

    return res.json({
      success: true,
      data: { agentAddress, sessions, count: sessions.length },
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
 */
router.post('/sessions/:id/revoke', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Session ID required' });
    }

    await dbUpdateSessionStatus(id, 'revoked');

    logger.info(`Session key revoked (DB): ${id}`);

    return res.json({
      success: true,
      data: { sessionId: id, status: 'revoked', revokedAt: Date.now() },
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
 */
router.patch('/sessions/:id/limit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dailyLimit, transactionLimit } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Session ID required' });
    }

    if (!dailyLimit && !transactionLimit) {
      return res.status(400).json({
        success: false,
        error: 'At least one limit must be provided',
      });
    }

    await dbUpdateSessionLimits(id, dailyLimit, transactionLimit);

    logger.info(`Session spending limits updated (DB): ${id}`);

    return res.json({
      success: true,
      data: {
        sessionId: id,
        spendingLimit: {
          daily: dailyLimit || 'unchanged',
          perTransaction: transactionLimit || 'unchanged',
          currency: 'STRK',
        },
        updatedAt: Date.now(),
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
 */
const executeTaskHandler = async (req: Request, res: Response) => {
  try {
    const { sessionId, taskType, parameters } = req.body;

    if (!sessionId || !taskType || !parameters) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, taskType, parameters',
      });
    }

    const session = await dbGetSession(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(403).json({ success: false, error: `Session is ${session.status}` });
    }

    const meta = session.metadata || {};
    const expiresAt = meta.expiresAt || 0;
    if (Date.now() > expiresAt) {
      await dbUpdateSessionStatus(sessionId, 'expired');
      return res.status(403).json({ success: false, error: 'Session has expired' });
    }

    await dbIncrementUsage(sessionId, parameters?.amount);

    await pool.query(
      `INSERT INTO task_logs (agent_address, task_type, task_data, status) VALUES ($1, $2, $3, $4)`,
      [session.agent_address, taskType, JSON.stringify(parameters), 'success'],
    );

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockTxHash = `0x${Buffer.from(taskId).toString('hex').padStart(64, '0').slice(0, 64)}`;

    logger.info(`Task executed (DB): ${taskId} with session ${sessionId}, type: ${taskType}`);

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
};
router.post('/execute', executeTaskHandler);

/**
 * GET /api/v1/plugins/account/session/:id
 */
router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Session ID required' });
    }

    const session = await dbGetSession(id);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const meta = session.metadata || {};
    const expiresAt = meta.expiresAt || Date.now();

    return res.json({
      success: true,
      data: {
        sessionId: session.session_key,
        agentAddress: session.agent_address,
        publicKey: meta.publicKey || session.session_key,
        permissions: session.permissions || [],
        expiresAt,
        isExpired: Date.now() > expiresAt,
        spendingLimit: {
          daily: meta.dailyLimit || '1000',
          perTransaction: meta.transactionLimit || '100',
          currency: 'STRK',
        },
        usage: {
          totalSpent: meta.totalSpent || '0',
          transactionCount: meta.transactionCount || 0,
          lastUsed: meta.lastUsed || null,
        },
        status: session.status,
        createdAt: session.created_at,
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

// ─── Frontend-compatible alias routes ──────────────────────────────────────────
// pluginService.ts calls these paths; alias them to the canonical handlers above

/**
 * POST /api/v1/plugins/account/session/create  (alias → /session)
 */
router.post('/session/create', createSessionHandler);

/**
 * POST /api/v1/plugins/account/session/:id/revoke  (alias → /sessions/:id/revoke)
 */
router.post('/session/:id/revoke', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Session ID required' });
    }
    await dbUpdateSessionStatus(id, 'revoked');
    logger.info(`Session key revoked (alias): ${id}`);
    return res.json({
      success: true,
      data: { sessionId: id, status: 'revoked', revokedAt: Date.now() },
    });
  } catch (error: any) {
    logger.error('Revoke session (alias) error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to revoke session' });
  }
});

/**
 * POST /api/v1/plugins/account/task  (alias → /execute)
 * Frontend pluginService sends { sessionId, taskType, parameters }
 */
router.post('/task', executeTaskHandler);

/**
 * POST /api/v1/plugins/account/spending-limits
 * Frontend sends { dailyLimit, transactionLimit, agentAddress }
 * We update ALL active sessions for that agent.
 */
router.post('/spending-limits', async (req: Request, res: Response) => {
  try {
    const { dailyLimit, transactionLimit, agentAddress } = req.body;

    if (!agentAddress) {
      return res.status(400).json({ success: false, error: 'agentAddress required' });
    }
    if (!dailyLimit && !transactionLimit) {
      return res.status(400).json({ success: false, error: 'At least one limit must be provided' });
    }

    // Update all active sessions for this agent
    const rows = await dbGetAgentSessions(agentAddress);
    for (const row of rows) {
      await dbUpdateSessionLimits(row.session_key, dailyLimit, transactionLimit);
    }

    logger.info(`Spending limits updated for agent ${agentAddress}: daily=${dailyLimit}, tx=${transactionLimit}`);

    return res.json({
      success: true,
      data: {
        agentAddress,
        spendingLimit: {
          daily: dailyLimit || 'unchanged',
          perTransaction: transactionLimit || 'unchanged',
          currency: 'STRK',
        },
        sessionsUpdated: rows.length,
        updatedAt: Date.now(),
      },
    });
  } catch (error: any) {
    logger.error('Set spending limits error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to set spending limits' });
  }
});

export default router;
