/**
 * Comprehensive test script to understand registrar's amount validation
 * Tests different amounts to see what the registrar accepts
 * 
 * Run with: npx tsx smartcontract/scripts/test-registrar-amounts.ts
 */

import { createPublicClient, http, encodePacked, keccak256, toBytes } from 'viem';
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

// Contract addresses
const FIFS_ADDR_REGISTRAR = '0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d' as const;
const RIF_TOKEN = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe' as const;
const NAME_PRICE = '0x794F99F1A9382BA88b453DdB4bFa00aCaE8d50E8' as const;

async function testRegistrarAmounts() {
  console.log('🔍 Testing Registrar Amount Validation\n');
  console.log('This script will help us understand what amounts the registrar accepts.\n');

  // Test parameters
  const testName = 'simze';
  const testOwner = '0x34C775FB2fe2b8383B5659B3f7Fc1E721Ca04A3a' as const;
  const testSecret = '0x301d91211185d06ae2d606ce3e04df6b2075f4a72c4e7f8f8384f52735cca1b2' as const;
  const testDuration = BigInt(31536000); // 1 year
  const testAddr = '0x34C775FB2fe2b8383B5659B3f7Fc1E721Ca04A3a' as const;

  // Test amounts to try
  const testAmounts = [
    { name: '1 wei', value: BigInt(1) },
    { name: '0.0001 RIF', value: BigInt('100000000000000') }, // 0.0001 RIF
    { name: '0.01 RIF', value: BigInt('10000000000000000') }, // 0.01 RIF
    { name: '0.1 RIF', value: BigInt('100000000000000000') }, // 0.1 RIF (our current)
    { name: '1 RIF', value: BigInt('1000000000000000000') }, // 1 RIF
    { name: '10 RIF', value: BigInt('10000000000000000000') }, // 10 RIF
    { name: '100 RIF', value: BigInt('100000000000000000000') }, // 100 RIF
    { name: 'Buggy price', value: BigInt('31536002000000000000000000') }, // 31,536,002 RIF
  ];

  console.log('📊 Step 1: Getting expected price from registrar...\n');
  
  let expectedPrice: bigint;
  try {
    expectedPrice = await publicClient.readContract({
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
      args: [testName, BigInt(0), testDuration],
    });
    
    const expectedPriceRIF = Number(expectedPrice) / 1e18;
    console.log(`  namePrice.price(): ${expectedPrice.toString()} wei`);
    console.log(`  Expected price: ${expectedPriceRIF.toFixed(4)} RIF\n`);
  } catch (error: any) {
    console.error(`  ❌ Error getting price: ${error.message}`);
    return;
  }

  // Step 2: Check commitment
  console.log('📊 Step 2: Checking commitment status...\n');
  
  try {
    const labelHash = keccak256(toBytes(testName));
    const commitment = await publicClient.readContract({
      address: FIFS_ADDR_REGISTRAR,
      abi: [
        {
          inputs: [
            { name: 'label', type: 'bytes32' },
            { name: 'nameOwner', type: 'address' },
            { name: 'secret', type: 'bytes32' },
          ],
          name: 'makeCommitment',
          outputs: [{ name: '', type: 'bytes32' }],
          stateMutability: 'pure',
          type: 'function',
        },
        {
          inputs: [{ name: 'commitment', type: 'bytes32' }],
          name: 'canReveal',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'makeCommitment',
      args: [labelHash, testOwner, testSecret],
    });

    const canReveal = await publicClient.readContract({
      address: FIFS_ADDR_REGISTRAR,
      abi: [
        {
          inputs: [{ name: 'commitment', type: 'bytes32' }],
          name: 'canReveal',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'canReveal',
      args: [commitment],
    });

    console.log(`  Commitment: ${commitment}`);
    console.log(`  Can reveal: ${canReveal ? '✅ Yes' : '❌ No'}\n`);
    
    if (!canReveal) {
      console.log('  ⚠️  Commitment is not ready yet!');
      console.log('  💡 You need to commit first and wait 60 seconds\n');
    }
  } catch (error: any) {
    console.error(`  ❌ Error checking commitment: ${error.message}\n`);
  }

  // Step 3: Encode registerData
  console.log('📊 Step 3: Encoding registerData...\n');
  
  const registerData = encodePacked(
    ['bytes4', 'address', 'bytes32', 'uint256', 'address', 'string'],
    [
      '0x5f7b99d5', // Function signature
      testOwner,
      testSecret,
      testDuration,
      testAddr,
      testName,
    ]
  );

  console.log(`  ✅ registerData encoded: ${registerData.length} bytes\n`);

  // Step 4: Analyze each test amount
  console.log('📊 Step 4: Analyzing test amounts...\n');
  console.log('Amount Analysis:\n');
  
  for (const testAmount of testAmounts) {
    const amountRIF = Number(testAmount.value) / 1e18;
    const meetsExpected = testAmount.value >= expectedPrice;
    const percentOfExpected = (Number(testAmount.value) / Number(expectedPrice)) * 100;
    
    console.log(`  ${testAmount.name}:`);
    console.log(`    Value: ${testAmount.value.toString()} wei (${amountRIF.toFixed(4)} RIF)`);
    console.log(`    Meets expected price: ${meetsExpected ? '✅ Yes' : '❌ No'}`);
    if (!meetsExpected) {
      console.log(`    Percentage of expected: ${percentOfExpected.toFixed(2)}%`);
      console.log(`    Shortfall: ${((Number(expectedPrice) - Number(testAmount.value)) / 1e18).toFixed(4)} RIF`);
    }
    console.log('');
  }

  // Step 5: Recommendations
  console.log('📊 Step 5: Recommendations\n');
  
  console.log('Based on the analysis:\n');
  console.log('1. If registrar validates strictly (amount >= namePrice.price()):');
  console.log('   → Only "Buggy price" (31M RIF) will work');
  console.log('   → This is impractical for users');
  console.log('   → Need to wait for namePrice contract fix\n');
  
  console.log('2. If registrar has minimum threshold:');
  console.log('   → Test with 0.01 RIF, 0.1 RIF, 1 RIF');
  console.log('   → Find the minimum amount that works');
  console.log('   → Use that as our fixed price\n');
  
  console.log('3. If registrar accepts any amount > 0:');
  console.log('   → "Not enough tokens" error is from something else');
  console.log('   → Could be commitment, name format, or other validation');
  console.log('   → Need to debug the actual error source\n');
  
  console.log('💡 Next Steps:');
  console.log('   1. Try registering with 0.01 RIF (minimum we calculated)');
  console.log('   2. Try registering with 1 RIF (10x our amount)');
  console.log('   3. Check if error message changes with different amounts');
  console.log('   4. Verify commitment is ready before testing');
  console.log('   5. Check registrar contract source code if available\n');

  // Step 6: Create test transaction data
  console.log('📊 Step 6: Test Transaction Data\n');
  console.log('To test manually, you can use this data:\n');
  
  const testAmount = testAmounts.find(a => a.name === '0.1 RIF')!.value;
  
  console.log('Example: transferAndCall with 0.1 RIF');
  console.log(`  To: ${FIFS_ADDR_REGISTRAR}`);
  console.log(`  Amount: ${testAmount.toString()} wei (0.1 RIF)`);
  console.log(`  Data: ${registerData.slice(0, 100)}...`);
  console.log(`  Data length: ${registerData.length} bytes\n`);
  
  console.log('You can test this by:');
  console.log('  1. Making a new commitment for a test domain');
  console.log('  2. Waiting 60+ seconds');
  console.log('  3. Calling transferAndCall with different amounts');
  console.log('  4. Observing which amounts succeed/fail');
}

testRegistrarAmounts()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    console.log('\n💡 To actually test, you would need to:');
    console.log('   1. Deploy a test contract or use a wallet');
    console.log('   2. Make a commitment for a test domain');
    console.log('   3. Wait for commitment to mature');
    console.log('   4. Try transferAndCall with different amounts');
    console.log('   5. Observe results');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
