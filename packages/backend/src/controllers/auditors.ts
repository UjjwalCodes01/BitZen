import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { starknetService } from '../services/starknet';
import { AuditorService } from '../services/auditor';
import { logger } from '../utils/logger';
const auditorService = new AuditorService();

export class AuditorController {
  /**
   * Stake as auditor for a service
   * POST /api/v1/auditors/stake
   */
  stakeAsAuditor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { service_id, amount } = req.body;
    const auditor_address = req.user?.address;

    if (!auditor_address) {
      throw new AppError('Authentication required', 401);
    }

    try {
      // Try staking on-chain
      const txHash = await starknetService.stakeAsAuditor(service_id, amount);

      // Save stake to database
      const stake = await auditorService.createStake({
        service_id,
        auditor_address,
        amount,
        tx_hash: txHash,
        is_active: true
      });

      res.status(201).json({
        success: true,
        message: 'Staked successfully',
        data: {
          stake,
          tx_hash: txHash
        }
      });
    } catch (onchainError: any) {
      if (onchainError.message?.includes('Overflow') || onchainError.message?.includes('Insufficient') || onchainError.message?.includes('not initialized')) {
        logger.warn(`On-chain staking failed: ${onchainError.message}`);

        const stake = await auditorService.createStake({
          service_id,
          auditor_address,
          amount,
          tx_hash: null as any,
          is_active: true
        });

        res.status(201).json({
          success: true,
          message: 'Stake recorded in database. On-chain staking pending STRK tokens.',
          data: {
            stake,
            note: 'On-chain staking will be completed when STRK tokens are available'
          }
        });
      } else {
        throw onchainError;
      }
    }
  });

  /**
   * Unstake from a service
   * POST /api/v1/auditors/unstake
   */
  unstake = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { service_id } = req.body;
    const auditor_address = req.user?.address;

    if (!auditor_address) {
      throw new AppError('Authentication required', 401);
    }

    let txHash: string | null = null;
    try {
      txHash = await starknetService.unstake(service_id);
    } catch (err: any) {
      logger.warn(`On-chain unstake failed: ${err.message}`);
    }

    // Update database
    await auditorService.unstake(service_id, auditor_address);

    res.status(200).json({
      success: true,
      message: txHash ? 'Unstaked successfully' : 'Unstake recorded (on-chain pending)',
      data: {
        tx_hash: txHash
      }
    });
  });

  /**
   * Get auditor stakes
   * GET /api/v1/auditors/:address/stakes
   */
  getAuditorStakes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { address } = req.params;

    const stakes = await auditorService.getAuditorStakes(address);

    res.status(200).json({
      success: true,
      data: stakes
    });
  });

  /**
   * Get service auditors
   * GET /api/v1/auditors/service/:id
   */
  getServiceAuditors = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const auditors = await auditorService.getServiceAuditors(id);

    res.status(200).json({
      success: true,
      data: auditors
    });
  });
}
