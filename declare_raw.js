#!/usr/bin/env node
// Raw declare script using starknet.js v7 + fetch
const fs = require('fs');
const starknet = require('/tmp/sn7/node_modules/starknet');
const { hash, CallData } = starknet;
const ec = starknet.ec;

const RPC = process.env.RPC_URL || 'https://starknet-sepolia.drpc.org';
const ADDR = '0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e';
const PK = '0x2b8f583c70a829a3a3f2fd12005eb3a7ea28a9c9a24c85e657022e4ee66f18';
const CHAIN_ID = '0x534e5f5345504f4c4941'; // SN_SEPOLIA

const toHex = (v) => '0x' + BigInt(v).toString(16);

async function rpcCall(method, params) {
    const resp = await fetch(RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, id: 1, params }),
    });
    return resp.json();
}

async function declareContract(sierraPath, compiledClassHash, nonce) {
    console.log(`\n=== Declaring: ${sierraPath} ===`);
    console.log(`Compiled class hash: ${compiledClassHash}`);
    console.log(`Nonce: ${nonce}`);

    // Read Sierra JSON
    const sierra = JSON.parse(fs.readFileSync(sierraPath, 'utf-8'));
    
    // Compute Sierra class hash
    const classHash = hash.computeContractClassHash(sierra);
    console.log(`Sierra class hash: ${classHash}`);

    // Check if already declared
    const checkResult = await rpcCall('starknet_getClass', { block_id: 'latest', class_hash: classHash });
    if (!checkResult.error) {
        console.log('Class already declared!');
        return classHash;
    }

    // Flatten sierra_program to hex strings
    const flatSierra = sierra.sierra_program.map(s => {
        if (typeof s === 'string' && s.startsWith('0x')) return s;
        return toHex(s);
    });

    // Build resource bounds (generous for declare)
    const resourceBounds = {
        l2_gas: { max_amount: '0x1e8480', max_price_per_unit: '0x4a817c800' },
        l1_gas: { max_amount: '0x0', max_price_per_unit: '0x5af3107a4000' },
        l1_data_gas: { max_amount: '0x4000', max_price_per_unit: '0xf4240' },
    };

    // Prepare contract_class for RPC
    const contract_class = {
        sierra_program: flatSierra,
        contract_class_version: sierra.contract_class_version,
        entry_points_by_type: sierra.entry_points_by_type,
        abi: "[]", // Strip ABI to reduce payload size
    };

    // Compute declare tx hash
    const txHash = hash.calculateDeclareTransactionHash({
        classHash,
        compiledClassHash,
        senderAddress: ADDR,
        version: '0x3',
        chainId: CHAIN_ID,
        nonce: toHex(nonce),
        accountDeploymentData: [],
        nonceDataAvailabilityMode: 0,
        feeDataAvailabilityMode: 0,
        resourceBounds,
        tip: 0n,
        paymasterData: [],
    });
    console.log(`TX hash: ${txHash}`);

    // Sign
    const sig = ec.starkCurve.sign(txHash.slice(2), PK.slice(2));
    const signature = [toHex(sig.r), toHex(sig.s)];

    // Send declare transaction
    const declareBody = {
        type: 'DECLARE',
        sender_address: ADDR,
        compiled_class_hash: compiledClassHash,
        version: '0x3',
        signature,
        nonce: toHex(nonce),
        contract_class,
        resource_bounds: {
            l1_gas: resourceBounds.l1_gas,
            l2_gas: resourceBounds.l2_gas,
            l1_data_gas: resourceBounds.l1_data_gas,
        },
        tip: '0x0',
        paymaster_data: [],
        account_deployment_data: [],
        nonce_data_availability_mode: 'L1',
        fee_data_availability_mode: 'L1',
    };

    console.log('Sending declare... payload size:', JSON.stringify({ declare_transaction: declareBody }).length);
    const resp = await fetch(RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'starknet_addDeclareTransaction', id: 1, params: { declare_transaction: declareBody } }),
    });
    console.log('HTTP status:', resp.status);
    const text = await resp.text();
    let result;
    if (text.startsWith('{')) {
        result = JSON.parse(text);
        console.log('Result:', JSON.stringify(result, null, 2));
    } else {
        console.log('Non-JSON response:', text.slice(0, 500));
        return classHash;
    }

    if (result.result) {
        console.log(`\nSUCCESS! TX: ${result.result.transaction_hash}`);
        console.log(`Class hash: ${result.result.class_hash}`);
    }
    
    return classHash;
}

(async () => {
    const mode = process.argv[2] || 'verifier';
    
    if (mode === 'verifier') {
        const sierraPath = 'packages/backend/circuits/agent_identity_verifier/target/dev/agent_identity_verifier_Groth16VerifierBN254.contract_class.json';
        // This was the compiled hash accepted by the sequencer simulation
        const compiledClassHash = '0xb9b5e9716cc6d7c91944d656f053168c623594b09fbc9fce1b3d810bae8f1a';
        const nonce = parseInt(process.argv[3] || '10');
        await declareContract(sierraPath, compiledClassHash, nonce);
    } else if (mode === 'zkpassport') {
        const sierraPath = 'packages/snfoundry/contracts/target/dev/contracts_ZKPassport.contract_class.json';
        // Compute CASM hash from file
        const casmPath = 'packages/snfoundry/contracts/target/dev/contracts_ZKPassport.compiled_contract_class.json';
        const casm = JSON.parse(fs.readFileSync(casmPath, 'utf-8'));
        const compiledClassHash = hash.computeCompiledClassHash(casm);
        console.log('ZKPassport compiled hash:', compiledClassHash);
        const nonce = parseInt(process.argv[3] || '11');
        await declareContract(sierraPath, compiledClassHash, nonce);
    }
})();
