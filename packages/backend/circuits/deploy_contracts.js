/**
 * Deploy ZK contracts on Starknet Sepolia using STRK v3 transactions.
 *
 * Usage (from packages/backend/):
 *   node circuits/deploy_contracts.js
 *
 * Actions:
 *  1. Declare Groth16VerifierBN254 (real Garaga verifier)
 *  2. Declare updated ZKPassport class
 *  3. Deploy ZKPassport instance pointing to Groth16VerifierBN254
 *
 * After running, update packages/backend/.env with the printed addresses.
 */

const { RpcProvider, Account, json, CallData, hash } = require('starknet');
const fs = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────────────────────────
const RPC_URL = 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/oX6CVMWKcDva93Z4ZrmZ1';
const DEPLOYER_ADDRESS = '0x0447ae02a8f08110852bd541d2d9fbf0d512cea73041cc579efb27bf8a1bf22e';
const PRIVATE_KEY = '0x06b7b806707e2f17ab5436da2edbdab6aed518cf70798436fd0a90fa40ed1442';

const WORKSPACE = path.resolve(__dirname, '../../..');

const GROTH16_SIERRA = path.join(WORKSPACE, 'packages/backend/circuits/agent_identity_verifier/target/release/agent_identity_verifier_Groth16VerifierBN254.contract_class.json');
const GROTH16_CASM   = path.join(WORKSPACE, 'packages/backend/circuits/agent_identity_verifier/target/release/agent_identity_verifier_Groth16VerifierBN254.compiled_contract_class.json');

const ZKPASSPORT_SIERRA = path.join(WORKSPACE, 'packages/snfoundry/contracts/target/release/contracts_ZKPassport.contract_class.json');
const ZKPASSPORT_CASM   = path.join(WORKSPACE, 'packages/snfoundry/contracts/target/release/contracts_ZKPassport.compiled_contract_class.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function readContract(sierraPath, casmPath) {
  return {
    contract: json.parse(fs.readFileSync(sierraPath, 'utf8')),
    casm: json.parse(fs.readFileSync(casmPath, 'utf8')),
  };
}

async function declareContract(account, provider, sierraPath, casmPath, label, nonce) {
  console.log(`\n  Declaring ${label} (nonce ${nonce})...`);
  const { contract, casm } = readContract(sierraPath, casmPath);

  try {
    const declareRes = await account.declare(
      { contract, casm },
      {
        version: 3,  // STRK v3 transaction
        nonce,
        blockIdentifier: 'latest',
      }
    );
    console.log(`  tx_hash: ${declareRes.transaction_hash}`);
    console.log(`  class_hash: ${declareRes.class_hash}`);
    console.log(`  Waiting for confirmation...`);
    await provider.waitForTransaction(declareRes.transaction_hash);
    console.log(`  ✓ Confirmed: ${declareRes.class_hash}`);
    return declareRes.class_hash;
  } catch (err) {
    const msg = err.message || String(err);
    // "Class already declared" is ok — the class_hash is deterministic
    if (msg.includes('already declared') || msg.includes('ClassAlreadyDeclared') || msg.includes('class_already_declared')) {
      // For already-declared contracts, compute the class hash from Sierra
      const { hash: { computeSierraContractClassHash } } = require('starknet');
      const classHash = computeSierraContractClassHash(contract);
      console.log(`  Already declared: ${classHash}`);
      return classHash;
    }
    throw err;
  }
}

async function main() {
  console.log('Connecting to Sepolia RPC...');
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, DEPLOYER_ADDRESS, PRIVATE_KEY, undefined, '0x3');

  const nonceHex = await provider.getNonceForAddress(DEPLOYER_ADDRESS, 'latest');
  const currentNonce = parseInt(nonceHex, 16);
  console.log(`Deployer: ${DEPLOYER_ADDRESS}`);
  console.log(`Nonce: ${currentNonce}`);

  // Step 1: Declare Groth16VerifierBN254
  const groth16ClassHash = await declareContract(account, provider, GROTH16_SIERRA, GROTH16_CASM, 'Groth16VerifierBN254', currentNonce);
  const postGroth16Nonce = currentNonce + 1;

  // Step 2: Declare ZKPassport
  const zkpClassHash = await declareContract(account, provider, ZKPASSPORT_SIERRA, ZKPASSPORT_CASM, 'ZKPassport', postGroth16Nonce);
  const postZkpNonce = postGroth16Nonce + 1;

  // Step 3: Deploy ZKPassport
  console.log('\n  Deploying ZKPassport instance...');
  const constructorCalldata = CallData.compile({
    admin: DEPLOYER_ADDRESS,
    verifier_class_hash: groth16ClassHash,
  });

  const deployRes = await account.deployContract(
    {
      classHash: zkpClassHash,
      constructorCalldata,
    },
    {
      version: 3,  // STRK v3
      nonce: postZkpNonce,
      blockIdentifier: 'latest',
    }
  );
  console.log(`  deploy tx_hash: ${deployRes.transaction_hash}`);
  console.log('  Waiting for confirmation...');
  await provider.waitForTransaction(deployRes.transaction_hash);
  const zkpassportAddress = deployRes.contract_address;
  console.log(`  ✓ ZKPassport deployed at: ${zkpassportAddress}`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Groth16VerifierBN254 class: ${groth16ClassHash}`);
  console.log(`ZKPassport class:           ${zkpClassHash}`);
  console.log(`ZKPassport address:         ${zkpassportAddress}`);
  console.log();
  console.log('Update packages/backend/.env:');
  console.log(`ZKPASSPORT_ADDRESS=${zkpassportAddress}`);
  console.log(`GARAGA_VERIFIER_CLASS_HASH=${groth16ClassHash}`);
}

main().catch((e) => {
  console.error('FATAL:', e.message || e);
  process.exit(1);
});
