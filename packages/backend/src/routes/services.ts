import { Router } from 'express';
import { ServiceController } from '../controllers/services';
import { authenticate } from '../middleware/auth';
import { serviceValidation } from '../middleware/validation';

const router = Router();
const controller = new ServiceController();

/**
 * @route   POST /api/v1/services/register
 * @desc    Register a new service
 * @access  Private
 */
router.post('/register', authenticate, serviceValidation.register, controller.registerService);

/**
 * @route   GET /api/v1/services
 * @desc    Get all services with optional filters
 * @access  Public
 */
router.get('/', serviceValidation.search, controller.getAllServices);

/**
 * @route   GET /api/v1/services/:id
 * @desc    Get service by ID
 * @access  Public
 */
router.get('/:id', controller.getServiceById);

/**
 * @route   POST /api/v1/services/:id/reviews
 * @desc    Submit review for a service
 * @access  Private
 */
router.post('/:id/reviews', authenticate, serviceValidation.submitReview, controller.submitReview);

/**
 * @route   GET /api/v1/services/:id/reviews
 * @desc    Get service reviews
 * @access  Public
 */
router.get('/:id/reviews', controller.getServiceReviews);

/**
 * @route   GET /api/v1/services/:id/reputation
 * @desc    Get service reputation
 * @access  Public
 */
router.get('/:id/reputation', controller.getReputation);

export default router;
