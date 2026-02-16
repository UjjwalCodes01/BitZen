const { RpcProvider, Account } = require('starknet');

const ACCOUNT_ADDRESS = '0x018f34152a21b9B458e4511860bf594885c14003C453b7DE326c4053fcf2a7f1';
const RPC_URL = 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/K_hKu4IgnPgrF8O82GLuYU';
const ETH_ADDRESS = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'; // Sepolia ETH contract

async function checkBalance() {
  try {
    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    
    // Get ETH balance
    const balance = await provider.callContract({
      contractAddress: ETH_ADDRESS,
      entrypoint: 'balanceOf',
      calldata: [ACCOUNT_ADDRESS]
    });
    
    const balanceInWei = BigInt(balance.result[0]);
    const balanceInEth = Number(balanceInWei) / 1e18;
    
    console.log(`\n🔍 Account: ${ACCOUNT_ADDRESS}`);
    console.log(`💰 Balance: ${balanceInEth.toFixed(6)} ETH`);
    console.log(`   (${balanceInWei.toString()} wei)\n`);
    
    if (balanceInEth < 0.001) {
      console.log('⚠️  WARNING: Low balance! You need Sepolia ETH for gas fees.');
      console.log('   Get free Sepolia ETH from: https://starknet-faucet.vercel.app/\n');
    } else {
      console.log('✅ Balance looks good!\n');
    }
  } catch (error) {
    console.error('❌ Error checking balance:', error.message);
  }
}

checkBalance();
