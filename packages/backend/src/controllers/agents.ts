import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { StarknetService } from '../services/starknet';
import { AgentService } from '../services/agent';
import { logger } from '../utils/logger';

const starknetService = new StarknetService();
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

    const { address, proof_data, public_inputs } = req.body;

    logger.info(`Registering agent: ${address}`);

    // Register agent on-chain
    const txHash = await starknetService.registerAgent(address, proof_data, public_inputs);

    // Save agent to database
    const agent = await agentService.createAgent({
      address,
      tx_hash: txHash,
      registered_at: new Date(),
      is_verified: false // Will be verified after tx confirmation
    });

    res.status(201).json({
      success: true,
      message: 'Agent registration initiated',
      data: {
        agent,
        tx_hash: txHash
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
   * Create session key for agent
   * POST /api/v1/agents/:address/sessions
   */
  createSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { address } = req.params;
    const { session_public_key, expiration_block, max_spend_per_tx, allowed_methods } = req.body;

    // Verify ownership
    if (req.user?.address !== address) {
      throw new AppError('Unauthorized', 403);
    }

    // Create session on-chain
    const txHash = await starknetService.createSession(
      address,
      session_public_key,
      expiration_block,
      max_spend_per_tx,
      allowed_methods
    );

    // Save session to database
    const session = await agentService.createSession({
      agent_address: address,
      session_key: session_public_key,
      expiration_block,
      max_spend: max_spend_per_tx,
      tx_hash: txHash
    });

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: {
        session,
        tx_hash: txHash
      }
    });
  });

  /**
   * Get agent sessions
   * GET /api/v1/agents/:address/sessions
   */
  getSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { address } = req.params;

    const sessions = await agentService.getAgentSessions(address);

    res.status(200).json({
      success: true,
      data: sessions
    });
  });
}
