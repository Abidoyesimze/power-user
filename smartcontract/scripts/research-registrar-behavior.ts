/**
 * Research script to understand how the FIFS Addr Registrar actually works
 * Checks successful registrations and registrar contract behavior
 * 
 * Run with: npx tsx smartcontract/scripts/research-registrar-behavior.ts
 */

import { createPublicClient, http, decodeEventLog } from 'viem';
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
const RNS_REGISTRY = '0x7d284aaac6e925aad802a53c0c69efe3764597b8' as const;

async function researchRegistrar() {
  console.log('🔍 Researching FIFS Addr Registrar behavior...\n');
  console.log('📍 FIFS Addr Registrar:', FIFS_ADDR_REGISTRAR);
  console.log('');

  // Step 1: Get recent Transfer events to the registrar (these are transferAndCall transactions)
  console.log('📊 Step 1: Finding recent transferAndCall transactions to registrar...');
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - BigInt(10000); // Last ~10k blocks
    
    const transferLogs = await publicClient.getLogs({
      address: RIF_TOKEN,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { name: 'from', type: 'address', indexed: true },
          { name: 'to', type: 'address', indexed: true },
          { name: 'value', type: 'uint256', indexed: false },
        ],
      } as any,
      args: {
        to: FIFS_ADDR_REGISTRAR,
      } as any,
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`  Found ${transferLogs.length} Transfer events to registrar`);
    
    if (transferLogs.length > 0) {
      console.log('\n  Recent transfers to registrar:');
      for (let i = 0; i < Math.min(5, transferLogs.length); i++) {
        const log = transferLogs[i];
        const decoded = decodeEventLog({
          abi: [
            {
              type: 'event',
              name: 'Transfer',
              inputs: [
                { name: 'from', type: 'address', indexed: true },
                { name: 'to', type: 'address', indexed: true },
                { name: 'value', type: 'uint256', indexed: false },
              ],
            },
          ],
          data: log.data,
          topics: log.topics,
        });
        
        const args = decoded.args as { from: string; to: string; value: bigint };
        const amountRIF = Number(args.value) / 1e18;
        
        console.log(`\n  Transaction ${i + 1}:`);
        console.log(`    Hash: ${log.transactionHash}`);
        console.log(`    From: ${args.from}`);
        console.log(`    Amount: ${args.value.toString()} wei (${amountRIF.toFixed(4)} RIF)`);
        
        // Check if this transaction succeeded
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash: log.transactionHash });
          console.log(`    Status: ${receipt.status === 'success' ? '✅ Success' : '❌ Failed'}`);
          
          // Check if this was a transferAndCall (has data)
          const tx = await publicClient.getTransaction({ hash: log.transactionHash });
          if (tx.input && tx.input.length > 138) { // transferAndCall has data
            console.log(`    Type: transferAndCall (has data)`);
            console.log(`    Data length: ${(tx.input.length - 138) / 2} bytes`);
          }
        } catch (e) {
          console.log(`    Status: Could not check`);
        }
      }
    } else {
      console.log('  ⚠️  No recent transfers found');
    }
  } catch (error) {
    console.error('  ❌ Error finding transfers:', error);
  }
  console.log('');

  // Step 2: Check registrar contract bytecode for price validation
  console.log('📊 Step 2: Analyzing registrar contract...');
  try {
    const code = await publicClient.getBytecode({ address: FIFS_ADDR_REGISTRAR });
    if (code && code !== '0x') {
      console.log(`  Contract bytecode length: ${(code.length - 2) / 2} bytes`);
      
      // Look for price-related function selectors
      const priceSelector = '50e9a715'; // price(string,uint256,uint256)
      const tokenFallbackSelector = 'c0ee0b8a'; // tokenFallback(address,uint256,bytes)
      
      if (code.includes(priceSelector)) {
        console.log('  ✅ price() function found in bytecode');
      }
      if (code.includes(tokenFallbackSelector)) {
        console.log('  ✅ tokenFallback() function found (supports transferAndCall)');
      }
    }
  } catch (error) {
    console.error('  ❌ Error analyzing contract:', error);
  }
  console.log('');

  // Step 3: Try to find a successful registration to see what amount was used
  console.log('📊 Step 3: Looking for successful domain registrations...');
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - BigInt(50000); // Last ~50k blocks
    
    // Look for NameRegistered events from RNS Registry
    const nameRegisteredLogs = await publicClient.getLogs({
      address: RNS_REGISTRY,
      event: {
        type: 'event',
        name: 'NewOwner',
        inputs: [
          { name: 'node', type: 'bytes32', indexed: true },
          { name: 'owner', type: 'address', indexed: false },
        ],
      } as any,
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`  Found ${nameRegisteredLogs.length} NewOwner events (potential registrations)`);
    
    if (nameRegisteredLogs.length > 0) {
      // Get the transaction for the first one
      const firstLog = nameRegisteredLogs[0];
      const tx = await publicClient.getTransaction({ hash: firstLog.transactionHash });
      
      console.log(`\n  Example registration transaction:`);
      console.log(`    Hash: ${firstLog.transactionHash}`);
      console.log(`    From: ${tx.from}`);
      console.log(`    To: ${tx.to}`);
      
      // Check if this was a transferAndCall
      if (tx.to?.toLowerCase() === RIF_TOKEN.toLowerCase() && tx.input.length > 138) {
        console.log(`    Type: transferAndCall via RIF Token`);
        
        // Try to decode the transferAndCall
        // transferAndCall(address,uint256,bytes) selector: 0xa9059cbb (but that's transfer, let me check)
        // Actually transferAndCall is: 0x4000aea0
        const transferAndCallSelector = '4000aea0';
        if (tx.input.toLowerCase().startsWith('0x' + transferAndCallSelector)) {
          console.log(`    ✅ Confirmed: transferAndCall transaction`);
        }
      }
    }
  } catch (error) {
    console.error('  ❌ Error finding registrations:', error);
  }
  console.log('');

  // Step 4: Check if registrar has any special testnet handling
  console.log('📊 Step 4: Checking for testnet-specific behavior...');
  console.log('  💡 Hypothesis: Registrar might accept any amount >= minimum on testnet');
  console.log('  💡 Or: Registrar might not validate price if amount > 0');
  console.log('  💡 Or: There might be a different registration path');
  console.log('');

  // Step 5: Summary and recommendations
  console.log('📊 Summary and Recommendations:');
  console.log('');
  console.log('Based on the research:');
  console.log('1. Check actual successful registration transactions to see amounts used');
  console.log('2. Verify if registrar validates price in tokenFallback or accepts any amount');
  console.log('3. Consider using a minimal amount (e.g., 1 wei) to test if price validation is the issue');
  console.log('4. Check official RNS documentation or GitHub for testnet-specific behavior');
  console.log('5. Contact RIF/RSK team if registrar price() bug is blocking registrations');
}

researchRegistrar()
  .then(() => {
    console.log('\n✅ Research complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
