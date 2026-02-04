#!/usr/bin/env node

import { hash } from 'starknet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixClassHash(contractName) {
  const contractDir = path.join(__dirname, '../contracts/target/dev');
  const sierraPath = path.join(contractDir, `${contractName}.contract_class.json`);
  const casmPath = path.join(contractDir, `${contractName}.compiled_contract_class.json`);
  
  console.log(`\n🔧 Fixing class hash for ${contractName}...`);
  
  // Read files
  const sierra = JSON.parse(fs.readFileSync(sierraPath, 'utf8'));
  const casm = JSON.parse(fs.readFileSync(casmPath, 'utf8'));
  
  // Compute the correct compiled class hash
  const computedHash = hash.computeCompiledClassHash(casm);
  
  console.log(`📋 Sierra class hash: ${hash.computeSierraContractClassHash(sierra)}`);
  console.log(`📋 Expected CASM hash (from Sierra): ${sierra.compiled_class_hash}`);
  console.log(`📋 Actual CASM hash (computed): ${computedHash}`);
  
  if (sierra.compiled_class_hash !== computedHash) {
    console.log(`\n⚠️  Hash mismatch detected! Updating Sierra file...`);
    sierra.compiled_class_hash = computedHash;
    fs.writeFileSync(sierraPath, JSON.stringify(sierra, null, 2));
    console.log(`✅ Updated ${contractName}.contract_class.json with correct hash: ${computedHash}`);
  } else {
    console.log(`✅ Hashes match - no fix needed`);
  }
}

// Fix all three contracts
const contracts = [
  'contracts_AgentAccount',
  'contracts_ZKPassport',
  'contracts_ServiceRegistry'
];

console.log('🚀 Starting class hash verification and fix...\n');

for (const contract of contracts) {
  try {
    await fixClassHash(contract);
  } catch (error) {
    console.error(`❌ Error fixing ${contract}:`, error.message);
  }
}

console.log('\n🎉 Class hash fix complete!\n');
