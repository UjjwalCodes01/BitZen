/**
 * BitZen Contract Deployment Script
 * Declares and deploys AgentAccount, ZKPassport, and ServiceRegistry to Starknet Sepolia
 */

import { Account, RpcProvider, Contract, json, CallData, cairo } from 'starknet';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root
const envPath = join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const CONTRACTS_DIR = join(__dirname, '../contracts/target/dev');
const DEPLOYMENTS_FILE = join(__dirname, '../deployments.json');

// Configuration  
const config = {
  rpcUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/qyPICPWvQsBb6AiN5qUo-GzKSZF-HMzA',
  privateKey: '0x06b7b806707e2f17ab5436da2edbdab6aed518cf70798436fd0a90fa40ed1442',
  accountAddress: '0x018f34152a21b9B458e4511860bf594885c14003C453b7DE326c4053fcf2a7f1',
  garagaVerifierClassHash: '0x1', // Dummy for now
  strkTokenSepolia: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  minStakeAmount: cairo.uint256(1000000000000000000), // 1 STRK
  slashThreshold: 70, // 70% reputation threshold
};

// Validate configuration (skip for devnet)
console.log('🔧 Using devnet at:', config.rpcUrl);

console.log('🚀 BitZen Deployment Script');
console.log('========================================');
console.log(`Network: Starknet Sepolia`);
console.log(`Account: ${config.accountAddress}`);
console.log(`Private Key: ${config.privateKey ? 'Found' : 'Missing'}`);
console.log(`RPC: ${config.rpcUrl}\n`);

// Initialize provider and account
const provider = new RpcProvider({ nodeUrl: config.rpcUrl });
console.log(`Provider initialized...`);
console.log(`Creating account with address: ${config.accountAddress}`);

// For starknet.js 8.x, Account constructor takes an object
const account = new Account({
  provider,
  address: config.accountAddress,
  signer: config.privateKey,
  cairoVersion: "1",
});

/**
 * Declare a contract and return its class hash
 */
async function declareContract(contractName) {
  console.log(`\n📝 Declaring ${contractName}...`);
  
  try {
    const compiledContract = json.parse(
      readFileSync(join(CONTRACTS_DIR, `contracts_${contractName}.contract_class.json`), 'utf8')
    );
    
    const compiledCasm = json.parse(
      readFileSync(join(CONTRACTS_DIR, `contracts_${contractName}.compiled_contract_class.json`), 'utf8')
    );

    const declareResponse = await account.declareIfNot({
      contract: compiledContract,
      casm: compiledCasm,
    });

    if (declareResponse.transaction_hash) {
      console.log(`   Transaction hash: ${declareResponse.transaction_hash}`);
      console.log(`   Waiting for transaction...`);
      await provider.waitForTransaction(declareResponse.transaction_hash);
    }

    console.log(`   ✅ Class hash: ${declareResponse.class_hash}`);
    return declareResponse.class_hash;
    
  } catch (error) {
    if (error.message?.includes('Class already declared')) {
      // Extract class hash from error or recompute
      console.log(`   ℹ️  Contract already declared`);
      const compiledContract = json.parse(
        readFileSync(join(CONTRACTS_DIR, `contracts_${contractName}.contract_class.json`), 'utf8')
      );
      // The class hash should be in the error or we can compute it
      throw new Error('Contract already declared - please provide class hash manually');
    }
    console.error(`   ❌ Error declaring ${contractName}:`, error.message);
    throw error;
  }
}

/**
 * Deploy a contract using its class hash
 */
async function deployContract(contractName, classHash, constructorCalldata) {
  console.log(`\n🚢 Deploying ${contractName}...`);
  
  try {
    const deployResponse = await account.deployContract({
      classHash,
      constructorCalldata,
    });

    console.log(`   Transaction hash: ${deployResponse.transaction_hash}`);
    console.log(`   Waiting for transaction...`);
    await provider.waitForTransaction(deployResponse.transaction_hash);
    
    console.log(`   ✅ Deployed at: ${deployResponse.contract_address}`);
    return deployResponse.contract_address;
    
  } catch (error) {
    console.error(`   ❌ Error deploying ${contractName}:`, error.message);
    throw error;
  }
}

/**
 * Main deployment flow
 */
async function main() {
  const deployments = {};
  
  try {
    // Step 1: Declare all contracts
    console.log('\n📋 STEP 1: DECLARING CONTRACTS');
    console.log('========================================');
    
    const agentAccountClassHash = await declareContract('AgentAccount');
    deployments.AgentAccount = { classHash: agentAccountClassHash };
    
    const zkPassportClassHash = await declareContract('ZKPassport');
    deployments.ZKPassport = { classHash: zkPassportClassHash };
    
    const serviceRegistryClassHash = await declareContract('ServiceRegistry');
    deployments.ServiceRegistry = { classHash: serviceRegistryClassHash };

    // Step 2: Deploy contracts
    console.log('\n\n🏗️  STEP 2: DEPLOYING CONTRACTS');
    console.log('========================================');

    // Deploy AgentAccount
    const agentAccountAddress = await deployContract(
      'AgentAccount',
      agentAccountClassHash,
      CallData.compile({ owner: config.accountAddress })
    );
    deployments.AgentAccount.address = agentAccountAddress;

    // Deploy ZKPassport
    const zkPassportAddress = await deployContract(
      'ZKPassport',
      zkPassportClassHash,
      CallData.compile({
        admin: config.accountAddress,
        verifier_class_hash: config.garagaVerifierClassHash,
      })
    );
    deployments.ZKPassport.address = zkPassportAddress;

    // Deploy ServiceRegistry
    const serviceRegistryAddress = await deployContract(
      'ServiceRegistry',
      serviceRegistryClassHash,
      CallData.compile({
        admin: config.accountAddress,
        strk_token: config.strkTokenSepolia,
        min_stake: config.minStakeAmount,
        slash_threshold: config.slashThreshold,
      })
    );
    deployments.ServiceRegistry.address = serviceRegistryAddress;

    // Step 3: Save deployment info
    console.log('\n\n💾 STEP 3: SAVING DEPLOYMENT INFO');
    console.log('========================================');
    
    const deploymentData = {
      network: 'sepolia',
      timestamp: new Date().toISOString(),
      deployer: config.accountAddress,
      contracts: deployments,
    };

    writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(deploymentData, null, 2));
    console.log(`   ✅ Saved to ${DEPLOYMENTS_FILE}`);

    // Print summary
    console.log('\n\n🎉 DEPLOYMENT COMPLETE!');
    console.log('========================================');
    console.log('\nDeployed Contracts:');
    console.log(`\n📋 AgentAccount:`);
    console.log(`   Class Hash: ${agentAccountClassHash}`);
    console.log(`   Address: ${agentAccountAddress}`);
    console.log(`\n📋 ZKPassport:`);
    console.log(`   Class Hash: ${zkPassportClassHash}`);
    console.log(`   Address: ${zkPassportAddress}`);
    console.log(`\n📋 ServiceRegistry:`);
    console.log(`   Class Hash: ${serviceRegistryClassHash}`);
    console.log(`   Address: ${serviceRegistryAddress}`);
    console.log('\n========================================\n');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    
    // Save partial deployment info if any contracts were deployed
    if (Object.keys(deployments).length > 0) {
      const partialData = {
        network: 'sepolia',
        timestamp: new Date().toISOString(),
        deployer: config.accountAddress,
        status: 'partial',
        contracts: deployments,
      };
      writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(partialData, null, 2));
      console.log(`\n💾 Partial deployment info saved to ${DEPLOYMENTS_FILE}`);
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
