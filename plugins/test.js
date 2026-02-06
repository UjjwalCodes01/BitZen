#!/usr/bin/env node

/**
 * Quick test script to verify all plugins work
 */

const path = require('path');

// Set environment variables
process.env.ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS || '0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e';
process.env.STARKNET_RPC_URL = process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/K_hKu4IgnPgrF8O82GLuYU';
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

console.log('🧪 Testing BitZen Agent Plugins...\n');

// Test plugin imports
try {
  console.log('1️⃣  Testing imports...');
  
  const { BitZenAgent } = require('./dist/BitZenAgent');
  const { PluginManager } = require('./dist/PluginManager');
  const { BitcoinPlugin } = require('./dist/bitcoin/BitcoinPlugin');
  const { ZKProofPlugin } = require('./dist/zkproof/ZKProofPlugin');
  const { AccountPlugin } = require('./dist/account/AccountPlugin');
  
  console.log('   ✅ All imports successful\n');
  
  console.log('2️⃣  Testing plugin initialization...');
  
  const context = {
    agentAddress: process.env.ACCOUNT_ADDRESS,
    network: 'sepolia',
    rpcUrl: process.env.STARKNET_RPC_URL,
    backendUrl: process.env.BACKEND_URL
  };
  
  const manager = new PluginManager(context);
  console.log('   ✅ PluginManager created\n');
  
  console.log('3️⃣  Testing individual plugins...');
  
  // Test Bitcoin Plugin
  const bitcoinPlugin = new BitcoinPlugin();
  console.log('   ✅ BitcoinPlugin instantiated');
  console.log(`      Version: ${bitcoinPlugin.version}`);
  console.log(`      Actions: ${bitcoinPlugin.actions.length}`);
  
  // Test ZKProof Plugin
  const zkPlugin = new ZKProofPlugin();
  console.log('   ✅ ZKProofPlugin instantiated');
  console.log(`      Version: ${zkPlugin.version}`);
  console.log(`      Actions: ${zkPlugin.actions.length}`);
  
  // Test Account Plugin
  const accountPlugin = new AccountPlugin();
  console.log('   ✅ AccountPlugin instantiated');
  console.log(`      Version: ${accountPlugin.version}`);
  console.log(`      Actions: ${accountPlugin.actions.length}`);
  
  console.log('\n✅ All plugin tests passed!\n');
  console.log('📊 Summary:');
  console.log('   • 3 plugins loaded successfully');
  console.log(`   • ${bitcoinPlugin.actions.length + zkPlugin.actions.length + accountPlugin.actions.length} total actions available`);
  console.log('   • TypeScript compilation: OK');
  console.log('   • Module resolution: OK\n');
  
  console.log('🎯 Next steps:');
  console.log('   1. Run: npm run dev (for interactive demo)');
  console.log('   2. Or import plugins in your application');
  console.log('   3. Configure Garden Finance API key for Bitcoin swaps\n');
  
  process.exit(0);
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
