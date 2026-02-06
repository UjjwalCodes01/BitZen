import { Router } from 'express';
import { AuthController } from '../controllers/auth';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new AuthController();

/**
 * @route   POST /api/v1/auth/sign-message
 * @desc    Get message to sign for authentication
 * @access  Public
 */
router.post('/sign-message', controller.signMessage);

/**
 * @route   POST /api/v1/auth/verify
 * @desc    Verify signature and get JWT token
 * @access  Public
 */
router.post('/verify', controller.verifySignature);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', controller.refreshToken);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticate, controller.getCurrentUser);

export default router;
