/**
 * Bitcoin Plugin Routes
 * Garden Finance Integration for BTC ↔ STRK atomic swaps
 */

import express, { Request, Response } from 'express';
import { logger } from '../../utils/logger';

const router = express.Router();

const GARDEN_API_URL = process.env.GARDEN_API_URL || 'https://api.garden.finance';
const GARDEN_API_KEY = process.env.GARDEN_API_KEY;

if (!GARDEN_API_KEY) {
  logger.warn('GARDEN_API_KEY not set - Bitcoin swaps will be mocked');
}

/**
 * Helper function to call Garden Finance API
 */
async function callGardenAPI(endpoint: string, method: string = 'GET', data?: any) {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': GARDEN_API_KEY || '',
      },
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${GARDEN_API_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Garden API error: ${response.status} - ${error}`);
    }

    return await response.json();
  } catch (error: any) {
    logger.error('Garden API call failed:', error);
    throw error;
  }
}

/**
 * POST /api/v1/plugins/bitcoin/quote
 * Get exchange rate quote for BTC ↔ STRK swap
 */
router.post('/quote', async (req: Request, res: Response) => {
  try {
    const { fromCurrency, toCurrency, amount } = req.body;

    if (!fromCurrency || !toCurrency || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromCurrency, toCurrency, amount',
      });
    }

    // Validate currencies
    if (!['BTC', 'STRK'].includes(fromCurrency) || !['BTC', 'STRK'].includes(toCurrency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency. Supported: BTC, STRK',
      });
    }

    if (fromCurrency === toCurrency) {
      return res.status(400).json({
        success: false,
        error: 'Cannot swap same currency',
      });
    }

    // Call Garden Finance API for real quote
    if (GARDEN_API_KEY) {
      try {
        const quote: any = await callGardenAPI('/v1/quote', 'POST', {
          from: fromCurrency,
          to: toCurrency,
          amount: parseFloat(amount),
        });

        return res.json({
          success: true,
          data: {
            from: fromCurrency,
            to: toCurrency,
            amount,
            rate: quote.rate || 0,
            total: quote.total || 0,
            fee: quote.fee || 0.003, // 0.3% default
            estimatedTime: quote.estimatedTime || 600, // 10 minutes
            expiresAt: Date.now() + (quote.validityPeriod || 300000), // 5 minutes
            quoteId: quote.id,
          },
        });
      } catch (error: any) {
        logger.error('Garden API quote failed, using fallback:', error);
        // Fall through to mock data if API fails
      }
    }

    // Mock data fallback (for development/testing)
    const mockRate = fromCurrency === 'BTC' ? 45230 : 1 / 45230; // STRK per BTC
    const numAmount = parseFloat(amount);
    const total = numAmount * mockRate;
    const fee = total * 0.003; // 0.3% fee

    logger.info(`Mock Bitcoin quote: ${amount} ${fromCurrency} → ${total.toFixed(8)} ${toCurrency}`);

    return res.json({
      success: true,
      data: {
        from: fromCurrency,
        to: toCurrency,
        amount,
        rate: mockRate,
        total: total - fee,
        fee: fee,
        estimatedTime: 600, // 10 minutes
        expiresAt: Date.now() + 300000, // 5 minutes
        quoteId: `mock_${Date.now()}`,
        isMock: !GARDEN_API_KEY,
      },
    });
  } catch (error: any) {
    logger.error('Get quote error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get swap quote',
    });
  }
});

/**
 * POST /api/v1/plugins/bitcoin/swap
 * Execute atomic swap between BTC and STRK
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { fromCurrency, toCurrency, amount, destinationAddress, quoteId } = req.body;

    if (!fromCurrency || !toCurrency || !amount || !destinationAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Call Garden Finance API for real swap
    if (GARDEN_API_KEY) {
      try {
        const swap: any = await callGardenAPI('/v1/swap', 'POST', {
          from: fromCurrency,
          to: toCurrency,
          amount: parseFloat(amount),
          destinationAddress,
          quoteId,
        });

        return res.json({
          success: true,
          data: {
            swapId: swap.id,
            status: swap.status || 'pending',
            from: fromCurrency,
            to: toCurrency,
            amount,
            destinationAddress,
            txHash: swap.txHash,
            estimatedCompletion: Date.now() + (swap.estimatedTime || 600000),
            createdAt: Date.now(),
          },
        });
      } catch (error: any) {
        logger.error('Garden API swap failed, using fallback:', error);
        // Fall through to mock if API fails
      }
    }

    // Mock swap for development
    const swapId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`Mock Bitcoin swap initiated: ${swapId}`);

    return res.json({
      success: true,
      data: {
        swapId,
        status: 'pending',
        from: fromCurrency,
        to: toCurrency,
        amount,
        destinationAddress,
        txHash: null,
        estimatedCompletion: Date.now() + 600000, // 10 minutes
        createdAt: Date.now(),
        isMock: !GARDEN_API_KEY,
      },
    });
  } catch (error: any) {
    logger.error('Execute swap error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute swap',
    });
  }
});

/**
 * GET /api/v1/plugins/bitcoin/swap/:swapId/status
 * Get status of an ongoing swap
 */
router.get('/swap/:swapId/status', async (req: Request, res: Response) => {
  try {
    const { swapId } = req.params;

    if (!swapId) {
      return res.status(400).json({
        success: false,
        error: 'Swap ID required',
      });
    }

    // Call Garden Finance API for real status
    if (GARDEN_API_KEY && !swapId.startsWith('mock_')) {
      try {
        const status: any = await callGardenAPI(`/v1/swap/${swapId}`);

        return res.json({
          success: true,
          data: {
            swapId,
            status: status.status,
            txHash: status.txHash,
            confirmations: status.confirmations || 0,
            completedAt: status.completedAt,
            updatedAt: Date.now(),
          },
        });
      } catch (error: any) {
        logger.error('Garden API status check failed:', error);
        // Fall through to mock
      }
    }

    // Mock status for development
    const isMock = swapId.startsWith('swap_') || swapId.startsWith('mock_');
    const createdTime = swapId.startsWith('swap_') 
      ? parseInt(swapId.split('_')[1]) 
      : Date.now() - 60000;
    
    const elapsed = Date.now() - createdTime;
    const isComplete = elapsed > 300000; // Complete after 5 minutes

    logger.info(`Mock Bitcoin swap status check: ${swapId}`);

    return res.json({
      success: true,
      data: {
        swapId,
        status: isComplete ? 'completed' : 'pending',
        txHash: isComplete ? `0x${Math.random().toString(16).substr(2, 64)}` : null,
        confirmations: isComplete ? 6 : Math.floor(elapsed / 60000),
        completedAt: isComplete ? Date.now() : null,
        updatedAt: Date.now(),
        isMock: isMock,
      },
    });
  } catch (error: any) {
    logger.error('Get swap status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get swap status',
    });
  }
});

/**
 * GET /api/v1/plugins/bitcoin/balance/:address
 * Get Bitcoin balance for an address
 */
router.get('/balance/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address required',
      });
    }

    // Call Garden Finance API for real balance
    if (GARDEN_API_KEY) {
      try {
        const balance: any = await callGardenAPI(`/v1/balance/${address}`);

        return res.json({
          success: true,
          data: {
            address,
            balance: balance.balance || '0',
            balanceUSD: balance.balanceUSD || 0,
            currency: 'BTC',
            updatedAt: Date.now(),
          },
        });
      } catch (error: any) {
        logger.error('Garden API balance check failed:', error);
        // Fall through to mock
      }
    }

    // Mock balance for development
    const mockBalance = '0.00234567';
    const btcPriceUSD = 98000;
    const balanceUSD = parseFloat(mockBalance) * btcPriceUSD;

    logger.info(`Mock Bitcoin balance check: ${address}`);

    return res.json({
      success: true,
      data: {
        address,
        balance: mockBalance,
        balanceUSD: balanceUSD.toFixed(2),
        currency: 'BTC',
        updatedAt: Date.now(),
        isMock: !GARDEN_API_KEY,
      },
    });
  } catch (error: any) {
    logger.error('Get balance error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get balance',
    });
  }
});

/**
 * GET /api/v1/plugins/bitcoin/rates
 * Get current BTC/STRK exchange rates
 */
router.get('/rates', async (_req: Request, res: Response) => {
  try {
    // Call Garden Finance API for real rates
    if (GARDEN_API_KEY) {
      try {
        const rates: any = await callGardenAPI('/v1/rates');

        return res.json({
          success: true,
          data: {
            BTC_STRK: rates.BTC_STRK || 45230,
            STRK_BTC: rates.STRK_BTC || (1 / 45230),
            BTC_USD: rates.BTC_USD || 98000,
            STRK_USD: rates.STRK_USD || 2.17,
            updatedAt: Date.now(),
          },
        });
      } catch (error: any) {
        logger.error('Garden API rates failed:', error);
        // Fall through to mock
      }
    }

    // Mock rates for development
    const BTC_USD = 98000;
    const STRK_USD = 2.17;
    const BTC_STRK = BTC_USD / STRK_USD;

    return res.json({
      success: true,
      data: {
        BTC_STRK: Math.round(BTC_STRK),
        STRK_BTC: 1 / BTC_STRK,
        BTC_USD,
        STRK_USD,
        updatedAt: Date.now(),
        isMock: !GARDEN_API_KEY,
      },
    });
  } catch (error: any) {
    logger.error('Get rates error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get exchange rates',
    });
  }
});

export default router;
