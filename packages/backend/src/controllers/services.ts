import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { StarknetService } from '../services/starknet';
import { ServiceService } from '../services/service';
import { logger } from '../utils/logger';

const starknetService = new StarknetService();
const serviceService = new ServiceService();

export class ServiceController {
  /**
   * Register a new service
   * POST /api/v1/services/register
   */
  registerService = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { name, description, endpoint, stake_amount } = req.body;
    const provider_address = req.user?.address;

    if (!provider_address) {
      throw new AppError('Authentication required', 401);
    }

    logger.info(`Registering service: ${name} by ${provider_address}`);

    // Register service on-chain
    const txHash = await starknetService.registerService(
      name,
      description,
      endpoint,
      stake_amount
    );

    // Save service to database
    const service = await serviceService.createService({
      provider_address,
      name,
      description,
      endpoint,
      total_stake: stake_amount,
      tx_hash: txHash,
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Service registered successfully',
      data: {
        service,
        tx_hash: txHash
      }
    });
  });

  /**
   * Get all services
   * GET /api/v1/services
   */
  getAllServices = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    const min_stake = parseFloat(req.query.min_stake as string);

    const services = await serviceService.getServices({
      page,
      limit,
      category,
      min_stake
    });

    res.status(200).json({
      success: true,
      data: services
    });
  });

  /**
   * Get service by ID
   * GET /api/v1/services/:id
   */
  getServiceById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const service = await serviceService.getServiceById(id);

    if (!service) {
      throw new AppError('Service not found', 404);
    }

    // Get on-chain info
    const onChainInfo = await starknetService.getServiceInfo(id);

    res.status(200).json({
      success: true,
      data: {
        ...service,
        on_chain: onChainInfo
      }
    });
  });

  /**
   * Submit review for a service
   * POST /api/v1/services/:id/reviews
   */
  submitReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { id } = req.params;
    const { rating, review_hash } = req.body;
    const reviewer_address = req.user?.address;

    if (!reviewer_address) {
      throw new AppError('Authentication required', 401);
    }

    logger.info(`Submitting review for service ${id} by ${reviewer_address}`);

    // Submit review on-chain
    const txHash = await starknetService.submitReview(id, rating, review_hash);

    // Save review to database
    const review = await serviceService.createReview({
      service_id: id,
      reviewer_address,
      rating,
      review_hash,
      tx_hash: txHash
    });

    // Update reputation
    await serviceService.updateReputation(id);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        review,
        tx_hash: txHash
      }
    });
  });

  /**
   * Get service reviews
   * GET /api/v1/services/:id/reviews
   */
  getServiceReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const reviews = await serviceService.getServiceReviews(id, page, limit);

    res.status(200).json({
      success: true,
      data: reviews
    });
  });

  /**
   * Get service reputation
   * GET /api/v1/services/:id/reputation
   */
  getReputation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const reputation = await serviceService.getReputation(id);

    if (!reputation) {
      throw new AppError('Reputation not found', 404);
    }

    res.status(200).json({
      success: true,
      data: reputation
    });
  });
}
