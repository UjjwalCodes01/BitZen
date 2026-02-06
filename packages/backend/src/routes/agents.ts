import { Router } from 'express';
import { AgentController } from '../controllers/agents';
import { authenticate } from '../middleware/auth';
import { agentValidation } from '../middleware/validation';

const router = Router();
const controller = new AgentController();

/**
 * @route   POST /api/v1/agents/register
 * @desc    Register a new agent with ZK proof
 * @access  Public
 */
router.post('/register', agentValidation.register, controller.registerAgent);

/**
 * @route   GET /api/v1/agents/:address
 * @desc    Get agent details
 * @access  Public
 */
router.get('/:address', agentValidation.getAgent, controller.getAgent);

/**
 * @route   GET /api/v1/agents
 * @desc    Get all agents
 * @access  Public
 */
router.get('/', controller.getAllAgents);

/**
 * @route   DELETE /api/v1/agents/:address
 * @desc    Revoke agent
 * @access  Private (Owner only)
 */
router.delete('/:address', authenticate, controller.revokeAgent);

/**
 * @route   POST /api/v1/agents/:address/sessions
 * @desc    Create session key for agent
 * @access  Private (Owner only)
 */
router.post('/:address/sessions', authenticate, controller.createSession);

/**
 * @route   GET /api/v1/agents/:address/sessions
 * @desc    Get agent sessions
 * @access  Public
 */
router.get('/:address/sessions', controller.getSessions);

export default router;
