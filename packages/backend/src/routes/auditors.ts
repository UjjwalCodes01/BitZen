import { Router } from 'express';
import { AuditorController } from '../controllers/auditors';
import { authenticate } from '../middleware/auth';
import { auditorValidation } from '../middleware/validation';

const router = Router();
const controller = new AuditorController();

/**
 * @route   POST /api/v1/auditors/stake
 * @desc    Stake as auditor for a service
 * @access  Private
 */
router.post('/stake', authenticate, auditorValidation.stake, controller.stakeAsAuditor);

/**
 * @route   POST /api/v1/auditors/unstake
 * @desc    Unstake from a service
 * @access  Private
 */
router.post('/unstake', authenticate, controller.unstake);

/**
 * @route   GET /api/v1/auditors/:address/stakes
 * @desc    Get auditor stakes
 * @access  Public
 */
router.get('/:address/stakes', controller.getAuditorStakes);

/**
 * @route   GET /api/v1/auditors/service/:id
 * @desc    Get service auditors
 * @access  Public
 */
router.get('/service/:id', controller.getServiceAuditors);

export default router;
