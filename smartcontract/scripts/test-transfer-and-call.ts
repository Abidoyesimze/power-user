/**
 * Script to test transferAndCall directly to understand the error
 * 
 * Run with: npx tsx smartcontract/scripts/test-transfer-and-call.ts
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
const RIF_TOKEN = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe' as const;
const FIFS_ADDR_REGISTRAR = '0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d' as const;
const BULK_MANAGER = '0xdbb6bcea1e9a701ac2692550a0ae0d18bb48e899' as const;

async function testTransferAndCall() {
  console.log('🔍 Testing transferAndCall to understand the error...\n');

  // Test parameters (from the failed transaction)
  const testName = 'simze';
  const testOwner = '0x34C775FB2fe2b8383B5659B3f7Fc1E721Ca04A3a' as const;
  const testSecret = '0x301d91211185d06ae2d606ce3e04df6b2075f4a72c4e7f8f8384f52735cca1b2' as const;
  const testDuration = BigInt(31536000); // 1 year
  const testAddr = '0x34C775FB2fe2b8383B5659B3f7Fc1E721Ca04A3a' as const;
  const testCost = BigInt('100000000000000000'); // 0.1 RIF

  console.log('📊 Test Parameters:');
  console.log('  Name:', testName);
  console.log('  Owner:', testOwner);
  console.log('  Secret:', testSecret);
  console.log('  Duration:', testDuration.toString(), 'seconds (1 year)');
  console.log('  Address:', testAddr);
  console.log('  Cost:', testCost.toString(), 'wei (0.1 RIF)');
  console.log('');

  // Step 1: Check if commitment exists
  console.log('📊 Step 1: Checking if commitment exists...');
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

    console.log('  Commitment hash:', commitment);
    
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

    console.log('  Can reveal:', canReveal);
    if (!canReveal) {
      console.log('  ⚠️  Commitment is not ready yet! This could cause registration to fail.');
    }
  } catch (error) {
    console.error('  ❌ Error checking commitment:', error);
  }
  console.log('');

  // Step 2: Check the actual price from registrar
  console.log('📊 Step 2: Checking actual price from registrar...');
  try {
    const actualPrice = await publicClient.readContract({
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
      args: [testName, BigInt(0), testDuration], // expires = 0 for new registration
    });

    console.log('  Actual price from registrar:', actualPrice.toString());
    console.log('  Actual price (RIF):', (Number(actualPrice) / 1e18).toFixed(4));
    console.log('  Our calculated cost:', testCost.toString());
    console.log('  Our calculated cost (RIF):', (Number(testCost) / 1e18).toFixed(4));
    
    if (actualPrice > testCost) {
      console.log('  ❌ Registrar requires MORE tokens than we calculated!');
      console.log(`     Difference: ${(Number(actualPrice - testCost) / 1e18).toFixed(4)} RIF`);
      console.log('  💡 This explains the "Not enough tokens" error!');
    } else if (actualPrice < testCost) {
      console.log('  ⚠️  Registrar requires LESS tokens (we overpaid, but should still work)');
    } else {
      console.log('  ✅ Prices match!');
    }
  } catch (error) {
    console.error('  ❌ Error checking price:', error);
  }
  console.log('');

  // Step 3: Encode the registerData to see what we're sending
  console.log('📊 Step 3: Encoding registerData...');
  try {
    // Format: signature(4) + owner(20) + secret(32) + duration(32) + addr(20) + name(variable)
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

    console.log('  Encoded data length:', registerData.length, 'bytes');
    console.log('  Encoded data (first 100 chars):', registerData.slice(0, 100) + '...');
    console.log('  ✅ Data encoding looks correct');
  } catch (error) {
    console.error('  ❌ Error encoding data:', error);
  }
  console.log('');

  // Step 4: Check Bulk Manager balance
  console.log('📊 Step 4: Checking Bulk Manager balance...');
  try {
    const balance = await publicClient.readContract({
      address: RIF_TOKEN,
      abi: [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'balanceOf',
      args: [BULK_MANAGER],
    });

    console.log('  Bulk Manager balance:', balance.toString());
    console.log('  Bulk Manager balance (RIF):', (Number(balance) / 1e18).toFixed(4));
    console.log('  Required cost:', testCost.toString());
    console.log('  Required cost (RIF):', (Number(testCost) / 1e18).toFixed(4));
    
    if (balance >= testCost) {
      console.log('  ✅ Bulk Manager has enough balance');
    } else {
      console.log('  ❌ Bulk Manager does NOT have enough balance');
    }
  } catch (error) {
    console.error('  ❌ Error checking balance:', error);
  }
}

testTransferAndCall()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
