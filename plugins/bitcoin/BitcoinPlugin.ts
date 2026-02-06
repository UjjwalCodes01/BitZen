/**
 * Bitcoin Plugin - Garden SDK Integration
 * 
 * Enables BTC ↔ STRK atomic swaps for AI agents
 * Critical for Bitcoin track hackathon prize
 */

import {
  Plugin,
  PluginConfig,
  AgentContext,
  PluginAction,
  ActionResult,
  SwapQuote,
  SwapResult
} from '../types';

export interface BitcoinPluginConfig {
  network: 'mainnet' | 'testnet';
  defaultSwapAmount: string;
  slippageTolerance: number;
  gardenApiUrl?: string;
  gardenApiKey?: string;
}

export class BitcoinPlugin implements Plugin {
  name = 'bitcoin';
  version = '1.0.0';
  description = 'Bitcoin ↔ Starknet atomic swaps using Garden SDK';
  
  private config!: BitcoinPluginConfig;
  private context!: AgentContext;
  private initialized = false;

  actions: PluginAction[] = [
    {
      name: 'getSwapQuote',
      description: 'Get quote for BTC → STRK or STRK → BTC swap',
      parameters: [
        {
          name: 'fromCurrency',
          type: 'string',
          required: true,
          description: 'Source currency (BTC or STRK)'
        },
        {
          name: 'toCurrency',
          type: 'string',
          required: true,
          description: 'Destination currency (BTC or STRK)'
        },
        {
          name: 'amount',
          type: 'string',
          required: true,
          description: 'Amount to swap (in smallest unit)'
        }
      ],
      execute: this.getSwapQuote.bind(this)
    },
    {
      name: 'executeSwap',
      description: 'Execute BTC ↔ STRK atomic swap',
      parameters: [
        {
          name: 'fromCurrency',
          type: 'string',
          required: true,
          description: 'Source currency (BTC or STRK)'
        },
        {
          name: 'toCurrency',
          type: 'string',
          required: true,
          description: 'Destination currency (BTC or STRK)'
        },
        {
          name: 'amount',
          type: 'string',
          required: true,
          description: 'Amount to swap'
        },
        {
          name: 'destinationAddress',
          type: 'string',
          required: true,
          description: 'Recipient address'
        }
      ],
      execute: this.executeSwap.bind(this)
    },
    {
      name: 'getSwapStatus',
      description: 'Check status of an ongoing swap',
      parameters: [
        {
          name: 'swapId',
          type: 'string',
          required: true,
          description: 'Swap transaction ID'
        }
      ],
      execute: this.getSwapStatus.bind(this)
    },
    {
      name: 'getBTCBalance',
      description: 'Get Bitcoin balance for agent',
      parameters: [
        {
          name: 'address',
          type: 'string',
          required: false,
          description: 'BTC address (defaults to agent address)'
        }
      ],
      execute: this.getBTCBalance.bind(this)
    }
  ];

  async initialize(config: PluginConfig, context: AgentContext): Promise<void> {
    this.config = config.config as BitcoinPluginConfig;
    this.context = context;

    // Set defaults
    this.config.gardenApiUrl = this.config.gardenApiUrl || 
      (this.config.network === 'mainnet' 
        ? 'https://api.garden.finance'
        : 'https://testnet.api.garden.finance');

    context.logger?.info('Bitcoin plugin initialized', {
      network: this.config.network,
      gardenApiUrl: this.config.gardenApiUrl
    });

    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.context.logger?.info('Bitcoin plugin shutdown');
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      // Ping Garden API
      const response = await fetch(`${this.config.gardenApiUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      this.context.logger?.error('Bitcoin plugin health check failed:', error);
      return false;
    }
  }

  /**
   * Get swap quote from Garden SDK
   */
  private async getSwapQuote(params: any): Promise<ActionResult> {
    const { fromCurrency, toCurrency, amount } = params;

    try {
      // Garden SDK API call for quote
      const response = await fetch(`${this.config.gardenApiUrl}/v1/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.gardenApiKey && { 'X-API-Key': this.config.gardenApiKey })
        },
        body: JSON.stringify({
          from: fromCurrency.toLowerCase(),
          to: toCurrency.toLowerCase(),
          amount: amount,
          network: this.config.network
        })
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.message || 'Failed to get swap quote');
      }

      const quote = await response.json() as any;

      const swapQuote: SwapQuote = {
        inputAmount: amount,
        outputAmount: quote.outputAmount,
        exchangeRate: quote.rate,
        fee: quote.fee,
        slippage: this.config.slippageTolerance,
        estimatedTime: quote.estimatedTime || 600, // 10 min default
        route: [fromCurrency, toCurrency]
      };

      return {
        success: true,
        data: swapQuote,
        metadata: {
          provider: 'Garden Finance',
          quoteId: quote.id
        }
      };
    } catch (error: any) {
      this.context.logger?.error('Failed to get swap quote:', error);
      return {
        success: false,
        error: error.message || 'Unknown error getting swap quote'
      };
    }
  }

  /**
   * Execute atomic swap using Garden SDK
   */
  private async executeSwap(params: any): Promise<ActionResult> {
    const { fromCurrency, toCurrency, amount, destinationAddress } = params;

    try {
      // Step 1: Get quote
      const quoteResult = await this.getSwapQuote({ fromCurrency, toCurrency, amount });
      if (!quoteResult.success) {
        return quoteResult;
      }

      // Step 2: Initiate swap with Garden SDK
      const response = await fetch(`${this.config.gardenApiUrl}/v1/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.gardenApiKey && { 'X-API-Key': this.config.gardenApiKey })
        },
        body: JSON.stringify({
          from: fromCurrency.toLowerCase(),
          to: toCurrency.toLowerCase(),
          amount: amount,
          destinationAddress: destinationAddress,
          sourceAddress: this.context.agentAddress,
          network: this.config.network,
          slippageTolerance: this.config.slippageTolerance
        })
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.message || 'Failed to execute swap');
      }

      const swapData = await response.json() as any;

      const swapResult: SwapResult = {
        success: true,
        swapId: swapData.swapId,
        inputTx: swapData.inputTxHash,
        outputTx: swapData.outputTxHash,
        actualAmount: swapData.actualOutputAmount
      };

      this.context.logger?.info('Swap executed successfully', {
        swapId: swapResult.swapId,
        from: fromCurrency,
        to: toCurrency
      });

      return {
        success: true,
        data: swapResult,
        txHash: swapData.inputTxHash,
        metadata: {
          provider: 'Garden Finance',
          estimatedCompletion: swapData.estimatedCompletion
        }
      };
    } catch (error: any) {
      this.context.logger?.error('Failed to execute swap:', error);
      return {
        success: false,
        error: error.message || 'Unknown error executing swap'
      };
    }
  }

  /**
   * Get swap status
   */
  private async getSwapStatus(params: any): Promise<ActionResult> {
    const { swapId } = params;

    try {
      const response = await fetch(`${this.config.gardenApiUrl}/v1/swap/${swapId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.gardenApiKey && { 'X-API-Key': this.config.gardenApiKey })
        }
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.message || 'Failed to get swap status');
      }

      const status = await response.json() as any;

      return {
        success: true,
        data: {
          swapId: status.swapId,
          status: status.status, // 'pending', 'completed', 'failed'
          inputTx: status.inputTxHash,
          outputTx: status.outputTxHash,
          progress: status.progress,
          error: status.error
        }
      };
    } catch (error: any) {
      this.context.logger?.error('Failed to get swap status:', error);
      return {
        success: false,
        error: error.message || 'Unknown error getting swap status'
      };
    }
  }

  /**
   * Get BTC balance
   */
  private async getBTCBalance(params: any): Promise<ActionResult> {
    const address = params.address || this.deriveBTCAddress();

    try {
      // Query Bitcoin testnet/mainnet API
      const apiUrl = this.config.network === 'mainnet'
        ? `https://blockchain.info/q/addressbalance/${address}`
        : `https://blockstream.info/testnet/api/address/${address}`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error('Failed to fetch Bitcoin balance');
      }

      const data = await response.json() as any;
      const balance = this.config.network === 'mainnet'
        ? data
        : data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;

      return {
        success: true,
        data: {
          address,
          balance: balance.toString(),
          balanceBTC: (balance / 100000000).toFixed(8),
          network: this.config.network
        }
      };
    } catch (error: any) {
      this.context.logger?.error('Failed to get BTC balance:', error);
      return {
        success: false,
        error: error.message || 'Unknown error getting BTC balance'
      };
    }
  }

  /**
   * Derive BTC address from Starknet agent address
   * (Simplified - in production, use proper derivation)
   */
  private deriveBTCAddress(): string {
    // For demo/testnet: Use a fixed test address
    // In production: Derive from agent's private key using BIP32/BIP44
    return this.config.network === 'mainnet'
      ? '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' // Genesis address (example)
      : 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'; // Testnet address (example)
  }
}
