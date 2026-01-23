/**
 * Script to actually test registration with different amounts
 * This requires a wallet and will make real transactions
 * 
 * WARNING: This will spend RIF tokens! Use with caution on testnet.
 * 
 * Run with: npx tsx smartcontract/scripts/test-actual-registration.ts <privateKey>
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain, encodePacked, keccak256, toBytes } from 'viem';

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

async function testActualRegistration(privateKey: string, testAmount: bigint) {
  console.log('🧪 Testing actual registration with different amounts...\n');
  console.log('⚠️  WARNING: This will make real transactions and spend RIF tokens!\n');

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    transport: http(RPC_URL),
    chain: rskTestnet,
  });

  console.log(`Account: ${account.address}\n`);

  // Test domain (use a unique name)
  const timestamp = Date.now();
  const testName = `test${timestamp}`;
  const testDuration = BigInt(31536000); // 1 year
  const testSecret = keccak256(toBytes(`secret${timestamp}`));

  console.log(`Test domain: ${testName}`);
  console.log(`Duration: ${testDuration.toString()} seconds (1 year)`);
  console.log(`Test amount: ${testAmount.toString()} wei (${(Number(testAmount) / 1e18).toFixed(4)} RIF)\n`);

  try {
    // Step 1: Make commitment
    console.log('📊 Step 1: Making commitment...\n');
    
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
      ],
      functionName: 'makeCommitment',
      args: [labelHash, account.address, testSecret],
    });

    console.log(`  Commitment: ${commitment}`);

    const commitTx = await walletClient.writeContract({
      address: FIFS_ADDR_REGISTRAR,
      abi: [
        {
          inputs: [{ name: 'commitment', type: 'bytes32' }],
          name: 'commit',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'commit',
      args: [commitment],
    });

    console.log(`  ✅ Commit transaction: ${commitTx}`);
    console.log(`  ⏳ Waiting for confirmation...\n`);

    await publicClient.waitForTransactionReceipt({ hash: commitTx });
    console.log(`  ✅ Commitment confirmed!\n`);

    // Step 2: Wait for commitment to mature
    console.log('📊 Step 2: Waiting for commitment to mature (60 seconds)...\n');
    
    let canReveal = false;
    let attempts = 0;
    while (!canReveal && attempts < 120) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      canReveal = await publicClient.readContract({
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

      attempts++;
      if (attempts % 10 === 0) {
        console.log(`  Waiting... (${attempts}s)`);
      }
    }

    if (!canReveal) {
      console.log('  ❌ Commitment not ready after 120 seconds');
      return;
    }

    console.log(`  ✅ Commitment is ready! (${attempts}s)\n`);

    // Step 3: Check RIF balance
    console.log('📊 Step 3: Checking RIF token balance...\n');
    
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
      args: [account.address],
    });

    const balanceRIF = Number(balance) / 1e18;
    console.log(`  Balance: ${balance.toString()} wei (${balanceRIF.toFixed(4)} RIF)`);

    if (balance < testAmount) {
      console.log(`  ❌ Insufficient balance! Need ${(Number(testAmount) / 1e18).toFixed(4)} RIF`);
      return;
    }

    console.log(`  ✅ Sufficient balance\n`);

    // Step 4: Approve RIF token (if needed)
    console.log('📊 Step 4: Approving RIF token...\n');
    
    // Check allowance
    const allowance = await publicClient.readContract({
      address: RIF_TOKEN,
      abi: [
        {
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
          ],
          name: 'allowance',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'allowance',
      args: [account.address, RIF_TOKEN], // RIF token itself for transferAndCall
    });

    if (allowance < testAmount) {
      console.log(`  Current allowance: ${allowance.toString()}`);
      console.log(`  Approving ${testAmount.toString()} wei...`);

      const approveTx = await walletClient.writeContract({
        address: RIF_TOKEN,
        abi: [
          {
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            name: 'approve',
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ],
        functionName: 'approve',
        args: [RIF_TOKEN, testAmount * BigInt(2)], // Approve 2x for safety
      });

      await publicClient.waitForTransactionReceipt({ hash: approveTx });
      console.log(`  ✅ Approved\n`);
    } else {
      console.log(`  ✅ Already approved\n`);
    }

    // Step 5: Try transferAndCall
    console.log('📊 Step 5: Attempting registration with transferAndCall...\n');
    console.log(`  Amount: ${testAmount.toString()} wei (${(Number(testAmount) / 1e18).toFixed(4)} RIF)`);
    console.log(`  Domain: ${testName}\n`);

    // Encode registerData
    const registerData = encodePacked(
      ['bytes4', 'address', 'bytes32', 'uint256', 'address', 'string'],
      [
        '0x5f7b99d5', // Function signature
        account.address,
        testSecret,
        testDuration,
        account.address,
        testName,
      ]
    );

    try {
      const txHash = await walletClient.writeContract({
        address: RIF_TOKEN,
        abi: [
          {
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'data', type: 'bytes' },
            ],
            name: 'transferAndCall',
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ],
        functionName: 'transferAndCall',
        args: [FIFS_ADDR_REGISTRAR, testAmount, registerData],
      });

      console.log(`  ✅ Transaction submitted: ${txHash}`);
      console.log(`  ⏳ Waiting for confirmation...\n`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === 'success') {
        console.log(`  🎉 SUCCESS! Registration worked with ${(Number(testAmount) / 1e18).toFixed(4)} RIF!`);
        console.log(`  💡 This means registrar accepts this amount (or has minimum threshold)`);
      } else {
        console.log(`  ❌ Transaction failed`);
      }
    } catch (error: any) {
      console.log(`  ❌ Registration failed: ${error.message}`);
      
      if (error.message.includes('Not enough tokens')) {
        console.log(`  💡 This confirms registrar validates amount against namePrice.price()`);
        console.log(`  💡 Need to send at least ${(Number(testAmount) / 1e18).toFixed(4)} RIF or more`);
      } else if (error.message.includes('commitment')) {
        console.log(`  💡 Error is about commitment, not amount`);
      } else {
        console.log(`  💡 Error might be from something else`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error);
  }
}

const privateKey = process.argv[2];
const testAmountStr = process.argv[3] || '100000000000000000'; // Default: 0.1 RIF

if (!privateKey) {
  console.error('Usage: npx tsx smartcontract/scripts/test-actual-registration.ts <privateKey> [amountInWei]');
  console.error('Example: npx tsx smartcontract/scripts/test-actual-registration.ts 0x... 100000000000000000');
  process.exit(1);
}

const testAmount = BigInt(testAmountStr);

testActualRegistration(privateKey, testAmount)
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
