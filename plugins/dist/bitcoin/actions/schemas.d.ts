/**
 * Bitcoin Plugin - Action Schemas
 *
 * Defines Garden SDK action interfaces for natural language processing
 */
export declare const BitcoinActionSchemas: {
    getSwapQuote: {
        name: string;
        description: string;
        category: string;
        examples: string[];
        schema: {
            type: string;
            properties: {
                fromCurrency: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                toCurrency: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                amount: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
    };
    executeSwap: {
        name: string;
        description: string;
        category: string;
        examples: string[];
        schema: {
            type: string;
            properties: {
                fromCurrency: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                toCurrency: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                amount: {
                    type: string;
                    description: string;
                };
                destinationAddress: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
    };
    getSwapStatus: {
        name: string;
        description: string;
        category: string;
        examples: string[];
        schema: {
            type: string;
            properties: {
                swapId: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
    };
    getBTCBalance: {
        name: string;
        description: string;
        category: string;
        examples: string[];
        schema: {
            type: string;
            properties: {
                address: {
                    type: string;
                    description: string;
                };
            };
            required: never[];
        };
    };
};
export type BitcoinAction = keyof typeof BitcoinActionSchemas;
//# sourceMappingURL=schemas.d.ts.map