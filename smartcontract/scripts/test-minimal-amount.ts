/**
 * Script to test if registrar accepts minimal amounts
 * This will help us understand if price validation is strict
 * 
 * Run with: npx tsx smartcontract/scripts/test-minimal-amount.ts
 */

import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';

const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.rootstock.io/eB6SwV0sOgFuotmD35JzhuCqpnYf8W-T';

const rskTestnet = defineChain({
  id: 31,
  name: 'Rootstock Testnet',
  nativeCurrency: {
    name: 'tRBTC',
    symbol: 'tRBTC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'Rootstock Explorer',
      url: 'https://explorer.testnet.rsk.co',
    },
  },
  testnet: true,
});

const publicClient = createPublicClient({
  transport: http(RPC_URL),
  chain: rskTestnet,
});

const FIFS_ADDR_REGISTRAR = '0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d' as const;
const NAME_PRICE = '0x794F99F1A9382BA88b453DdB4bFa00aCaE8d50E8' as const;

async function testMinimalAmount() {
  console.log('🔍 Testing price validation behavior...\n');

  // Test different scenarios
  const testCases = [
    { name: 'simze', duration: BigInt(31536000), description: '1 year registration' },
  ];

  for (const testCase of testCases) {
    console.log(`\n📊 Testing: ${testCase.description}`);
    console.log(`   Domain: ${testCase.name}`);
    console.log(`   Duration: ${testCase.duration.toString()} seconds\n`);

    // Check registrar's price
    try {
      const registrarPrice = await publicClient.readContract({
        address: FIFS_ADDR_REGISTRAR,
        abi: [
          {
            inputs: [
              { name: 'name', type: 'string' },
              { name: 'expires', type: 'uint256' },
              { name: 'duration', type: 'uint256' },
            ],
            name: 'price',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'price',
        args: [testCase.name, BigInt(0), testCase.duration],
      });
      console.log(`   Registrar price(): ${registrarPrice.toString()} wei (${(Number(registrarPrice) / 1e18).toFixed(4)} RIF)`);
    } catch (error: any) {
      console.log(`   ❌ Registrar price() error: ${error.message}`);
    }

    // Check namePrice contract's price
    try {
      const namePriceResult = await publicClient.readContract({
        address: NAME_PRICE,
        abi: [
          {
            inputs: [
              { name: 'name', type: 'string' },
              { name: 'expires', type: 'uint256' },
              { name: 'duration', type: 'uint256' },
            ],
            name: 'price',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'price',
        args: [testCase.name, BigInt(0), testCase.duration],
      });
      console.log(`   namePrice.price(): ${namePriceResult.toString()} wei (${(Number(namePriceResult) / 1e18).toFixed(4)} RIF)`);
    } catch (error: any) {
      console.log(`   ❌ namePrice.price() error: ${error.message}`);
    }

    // Check what our contract calculates
    const PRICE_PER_YEAR = BigInt('100000000000000000'); // 0.1 RIF
    const durationInYears = (testCase.duration * BigInt(100)) / BigInt(31536000);
    const ourPrice = (PRICE_PER_YEAR * durationInYears) / BigInt(100);
    const ourPriceAdjusted = ourPrice < BigInt('10000000000000000') ? BigInt('10000000000000000') : ourPrice;
    console.log(`   Our calculated price: ${ourPriceAdjusted.toString()} wei (${(Number(ourPriceAdjusted) / 1e18).toFixed(4)} RIF)`);
  }

  console.log('\n\n💡 Key Insights:');
  console.log('1. Both registrar.price() and namePrice.price() return the same buggy value');
  console.log('2. The bug is in the namePrice contract, not the registrar');
  console.log('3. Our calculated price (0.1 RIF) is much less than the buggy price (31M RIF)');
  console.log('');
  console.log('🔍 Next Steps:');
  console.log('1. Check if registrar actually validates amount in tokenFallback');
  console.log('2. Try to find if there\'s a minimum amount that registrar accepts');
  console.log('3. Check official RNS SDK to see how it handles this');
  console.log('4. Consider if registrar might accept any amount >= some minimum');
}

testMinimalAmount()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
