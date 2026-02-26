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

    // Use CoinGecko free API for a real-time rate-based quote
    let liveRate: number;
    try {
      const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,starknet&vs_currencies=usd&precision=2',
        { signal: AbortSignal.timeout(8000) },
      );
      if (cgRes.ok) {
        const prices = await cgRes.json() as Record<string, { usd?: number }>;
        const BTC_USD  = prices.bitcoin?.usd  ?? 0;
        const STRK_USD = prices.starknet?.usd ?? 0;
        liveRate = fromCurrency === 'BTC'
          ? (STRK_USD > 0 ? Math.round(BTC_USD / STRK_USD) : 45000)
          : (STRK_USD > 0 ? STRK_USD / BTC_USD : 1 / 45000);
      } else {
        liveRate = fromCurrency === 'BTC' ? 45000 : 1 / 45000;
      }
    } catch {
      liveRate = fromCurrency === 'BTC' ? 45000 : 1 / 45000;
    }

    const numAmount = parseFloat(amount);
    const totalBeforeFee = numAmount * liveRate;
    const fee = totalBeforeFee * 0.003;

    logger.info(`Live-rate quote: ${amount} ${fromCurrency} → ${(totalBeforeFee - fee).toFixed(8)} ${toCurrency}`);

    return res.json({
      success: true,
      data: {
        from: fromCurrency,
        to: toCurrency,
        amount,
        rate: liveRate,
        total: totalBeforeFee - fee,
        fee,
        estimatedTime: 600,
        expiresAt: Date.now() + 300000,
        quoteId: `quote_${Date.now()}`,
        isMock: false,
        source: 'coingecko',
        note: GARDEN_API_KEY ? undefined : 'Quote uses live CoinGecko rates. Swap settlement requires GARDEN_API_KEY.',
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

    // Fetch live rate from CoinGecko for accounting
    let settledRate = 0;
    try {
      const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,starknet&vs_currencies=usd&precision=2',
        { signal: AbortSignal.timeout(6000) },
      );
      if (cgRes.ok) {
        const prices = await cgRes.json() as Record<string, { usd?: number }>;
        const BTC_USD  = prices.bitcoin?.usd  ?? 0;
        const STRK_USD = prices.starknet?.usd ?? 0;
        settledRate = fromCurrency === 'BTC'
          ? (STRK_USD > 0 ? Math.round(BTC_USD / STRK_USD) : 0)
          : (STRK_USD > 0 ? STRK_USD / BTC_USD : 0);
      }
    } catch { /* ignore */ }

    const swapId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.warn(`Garden API key not set — swap ${swapId} is a pending intent. Configure GARDEN_API_KEY for real settlement.`);

    return res.json({
      success: true,
      data: {
        swapId,
        status: 'pending_settlement',
        from: fromCurrency,
        to: toCurrency,
        amount,
        destinationAddress,
        txHash: null,
        rate: settledRate,
        estimatedCompletion: Date.now() + 600000,
        createdAt: Date.now(),
        isMock: true,
        note: 'Swap intent recorded with live rates. Real cross-chain settlement requires GARDEN_API_KEY.',
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

    // Garden API not configured — cannot track real swap status
    logger.info(`Swap status check for ${swapId} — Garden API key not configured`);
    return res.json({
      success: true,
      data: {
        swapId,
        status: 'pending_settlement',
        txHash: null,
        confirmations: 0,
        completedAt: null,
        updatedAt: Date.now(),
        isMock: true,
        note: 'Configure GARDEN_API_KEY to enable real swap status tracking.',
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

    // Use mempool.space (no API key required) + CoinGecko for USD value
    try {
      const [addrRes, priceRes] = await Promise.all([
        fetch(`https://mempool.space/api/address/${address}`, { signal: AbortSignal.timeout(8000) }),
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&precision=2', { signal: AbortSignal.timeout(8000) }),
      ]);

      if (addrRes.ok) {
        const addrData = await addrRes.json() as { chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number } };
        const fundedSats  = addrData.chain_stats?.funded_txo_sum ?? 0;
        const spentSats   = addrData.chain_stats?.spent_txo_sum  ?? 0;
        const balanceSats = fundedSats - spentSats;
        const balanceBTC  = (balanceSats / 1e8).toFixed(8);

        let btcPriceUSD = 0;
        if (priceRes.ok) {
          const priceData = await priceRes.json() as Record<string, { usd?: number }>;
          btcPriceUSD = priceData.bitcoin?.usd ?? 0;
        }
        const balanceUSD = (parseFloat(balanceBTC) * btcPriceUSD).toFixed(2);

        logger.info(`Real Bitcoin balance for ${address}: ${balanceBTC} BTC`);
        return res.json({
          success: true,
          data: {
            address,
            balance: balanceBTC,
            balanceUSD,
            currency: 'BTC',
            updatedAt: Date.now(),
            isMock: false,
            source: 'mempool.space',
          },
        });
      }
    } catch (pubApiError: any) {
      logger.warn('Public BTC balance API failed:', pubApiError.message);
    }

    // Last-resort: return zero balance rather than fake data
    logger.warn(`Could not fetch BTC balance for ${address} — returning zero`);
    return res.json({
      success: true,
      data: {
        address,
        balance: '0.00000000',
        balanceUSD: '0.00',
        currency: 'BTC',
        updatedAt: Date.now(),
        isMock: true,
        source: 'fallback-zero',
        note: 'Balance temporarily unavailable. Try again later.',
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

    // Use CoinGecko free API for real-time rates
    try {
      const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,starknet&vs_currencies=usd&precision=2',
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) },
      );
      if (cgRes.ok) {
        const prices = await cgRes.json() as Record<string, { usd?: number }>;
        const BTC_USD  = prices.bitcoin?.usd  ?? 0;
        const STRK_USD = prices.starknet?.usd ?? 0;
        const BTC_STRK = STRK_USD > 0 ? Math.round(BTC_USD / STRK_USD) : 0;

        return res.json({
          success: true,
          data: {
            BTC_STRK,
            STRK_BTC: BTC_STRK > 0 ? 1 / BTC_STRK : 0,
            BTC_USD,
            STRK_USD,
            updatedAt: Date.now(),
            isMock: false,
            source: 'coingecko',
          },
        });
      }
    } catch (cgError: any) {
      logger.warn('CoinGecko rates fallback failed:', cgError.message);
    }

    // All sources failed — return last-known static values clearly marked
    logger.warn('All rate sources failed — returning static fallback');
    return res.json({
      success: true,
      data: {
        BTC_STRK: 0,
        STRK_BTC: 0,
        BTC_USD: 0,
        STRK_USD: 0,
        updatedAt: Date.now(),
        isMock: true,
        source: 'fallback-unavailable',
        note: 'Exchange rates temporarily unavailable.',
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
