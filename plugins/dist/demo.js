#!/usr/bin/env ts-node
"use strict";
/**
 * BitZen Agent - Quick Start Example
 *
 * Demonstrates all plugin capabilities
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
exports.runDemo = main;
const BitZenAgent_1 = require("./BitZenAgent");
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║            🤖 BitZen AI Agent Demo                      ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    // Setup agent context
    const context = {
        agentAddress: process.env.ACCOUNT_ADDRESS || '',
        network: 'sepolia',
        rpcUrl: process.env.STARKNET_RPC_URL || '',
        backendUrl: process.env.BACKEND_URL || 'http://localhost:3001'
    };
    if (!context.agentAddress) {
        console.error('❌ Error: ACCOUNT_ADDRESS not set in .env');
        process.exit(1);
    }
    // Initialize agent
    const configPath = path.join(__dirname, '../config/agents/bitzen.agent.json');
    const agent = new BitZenAgent_1.BitZenAgent(configPath, context);
    try {
        await agent.initialize();
        console.log('\n📚 Available Commands:');
        const commands = agent.listCommands();
        commands.forEach(cmd => {
            console.log(`   • ${cmd}: ${agent.getCommandHelp(cmd)}`);
        });
        // Demo 1: Bitcoin Balance Check
        console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🪙 Demo 1: Bitcoin Balance Check');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        const balanceResult = await agent.pluginManager.executeAction('bitcoin', 'getBTCBalance', {});
        if (balanceResult.success) {
            console.log('✅ Balance Retrieved:');
            console.log(`   Address: ${balanceResult.data.address}`);
            console.log(`   Balance: ${balanceResult.data.balanceBTC} BTC`);
            console.log(`   Network: ${balanceResult.data.network}`);
        }
        else {
            console.log(`❌ Error: ${balanceResult.error}`);
        }
        // Demo 2: Swap Quote
        console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💱 Demo 2: BTC → STRK Swap Quote');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        const quoteResult = await agent.pluginManager.executeAction('bitcoin', 'getSwapQuote', {
            fromCurrency: 'BTC',
            toCurrency: 'STRK',
            amount: '10000000' // 0.1 BTC
        });
        if (quoteResult.success) {
            console.log('✅ Quote Retrieved:');
            console.log(`   Input: ${(parseInt(quoteResult.data.inputAmount) / 100000000).toFixed(8)} BTC`);
            console.log(`   Output: ~${quoteResult.data.outputAmount} wei STRK`);
            console.log(`   Exchange Rate: ${quoteResult.data.exchangeRate}`);
            console.log(`   Fee: ${quoteResult.data.fee} satoshis`);
            console.log(`   Slippage: ${(quoteResult.data.slippage * 100).toFixed(2)}%`);
            console.log(`   Est. Time: ${quoteResult.data.estimatedTime}s`);
        }
        else {
            console.log(`⚠️  Note: ${quoteResult.error}`);
            console.log('   (This is expected in demo mode without real Garden API)');
        }
        // Demo 3: ZK Proof Generation
        console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔐 Demo 3: ZK Proof Generation');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        const proofResult = await agent.pluginManager.executeAction('zkproof', 'generateProof', {
            agentAddress: context.agentAddress,
            message: 'Hackathon demo proof'
        });
        if (proofResult.success) {
            console.log('✅ ZK Proof Generated:');
            console.log(`   Proof Hash: ${proofResult.data.proof.substring(0, 30)}...`);
            console.log(`   Agent: ${proofResult.data.publicInputs[0].substring(0, 20)}...`);
            console.log(`   Verifier: ${proofResult.data.verifierType}`);
            console.log(`   Valid Until: ${proofResult.metadata.validUntil}`);
            console.log(`   Timestamp: ${proofResult.data.timestamp}`);
        }
        else {
            console.log(`❌ Error: ${proofResult.error}`);
        }
        // Demo 4: Session Key Creation
        console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔑 Demo 4: Session Key Creation');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        const sessionResult = await agent.pluginManager.executeAction('account', 'createSessionKey', {
            duration: 86400, // 24 hours
            permissions: {
                canExecuteTasks: true,
                canMakeSwaps: true,
                canStake: false,
                maxDailySpend: '1000000000000000000', // 1 STRK
                maxTransactionAmount: '100000000000000000' // 0.1 STRK
            }
        });
        if (sessionResult.success) {
            console.log('✅ Session Key Created:');
            console.log(`   Public Key: ${sessionResult.data.sessionPublicKey.substring(0, 30)}...`);
            console.log(`   Agent: ${sessionResult.data.agentAddress.substring(0, 20)}...`);
            console.log(`   Expires: ${sessionResult.metadata.validUntil}`);
            console.log(`   Permissions:`);
            console.log(`      • Execute Tasks: ${sessionResult.data.permissions.canExecuteTasks}`);
            console.log(`      • Make Swaps: ${sessionResult.data.permissions.canMakeSwaps}`);
            console.log(`      • Stake: ${sessionResult.data.permissions.canStake}`);
            console.log(`      • Max Daily: ${sessionResult.data.permissions.maxDailySpend} wei`);
        }
        else {
            console.log(`⚠️  Note: ${sessionResult.error}`);
            console.log('   (Backend API must be running for session storage)');
        }
        // Demo 5: Natural Language Processing
        console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💬 Demo 5: Natural Language Processing');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        const queries = [
            'What is my Bitcoin balance?',
            'Get quote for BTC to STRK swap',
            'Create a session key',
            'Verify a ZK proof'
        ];
        for (const query of queries) {
            console.log(`\n👤 User: "${query}"`);
            const response = await agent.processInput(query);
            console.log(`🤖 Agent:\n${response}`);
        }
        // Summary
        console.log('\n\n╔══════════════════════════════════════════════════════════╗');
        console.log('║                                                          ║');
        console.log('║                 ✅ Demo Complete!                        ║');
        console.log('║                                                          ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');
        console.log('📊 Plugin Status:');
        const health = await agent.pluginManager.healthCheckAll();
        Object.entries(health).forEach(([plugin, status]) => {
            console.log(`   ${status ? '✅' : '❌'} ${plugin}: ${status ? 'Healthy' : 'Offline'}`);
        });
        console.log('\n🎯 Next Steps:');
        console.log('   1. Get Garden Finance API key for real swaps');
        console.log('   2. Connect to Bitcoin testnet wallet');
        console.log('   3. Deploy to production with Garaga verifier');
        console.log('   4. Build frontend UI for agent interaction');
        console.log('   5. Submit to RE{DEFINE} hackathon! 🚀\n');
    }
    catch (error) {
        console.error('\n❌ Error:', error);
    }
    finally {
        await agent.shutdown();
    }
}
// Run demo
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=demo.js.map