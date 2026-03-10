import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { verifyStarknetTypedDataSignature, buildLoginTypedData } from '../utils/signature';
import { logger } from '../utils/logger';
import { pool } from '../database/pool';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET environment variable is required');
  return secret;
}

const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

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

    // Generate cryptographically secure nonce (31 bytes to fit in felt252)
    const nonce = crypto.randomBytes(31).toString('hex');

    // Build SNIP-12 typed data for wallet signing
    const typedData = buildLoginTypedData(address, nonce);

    // Store nonce in database for server-side validation
    await pool.query(
      `INSERT INTO auth_nonces (address, nonce, message, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')
       ON CONFLICT (address) DO UPDATE SET nonce = $2, message = $3, expires_at = NOW() + INTERVAL '5 minutes'`,
      [address, nonce, JSON.stringify(typedData)]
    );

    res.status(200).json({
      success: true,
      data: {
        typedData,
        address
      }
    });
  });

  /**
   * Verify signature and return JWT token
   * POST /api/v1/auth/verify
   */
  verifySignature = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { address, signature } = req.body;

    if (!address || !signature) {
      throw new AppError('Address and signature required', 400);
    }

    // Look up nonce from database
    const nonceResult = await pool.query(
      `SELECT nonce FROM auth_nonces WHERE address = $1 AND expires_at > NOW()`,
      [address]
    );
    if (nonceResult.rows.length === 0) {
      throw new AppError('Nonce expired or not found. Request a new sign message.', 401);
    }

    // Reconstruct the same typed data the frontend signed
    const nonce = nonceResult.rows[0].nonce;
    const typedData = buildLoginTypedData(address, nonce);

    // Verify Starknet SNIP-12 typed data signature
    const isValid = await verifyStarknetTypedDataSignature(address, typedData, signature);

    if (!isValid) {
      throw new AppError('Invalid signature', 401);
    }

    // Delete used nonce (one-time use)
    await pool.query(`DELETE FROM auth_nonces WHERE address = $1`, [address]);

    // Generate JWT token (H2 fix: expiry matches what we tell the client)
    const token = jwt.sign(
      { address },
      getJwtSecret(),
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { address },
      getJwtRefreshSecret(),
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    logger.info(`User authenticated: ${address}`);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        token,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY
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
        getJwtRefreshSecret()
      ) as { address: string };

      // Generate new access token
      const newToken = jwt.sign(
        { address: decoded.address },
        getJwtSecret(),
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      res.status(200).json({
        success: true,
        data: {
          token: newToken,
          expiresIn: ACCESS_TOKEN_EXPIRY
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
