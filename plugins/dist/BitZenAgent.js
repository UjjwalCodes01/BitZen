"use strict";
/**
 * BitZen Agent - Main Integration
 *
 * Autonomous AI agent with Bitcoin liquidity and ZK privacy on Starknet
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitZenAgent = void 0;
exports.runAgent = runAgent;
const PluginManager_1 = require("./PluginManager");
const BitcoinPlugin_1 = require("./bitcoin/BitcoinPlugin");
const ZKProofPlugin_1 = require("./zkproof/ZKProofPlugin");
const AccountPlugin_1 = require("./account/AccountPlugin");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class BitZenAgent {
    constructor(configPath, context) {
        // Load agent configuration
        const configFile = fs.readFileSync(configPath, 'utf-8');
        this.config = JSON.parse(configFile);
        this.context = context;
        this.pluginManager = new PluginManager_1.PluginManager(context);
    }
    /**
     * Initialize all plugins
     */
    async initialize() {
        console.log(`\n🤖 Initializing ${this.config.name}...`);
        console.log(`📋 ${this.config.description}\n`);
        // Register plugins
        for (const pluginConfig of this.config.plugins) {
            await this.registerPlugin(pluginConfig);
        }
        // Health check
        const health = await this.pluginManager.healthCheckAll();
        console.log('\n📊 Plugin Health Check:', health);
        console.log('\n✅ Agent initialized successfully!\n');
    }
    /**
     * Register a plugin based on config
     */
    async registerPlugin(config) {
        let plugin;
        switch (config.name) {
            case 'bitcoin':
                plugin = new BitcoinPlugin_1.BitcoinPlugin();
                break;
            case 'zkproof':
                plugin = new ZKProofPlugin_1.ZKProofPlugin();
                break;
            case 'account':
                plugin = new AccountPlugin_1.AccountPlugin();
                break;
            default:
                throw new Error(`Unknown plugin: ${config.name}`);
        }
        await this.pluginManager.registerPlugin(plugin, config);
    }
    /**
     * Execute a command
     */
    async executeCommand(command, params) {
        // Parse command to plugin.action format
        const [pluginName, actionName] = this.parseCommand(command);
        if (!pluginName || !actionName) {
            throw new Error(`Invalid command: ${command}`);
        }
        return await this.pluginManager.executeAction(pluginName, actionName, params);
    }
    /**
     * Process natural language input
     */
    async processInput(input) {
        // Simplified NLP - in production, use LLM for intent recognition
        const lowerInput = input.toLowerCase();
        // Bitcoin commands
        if (lowerInput.includes('swap') || lowerInput.includes('exchange')) {
            if (lowerInput.includes('btc') && lowerInput.includes('strk')) {
                return this.handleSwapCommand(input);
            }
        }
        // ZK proof commands
        if (lowerInput.includes('proof') || lowerInput.includes('verify')) {
            return this.handleProofCommand(input);
        }
        // Account commands
        if (lowerInput.includes('session') || lowerInput.includes('key')) {
            return this.handleAccountCommand(input);
        }
        // Balance check
        if (lowerInput.includes('balance')) {
            return this.handleBalanceCommand(input);
        }
        return 'I can help you with:\n' +
            '- Bitcoin swaps (swap, exchange)\n' +
            '- ZK proofs (proof, verify)\n' +
            '- Session keys (session, key)\n' +
            '- Balance checks (balance)\n\n' +
            'What would you like to do?';
    }
    /**
     * List available commands
     */
    listCommands() {
        return Object.keys(this.config.commands);
    }
    /**
     * Get command description
     */
    getCommandHelp(command) {
        return this.config.commands[command] || 'Command not found';
    }
    /**
     * Shutdown agent
     */
    async shutdown() {
        console.log('\n🛑 Shutting down agent...');
        await this.pluginManager.shutdownAll();
        console.log('✅ Agent shutdown complete\n');
    }
    /**
     * Parse command string to plugin.action
     */
    parseCommand(command) {
        const commandMap = {
            'swap': ['bitcoin', 'executeSwap'],
            'getQuote': ['bitcoin', 'getSwapQuote'],
            'createSession': ['account', 'createSessionKey'],
            'verifyProof': ['zkproof', 'verifyProof'],
            'checkBalance': ['bitcoin', 'getBTCBalance'],
            'register': ['zkproof', 'registerAgent']
        };
        return commandMap[command] || ['', ''];
    }
    /**
     * Handle swap commands
     */
    async handleSwapCommand(input) {
        // Extract swap details (simplified)
        const result = await this.executeCommand('getQuote', {
            fromCurrency: 'BTC',
            toCurrency: 'STRK',
            amount: '10000000' // 0.1 BTC in satoshis
        });
        if (result.success) {
            return `Swap Quote:\n` +
                `Input: ${result.data.inputAmount} BTC\n` +
                `Output: ${result.data.outputAmount} STRK\n` +
                `Rate: ${result.data.exchangeRate}\n` +
                `Fee: ${result.data.fee}\n\n` +
                `Would you like to execute this swap?`;
        }
        return `Error: ${result.error}`;
    }
    /**
     * Handle proof commands
     */
    async handleProofCommand(input) {
        const result = await this.executeCommand('verifyProof', {
            proof: '0x123...',
            publicInputs: [this.context.agentAddress, Date.now().toString()]
        });
        if (result.success) {
            return `ZK Proof Verification:\n` +
                `Status: ${result.data.isValid ? '✅ Valid' : '❌ Invalid'}\n` +
                `Reason: ${result.data.reason}`;
        }
        return `Error: ${result.error}`;
    }
    /**
     * Handle account commands
     */
    async handleAccountCommand(input) {
        const result = await this.executeCommand('createSession', {
            duration: 86400 // 24 hours
        });
        if (result.success) {
            return `Session Key Created:\n` +
                `Public Key: ${result.data.sessionPublicKey.substring(0, 20)}...\n` +
                `Expires: ${result.metadata.validUntil}\n` +
                `Permissions: Full access`;
        }
        return `Error: ${result.error}`;
    }
    /**
     * Handle balance commands
     */
    async handleBalanceCommand(input) {
        const result = await this.executeCommand('checkBalance', {});
        if (result.success) {
            return `Bitcoin Balance:\n` +
                `Address: ${result.data.address}\n` +
                `Balance: ${result.data.balanceBTC} BTC\n` +
                `Network: ${result.data.network}`;
        }
        return `Error: ${result.error}`;
    }
}
exports.BitZenAgent = BitZenAgent;
/**
 * Example usage
 */
async function runAgent() {
    const context = {
        agentAddress: process.env.ACCOUNT_ADDRESS || '0x123...',
        network: 'sepolia',
        rpcUrl: process.env.STARKNET_RPC_URL || '',
        backendUrl: process.env.BACKEND_URL || 'http://localhost:3001'
    };
    const configPath = path.join(__dirname, '../config/agents/bitzen.agent.json');
    const agent = new BitZenAgent(configPath, context);
    try {
        await agent.initialize();
        // Interactive mode
        console.log('💬 Chat with your agent (type "exit" to quit):\n');
        // Example commands
        const commands = [
            'What is my Bitcoin balance?',
            'Get quote for BTC to STRK swap',
            'Create a session key'
        ];
        for (const cmd of commands) {
            console.log(`\n> ${cmd}`);
            const response = await agent.processInput(cmd);
            console.log(`\n${response}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    catch (error) {
        console.error('Agent error:', error);
    }
    finally {
        await agent.shutdown();
    }
}
// Run if executed directly
if (require.main === module) {
    runAgent().catch(console.error);
}
//# sourceMappingURL=BitZenAgent.js.map