/**
 * Script to debug the "Not enough tokens" error
 * Checks contract balance and token transfer flow
 * 
 * Run with: npx tsx smartcontract/scripts/debug-token-transfer.ts <txHash>
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

// Contract addresses
const RIF_TOKEN = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe' as const;
const BULK_MANAGER = '0xdbb6bcea1e9a701ac2692550a0ae0d18bb48e899' as const;
const FIFS_ADDR_REGISTRAR = '0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d' as const;

async function debugTokenTransfer(txHash: string) {
  console.log('🔍 Debugging token transfer issue...\n');
  console.log('📍 Transaction:', txHash);
  console.log('📍 Bulk Manager:', BULK_MANAGER);
  console.log('📍 RIF Token:', RIF_TOKEN);
  console.log('📍 FIFS Addr Registrar:', FIFS_ADDR_REGISTRAR);
  console.log('');

  try {
    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber.toString());
    console.log('');

    // Get transaction details
    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
    console.log('📊 Transaction Details:');
    console.log('  From:', tx.from);
    console.log('  To:', tx.to);
    console.log('  Value:', tx.value.toString(), 'tRBTC');
    console.log('');

    // Check Bulk Manager's RIF token balance
    console.log('📊 Step 1: Checking Bulk Manager RIF token balance...');
    const bulkManagerBalance = await publicClient.readContract({
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
    console.log('  Bulk Manager Balance:', bulkManagerBalance.toString());
    console.log('  Bulk Manager Balance (RIF):', (Number(bulkManagerBalance) / 1e18).toFixed(4));
    console.log('');

    // Check user's balance
    console.log('📊 Step 2: Checking user RIF token balance...');
    const userBalance = await publicClient.readContract({
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
      args: [tx.from],
    });
    console.log('  User Balance:', userBalance.toString());
    console.log('  User Balance (RIF):', (Number(userBalance) / 1e18).toFixed(4));
    console.log('');

    // Check Bulk Manager's allowance from user
    console.log('📊 Step 3: Checking Bulk Manager allowance from user...');
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
      args: [tx.from, BULK_MANAGER],
    });
    console.log('  Allowance:', allowance.toString());
    console.log('  Allowance (RIF):', (Number(allowance) / 1e18).toFixed(4));
    console.log('');

    // Check for Transfer events in the transaction
    console.log('📊 Step 4: Checking Transfer events in transaction...');
    const transferEvents = receipt.logs.filter(log => {
      try {
        // RIF Token Transfer event signature: Transfer(address,address,uint256)
        return log.address.toLowerCase() === RIF_TOKEN.toLowerCase();
      } catch {
        return false;
      }
    });

    if (transferEvents.length > 0) {
      console.log(`  Found ${transferEvents.length} Transfer event(s):`);
      for (const log of transferEvents) {
        console.log('    Event:', log);
      }
    } else {
      console.log('  ⚠️  No Transfer events found');
    }
    console.log('');

    // Check for OperationFailed events
    console.log('📊 Step 5: Checking OperationFailed events...');
    const operationFailedEvents = receipt.logs.filter(log => {
      try {
        return log.address.toLowerCase() === BULK_MANAGER.toLowerCase();
      } catch {
        return false;
      }
    });

    if (operationFailedEvents.length > 0) {
      console.log(`  Found ${operationFailedEvents.length} event(s) from Bulk Manager:`);
      for (const log of operationFailedEvents) {
        console.log('    Event:', log);
      }
    }
    console.log('');

    // Analyze the issue
    console.log('📊 Analysis:');
    const requiredAmount = BigInt('100000000000000000'); // 0.1 RIF
    if (bulkManagerBalance < requiredAmount) {
      console.log('  ❌ Bulk Manager does NOT have enough balance for registration');
      console.log(`     Required: ${requiredAmount.toString()} (0.1 RIF)`);
      console.log(`     Has: ${bulkManagerBalance.toString()} (${(Number(bulkManagerBalance) / 1e18).toFixed(4)} RIF)`);
      console.log('  💡 This suggests the transferFrom() call may have failed or tokens were not received');
    } else {
      console.log('  ✅ Bulk Manager HAS enough balance');
      console.log('  ⚠️  The "Not enough tokens" error might be coming from the FIFS Addr Registrar');
      console.log('  💡 The registrar might be checking something else (e.g., commitment, name validation)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

const txHash = process.argv[2];
if (!txHash) {
  console.error('Usage: npx tsx smartcontract/scripts/debug-token-transfer.ts <txHash>');
  process.exit(1);
}

debugTokenTransfer(txHash)
  .then(() => {
    console.log('\n✅ Debug complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
