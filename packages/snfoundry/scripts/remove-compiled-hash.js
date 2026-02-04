#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contracts = [
  'contracts_AgentAccount',
  'contracts_ZKPassport',
  'contracts_ServiceRegistry'
];

console.log('🔧 Removing compiled_class_hash from Sierra files...\n');

for (const contract of contracts) {
  const sierraPath = path.join(__dirname, '../contracts/target/dev', `${contract}.contract_class.json`);
  
  try {
    const sierra = JSON.parse(fs.readFileSync(sierraPath, 'utf8'));
    
    if (sierra.compiled_class_hash) {
      console.log(`✂️  Removing compiled_class_hash from ${contract}`);
      delete sierra.compiled_class_hash;
      fs.writeFileSync(sierraPath, JSON.stringify(sierra, null, 2));
      console.log(`✅ Fixed ${contract}.contract_class.json`);
    } else {
      console.log(`✓ ${contract} - already correct`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${contract}:`, error.message);
  }
}

console.log('\n🎉 Sierra files are now ready for declaration!\n');
