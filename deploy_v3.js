// Deploy script using starknet.js v3 transactions (STRK fees)
// Handles compiled class hash mismatch by simulating first
const starknet = require('./packages/backend/node_modules/starknet');
const { Account, RpcProvider, hash, CallData } = starknet;
const fs = require('fs');
const path = require('path');

const RPC_URL = 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/oX6CVMWKcDva93Z4ZrmZ1';
const DEPLOYER_ADDRESS = '0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e';
const DEPLOYER_PK = '0x06b7b806707e2f17ab5436da2edbdab6aed518cf70798436fd0a90fa40ed1442';

const VERIFIER_SIERRA = path.join(__dirname, 'packages/backend/circuits/agent_identity_verifier/target/dev/agent_identity_verifier_Groth16VerifierBN254.contract_class.json');
const VERIFIER_CASM = path.join(__dirname, 'packages/backend/circuits/agent_identity_verifier/target/dev/agent_identity_verifier_Groth16VerifierBN254.compiled_contract_class.json');
const ZKPASSPORT_SIERRA = path.join(__dirname, 'packages/snfoundry/contracts/target/dev/contracts_ZKPassport.contract_class.json');
const ZKPASSPORT_CASM = path.join(__dirname, 'packages/snfoundry/contracts/target/dev/contracts_ZKPassport.compiled_contract_class.json');

// Known compiled class hashes from sequencer simulation errors
const KNOWN_VERIFIER_COMPILED_HASH = '0xb9b5e9716cc6d7c91944d656f053168c623594b09fbc9fce1b3d810bae8f1a';

function extractExpectedHash(errMsg) {
    const match = errMsg.match(/Expected:\s*(0x[0-9a-fA-F]+)/);
    return match ? match[1] : null;
}

async function declareContract(account, provider, sierraPath, casmPath, name, nonce, knownCompiledHash) {
    const sierra = JSON.parse(fs.readFileSync(sierraPath, 'utf8'));
    const casm = JSON.parse(fs.readFileSync(casmPath, 'utf8'));
    
    const classHash = hash.computeContractClassHash(sierra);
    const localCasmHash = hash.computeCompiledClassHash(casm);
    console.log(`  Class hash: ${classHash}`);
    console.log(`  Local CASM hash: ${localCasmHash}`);
    
    // Check if already declared
    try {
        await provider.getClassByHash(classHash);
        console.log(`  Already declared! Skipping.`);
        return { classHash, alreadyDeclared: true };
    } catch (e) {
        // Not declared
    }
    
    const compiledClassHash = knownCompiledHash || localCasmHash;
    console.log(`  Using compiled hash: ${compiledClassHash}`);
    
    const txDetails = {
        nonce: nonce,
        version: '0x3',
        resourceBounds: {
            l1_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
            l2_gas: { max_amount: '0x3D0900', max_price_per_unit: '0x2540BE400' },
            l1_data_gas: { max_amount: '0x30D40', max_price_per_unit: '0x2540BE400' },
        },
        tip: '0x0',
        paymasterData: [],
        accountDeploymentData: [],
        nonceDataAvailabilityMode: 'L1',
        feeDataAvailabilityMode: 'L1',
    };
    
    async function tryDeclare(compiledHash) {
        const result = await account.declare(
            { contract: sierra, compiledClassHash: compiledHash },
            txDetails
        );
        console.log(`  TX hash: ${result.transaction_hash}`);
        console.log(`  Waiting for confirmation...`);
        const receipt = await provider.waitForTransaction(result.transaction_hash, { retryInterval: 5000 });
        console.log(`  Status: ${receipt.execution_status || receipt.finality_status || 'confirmed'}`);
        return { classHash, txHash: result.transaction_hash };
    }
    
    try {
        return await tryDeclare(compiledClassHash);
    } catch (err) {
        const errMsg = err.message || JSON.stringify(err);
        console.log(`  Error: ${errMsg.substring(0, 300)}`);
        
        const expectedHash = extractExpectedHash(errMsg);
        if (expectedHash && expectedHash !== compiledClassHash) {
            console.log(`  Sequencer expects: ${expectedHash}`);
            console.log(`  Retrying with correct hash...`);
            return await tryDeclare(expectedHash);
        }
        throw err;
    }
}

async function main() {
    console.log('=== BitZen V3 Deployment (STRK fees) ===\n');
    
    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    const chainId = await provider.getChainId();
    console.log('Chain:', chainId);
    
    const nonce = await provider.getNonceForAddress(DEPLOYER_ADDRESS);
    console.log('Nonce:', parseInt(nonce, 16));
    
    const account = new Account(provider, DEPLOYER_ADDRESS, DEPLOYER_PK, '1');
    
    // === DECLARE Groth16VerifierBN254 ===
    console.log('\n--- Declare Groth16VerifierBN254 ---');
    const verifierResult = await declareContract(
        account, provider,
        VERIFIER_SIERRA, VERIFIER_CASM,
        'Groth16VerifierBN254',
        parseInt(nonce, 16),
        KNOWN_VERIFIER_COMPILED_HASH
    );
    console.log('  Done:', JSON.stringify(verifierResult));
    
    // === DECLARE ZKPassport ===
    const nonce2 = await provider.getNonceForAddress(DEPLOYER_ADDRESS);
    console.log('\n--- Declare ZKPassport ---');
    const zkResult = await declareContract(
        account, provider,
        ZKPASSPORT_SIERRA, ZKPASSPORT_CASM,
        'ZKPassport',
        parseInt(nonce2, 16),
        null
    );
    console.log('  Done:', JSON.stringify(zkResult));
    
    // === DEPLOY ZKPassport ===
    const nonce3 = await provider.getNonceForAddress(DEPLOYER_ADDRESS);
    console.log('\n--- Deploy ZKPassport ---');
    
    const constructorCalldata = CallData.compile({
        owner: DEPLOYER_ADDRESS,
        verifier_class_hash: verifierResult.classHash,
    });
    console.log('  Constructor:', constructorCalldata);
    
    const deployResult = await account.deployContract(
        { classHash: zkResult.classHash, constructorCalldata },
        {
            nonce: parseInt(nonce3, 16),
            version: '0x3',
            resourceBounds: {
                l1_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
                l2_gas: { max_amount: '0x3D0900', max_price_per_unit: '0x2540BE400' },
                l1_data_gas: { max_amount: '0x30D40', max_price_per_unit: '0x2540BE400' },
            },
            tip: '0x0',
            paymasterData: [],
            accountDeploymentData: [],
            nonceDataAvailabilityMode: 'L1',
            feeDataAvailabilityMode: 'L1',
        }
    );
    
    console.log('  Deploy TX:', deployResult.transaction_hash);
    console.log('  Contract:', deployResult.contract_address);
    console.log('  Waiting...');
    await provider.waitForTransaction(deployResult.transaction_hash, { retryInterval: 5000 });
    
    const deployInfo = {
        network: 'starknet-sepolia',
        groth16VerifierBN254ClassHash: verifierResult.classHash,
        zkpassportClassHash: zkResult.classHash,
        zkpassportAddress: deployResult.contract_address,
        deployedAt: new Date().toISOString(),
    };
    
    console.log('\n=== DEPLOYMENT COMPLETE ===');
    console.log(JSON.stringify(deployInfo, null, 2));
    fs.writeFileSync(path.join(__dirname, 'deployment_result.json'), JSON.stringify(deployInfo, null, 2));
}

main().catch(err => {
    console.error('\nFATAL:', err.message || err);
    process.exit(1);
});
