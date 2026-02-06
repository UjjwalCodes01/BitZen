import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { verifyStarknetSignature } from '../utils/signature';
import { logger } from '../utils/logger';

export class AuthController {
  /**
   * Sign message to get authentication token
   * POST /api/v1/auth/sign-message
   */
  signMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { address } = req.body;

    if (!address) {
      throw new AppError('Address required', 400);
    }

    // Generate nonce/message for user to sign
    const message = `BitZen Login\nAddress: ${address}\nNonce: ${Date.now()}`;

    res.status(200).json({
      success: true,
      data: {
        message,
        address
      }
    });
  });

  /**
   * Verify signature and return JWT token
   * POST /api/v1/auth/verify
   */
  verifySignature = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { address, message, signature } = req.body;

    if (!address || !message || !signature) {
      throw new AppError('Address, message, and signature required', 400);
    }

    // Verify Starknet signature
    const isValid = await verifyStarknetSignature(address, message, signature);

    if (!isValid) {
      throw new AppError('Invalid signature', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { address },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { address },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: '7d' }
    );

    logger.info(`User authenticated: ${address}`);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE || '7d'
      }
    });
  });

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'refresh-secret'
      ) as { address: string };

      // Generate new access token
      const newToken = jwt.sign(
        { address: decoded.address },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '24h' }
      );

      res.status(200).json({
        success: true,
        data: {
          token: newToken,
          expiresIn: process.env.JWT_EXPIRE || '7d'
        }
      });
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  });

  /**
   * Get current user info
   * GET /api/v1/auth/me
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    res.status(200).json({
      success: true,
      data: {
        address: req.user.address
      }
    });
  });
}
