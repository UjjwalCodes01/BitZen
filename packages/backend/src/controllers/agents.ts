import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { starknetService } from '../services/starknet';
import { AgentService } from '../services/agent';
import { ec, stark } from 'starknet';
import crypto from 'crypto';
import {
  createSession as createPluginSession,
  listSessionsByAgent,
} from '../database/sessions';
import { logger } from '../utils/logger';

const agentService = new AgentService();

export class AgentController {
  /**
   * Register a new agent with ZK proof
   * POST /api/v1/agents/register
   */
  registerAgent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    // Support both frontend format (publicKey, zkProof) and backend format (proof_data, public_inputs)
    const { address, name, description, capabilities, publicKey, zkProof, proof_data, public_inputs } = req.body;

    logger.info(`Registering agent: ${address}`);

    // Convert frontend format to backend format if needed
    const proofData = proof_data || (zkProof ? (Array.isArray(zkProof) ? zkProof : [zkProof]) : []);
    const publicInputs = public_inputs || (publicKey ? [address, publicKey] : [address]);

    // Attempt on-chain registration if proof data is present
    let txHash: string | null = null;
    let onChainError: string | null = null;

    if (proofData && proofData.length > 0) {
      try {
        txHash = await starknetService.registerAgent(address, proofData, publicInputs);
      } catch (err: any) {
        onChainError = err.message || 'On-chain registration failed';
        logger.warn(`On-chain agent registration failed (saving to DB anyway): ${onChainError}`);
      }
    } else {
      onChainError = 'No proof data provided — registered in database only';
      logger.info(`Agent ${address} registered without ZK proof (DB-only)`);
    }

    // Save agent to database regardless — handle duplicate gracefully
    let agent;
    try {
      agent = await agentService.createAgent({
        address,
        name: name || undefined,
        description: description || undefined,
        capabilities: capabilities || [],
        tx_hash: txHash || 'pending',
        registered_at: new Date(),
        is_verified: false
      });
    } catch (dbError: any) {
      // Unique constraint violation — agent already exists
      if (dbError.code === '23505' || dbError.message?.includes('duplicate')) {
        const existing = await agentService.getAgentByAddress(address);
        res.status(200).json({
          success: true,
          message: 'Agent already registered',
          data: {
            agent: existing,
            tx_hash: existing?.tx_hash || txHash,
            on_chain_error: onChainError,
          }
        });
        return;
      }
      throw dbError;
    }

    res.status(201).json({
      success: true,
      message: txHash
        ? 'Agent registration initiated on-chain'
        : 'Agent registered in database (on-chain pending — generate ZK proof to complete)',
      data: {
        agent,
        tx_hash: txHash,
        on_chain_error: onChainError,
      }
    });
  });

  /**
   * Get agent details
   * GET /api/v1/agents/:address
   */
  getAgent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { address } = req.params;

    // Get agent from database
    const agent = await agentService.getAgentByAddress(address);

    if (!agent) {
      throw new AppError('Agent not found', 404);
    }

    // Get on-chain info
    const onChainInfo = await starknetService.getAgentInfo(address);

    res.status(200).json({
      success: true,
      data: {
        ...agent,
        on_chain: onChainInfo
      }
    });
  });

  /**
   * Get all agents
   * GET /api/v1/agents
   */
  getAllAgents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const agents = await agentService.getAllAgents(page, limit);

    res.status(200).json({
      success: true,
      data: agents
    });
  });

  /**
   * Revoke agent
   * DELETE /api/v1/agents/:address
   */
  revokeAgent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { address } = req.params;

    // Verify ownership (check if authenticated user owns this agent)
    if (req.user?.address !== address) {
      throw new AppError('Unauthorized to revoke this agent', 403);
    }

    // Revoke on-chain
    const txHash = await starknetService.revokeAgent(address);

    // Update database
    await agentService.revokeAgent(address);

    res.status(200).json({
      success: true,
      message: 'Agent revoked successfully',
      data: {
        tx_hash: txHash
      }
    });
  });

  /**
   * Create session key for agent — stores in plugin_sessions (shared with plugin endpoint).
   * POST /api/v1/agents/:address/sessions
   */
  createSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { address } = req.params;
    const {
      // Plugin format
      expirationBlocks, permissions, metadata,
      // Legacy format
      session_public_key, expiration_block, max_spend_per_tx, allowed_methods,
    } = req.body;

    // Verify ownership
    if (req.user?.address !== address) {
      throw new AppError('Unauthorized', 403);
    }

    // Generate new session key pair server-side (deterministic security)
    const sessionId = `session_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const privateKey = stark.randomAddress();
    const publicKey = session_public_key
      ? session_public_key
      : '0x' + Buffer.from(ec.starkCurve.getPublicKey(privateKey, true)).toString('hex');

    const blocks = expirationBlocks ?? expiration_block ?? 2400; // ~5 days
    const perms: string[] = permissions ?? allowed_methods ?? ['execute', 'swap', 'stake'];

    const sessionRecord = {
      sessionId,
      agentAddress: address,
      publicKey,
      privateKey,
      permissions: perms,
      expirationBlocks: Number(blocks),
      expiresAt: Date.now() + Number(blocks) * 180000, // ~3 min/block
      spendingLimit: {
        daily: metadata?.dailyLimit ?? String(max_spend_per_tx ?? '1000'),
        perTransaction: metadata?.transactionLimit ?? '100',
        currency: 'STRK',
      },
      usage: { totalSpent: '0', transactionCount: 0, lastUsed: null },
      status: 'active' as const,
      createdAt: Date.now(),
      metadata: metadata ?? {},
    };

    // Persist to plugin_sessions (same table used by /plugins/account/execute)
    await createPluginSession(sessionRecord);
    logger.info(`Session created via agents route: ${sessionId} for ${address}`);

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: {
        sessionId,
        publicKey,
        permissions: perms,
        expirationBlocks: Number(blocks),
        expiresAt: sessionRecord.expiresAt,
        spendingLimit: sessionRecord.spendingLimit,
        status: 'active',
        createdAt: sessionRecord.createdAt,
      },
    });
  });

  /**
   * Get agent sessions
   * GET /api/v1/agents/:address/sessions
   */
  getSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { address } = req.params;

    // Return from unified plugin_sessions table
    const sessions = await listSessionsByAgent(address);

    res.status(200).json({
      success: true,
      data: sessions.map((s) => ({
        sessionId: s.sessionId,
        publicKey: s.publicKey,
        permissions: s.permissions,
        expiresAt: s.expiresAt,
        isExpired: Date.now() > s.expiresAt,
        spendingLimit: s.spendingLimit,
        usage: s.usage,
        status: Date.now() > s.expiresAt ? 'expired' : s.status,
        createdAt: s.createdAt,
      }))
    });
  });
}
