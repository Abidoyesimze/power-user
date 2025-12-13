/**
 * Test script to verify RPC endpoint functionality
 * Run with: npx tsx scripts/test-rpc.ts
 */

import { createPublicClient, http, formatEther } from 'viem';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.testnet.rootstock.io/eB6SwV0sOgFuotmD35JzhuCqpnYf8W-T';

const publicClient = createPublicClient({
  transport: http(RPC_URL),
  chain: {
    id: 31,
    name: 'Rootstock Testnet',
    network: 'rsk-testnet',
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
  },
});

async function testRPC() {
  console.log('🧪 Testing RPC Endpoint\n');
  console.log('📍 RPC URL:', RPC_URL);
  console.log('');

  const tests = [
    {
      name: '1. Get Latest Block Number',
      test: async () => {
        const blockNumber = await publicClient.getBlockNumber();
        return `✅ Latest block: ${blockNumber.toString()}`;
      },
    },
    {
      name: '2. Get Block (eth_getBlockByNumber)',
      test: async () => {
        const blockNumber = await publicClient.getBlockNumber();
        const block = await publicClient.getBlock({ blockNumber });
        return `✅ Block ${blockNumber.toString()}: ${block.transactions.length} transactions`;
      },
    },
    {
      name: '3. Read Contract (eth_call)',
      test: async () => {
        // Test reading from RNS Registry
        const RNS_REGISTRY = '0x7d284aaac6e925aad802a53c0c69efe3764597b8' as `0x${string}`;
        const node = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
        
        const owner = await publicClient.readContract({
          address: RNS_REGISTRY,
          abi: [
            {
              inputs: [{ name: 'node', type: 'bytes32' }],
              name: 'owner',
              outputs: [{ name: '', type: 'address' }],
              stateMutability: 'view',
              type: 'function',
            },
          ] as const,
          functionName: 'owner',
          args: [node],
        });
        
        return `✅ Contract read successful. Owner: ${owner}`;
      },
    },
    {
      name: '4. Get Logs (eth_getLogs)',
      test: async () => {
        // Test getting logs from our contract
        const RNS_BULK_MANAGER = '0x6621e4f2fc0761ab31d1b89babef2be0a83901ab' as `0x${string}`;
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock - BigInt(1000); // Last 1000 blocks
        
        const logs = await publicClient.getLogs({
          address: RNS_BULK_MANAGER,
          event: {
            type: 'event',
            name: 'BulkRegistration',
            inputs: [
              { indexed: true, name: 'user', type: 'address' },
              { indexed: false, name: 'count', type: 'uint256' },
              { indexed: false, name: 'totalCost', type: 'uint256' },
            ],
          } as const,
          fromBlock,
          toBlock: latestBlock,
        });
        
        return `✅ eth_getLogs successful. Found ${logs.length} BulkRegistration events`;
      },
    },
    {
      name: '5. Get Transaction Receipt',
      test: async () => {
        // Get a recent transaction hash (you can replace this with a real one)
        const latestBlock = await publicClient.getBlockNumber();
        const block = await publicClient.getBlock({ blockNumber: latestBlock, includeTransactions: true });
        
        if (block.transactions.length > 0) {
          const txHash = typeof block.transactions[0] === 'string' 
            ? block.transactions[0] 
            : block.transactions[0].hash;
          
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
          return `✅ Transaction receipt retrieved. Status: ${receipt.status === 'success' ? 'Success' : 'Failed'}`;
        } else {
          return `⚠️  No transactions in latest block to test`;
        }
      },
    },
    {
      name: '6. Estimate Gas (eth_estimateGas)',
      test: async () => {
        // Test gas estimation
        const RNS_BULK_MANAGER = '0x6621e4f2fc0761ab31d1b89babef2be0a83901ab' as `0x${string}`;
        
        const gas = await publicClient.estimateGas({
          to: RNS_BULK_MANAGER,
          data: '0x' as `0x${string}`,
        });
        
        return `✅ Gas estimation successful. Estimated: ${gas.toString()}`;
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    try {
      console.log(`\n${name}...`);
      const result = await test();
      console.log(result);
      passed++;
    } catch (error) {
      console.error(`❌ Failed:`, error instanceof Error ? error.message : String(error));
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}/${tests.length}`);
  console.log(`   ❌ Failed: ${failed}/${tests.length}`);
  
  if (failed === 0) {
    console.log(`\n🎉 All tests passed! RPC endpoint is working correctly.`);
  } else {
    console.log(`\n⚠️  Some tests failed. RPC endpoint may have limitations.`);
  }
  
  console.log('\n💡 Required Methods for this app:');
  console.log('   - eth_call (for reading contracts)');
  console.log('   - eth_getLogs (for fetching domain events)');
  console.log('   - eth_sendRawTransaction (for sending transactions)');
  console.log('   - eth_getTransactionReceipt (for confirming transactions)');
  console.log('   - CORS enabled (for browser requests)');
}

testRPC()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test script error:', error);
    process.exit(1);
  });

