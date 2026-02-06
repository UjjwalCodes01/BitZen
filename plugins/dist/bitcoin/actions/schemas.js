"use strict";
/**
 * Bitcoin Plugin - Action Schemas
 *
 * Defines Garden SDK action interfaces for natural language processing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitcoinActionSchemas = void 0;
exports.BitcoinActionSchemas = {
    getSwapQuote: {
        name: 'getSwapQuote',
        description: 'Get a quote for swapping between BTC and STRK',
        category: 'defi',
        examples: [
            'Get quote for 0.1 BTC to STRK',
            'How much STRK can I get for 0.05 BTC?',
            'Quote for swapping 1000 STRK to BTC'
        ],
        schema: {
            type: 'object',
            properties: {
                fromCurrency: {
                    type: 'string',
                    enum: ['BTC', 'STRK'],
                    description: 'Currency to swap from'
                },
                toCurrency: {
                    type: 'string',
                    enum: ['BTC', 'STRK'],
                    description: 'Currency to swap to'
                },
                amount: {
                    type: 'string',
                    description: 'Amount to swap (in smallest unit: satoshis for BTC, wei for STRK)'
                }
            },
            required: ['fromCurrency', 'toCurrency', 'amount']
        }
    },
    executeSwap: {
        name: 'executeSwap',
        description: 'Execute an atomic swap between Bitcoin and Starknet',
        category: 'defi',
        examples: [
            'Swap 0.1 BTC to STRK and send to my wallet',
            'Exchange 1000 STRK for BTC',
            'Convert my Bitcoin to Starknet tokens'
        ],
        schema: {
            type: 'object',
            properties: {
                fromCurrency: {
                    type: 'string',
                    enum: ['BTC', 'STRK'],
                    description: 'Currency to swap from'
                },
                toCurrency: {
                    type: 'string',
                    enum: ['BTC', 'STRK'],
                    description: 'Currency to swap to'
                },
                amount: {
                    type: 'string',
                    description: 'Amount to swap'
                },
                destinationAddress: {
                    type: 'string',
                    description: 'Address to receive swapped tokens'
                }
            },
            required: ['fromCurrency', 'toCurrency', 'amount', 'destinationAddress']
        }
    },
    getSwapStatus: {
        name: 'getSwapStatus',
        description: 'Check the status of a pending swap transaction',
        category: 'defi',
        examples: [
            'Check status of swap abc123',
            'Is my swap complete?',
            'Show me swap transaction status'
        ],
        schema: {
            type: 'object',
            properties: {
                swapId: {
                    type: 'string',
                    description: 'Unique swap transaction identifier'
                }
            },
            required: ['swapId']
        }
    },
    getBTCBalance: {
        name: 'getBTCBalance',
        description: 'Get Bitcoin balance for an address',
        category: 'query',
        examples: [
            'What is my Bitcoin balance?',
            'Check BTC balance',
            'How much Bitcoin do I have?'
        ],
        schema: {
            type: 'object',
            properties: {
                address: {
                    type: 'string',
                    description: 'Bitcoin address (optional, defaults to agent address)'
                }
            },
            required: []
        }
    }
};
//# sourceMappingURL=schemas.js.map