/**
 * Script to find successful domain registrations on testnet
 * Analyzes transactions to understand what amounts were used
 * 
 * Run with: npx tsx smartcontract/scripts/find-successful-registrations.ts
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
const RNS_REGISTRY = '0x7d284aaac6e925aad802a53c0c69efe3764597b8' as const;
const FIFS_ADDR_REGISTRAR = '0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d' as const;
const RIF_TOKEN = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe' as const;

async function findSuccessfulRegistrations() {
  console.log('🔍 Finding successful domain registrations...\n');

  try {
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`Current block: ${currentBlock.toString()}\n`);

    // Look for NewOwner events in RNS Registry (indicates successful registration)
    // We'll check in smaller chunks due to RPC limits
    const chunkSize = 2000; // Max block range
    const blocksToCheck = 10000; // Check last 10k blocks
    const numChunks = Math.ceil(blocksToCheck / chunkSize);
    
    console.log(`📊 Checking ${blocksToCheck} blocks in ${numChunks} chunks...\n`);

    const allNewOwnerEvents: any[] = [];

    for (let i = 0; i < numChunks; i++) {
      const fromBlock = currentBlock - BigInt(blocksToCheck) + BigInt(i * chunkSize);
      const toBlock = Math.min(Number(fromBlock) + chunkSize - 1, Number(currentBlock));
      
      try {
        const logs = await publicClient.getLogs({
          address: RNS_REGISTRY,
          event: {
            type: 'event',
            name: 'NewOwner',
            inputs: [
              { name: 'node', type: 'bytes32', indexed: true },
              { name: 'owner', type: 'address', indexed: false },
            ],
          } as any,
          fromBlock: BigInt(fromBlock),
          toBlock: BigInt(toBlock),
        });

        allNewOwnerEvents.push(...logs);
        console.log(`  Chunk ${i + 1}/${numChunks}: Found ${logs.length} NewOwner events`);
      } catch (error: any) {
        if (error.message?.includes('block range')) {
          console.log(`  Chunk ${i + 1}/${numChunks}: Block range too large, skipping`);
        } else {
          console.error(`  Chunk ${i + 1}/${numChunks}: Error:`, error.message);
        }
      }
    }

    console.log(`\n✅ Total NewOwner events found: ${allNewOwnerEvents.length}\n`);

    if (allNewOwnerEvents.length === 0) {
      console.log('⚠️  No registrations found in recent blocks');
      console.log('   This might mean:');
      console.log('   - No recent registrations on testnet');
      console.log('   - Registrations use different event signature');
      console.log('   - Need to check different block range');
      return;
    }

    // Analyze the first few successful registrations
    console.log('📊 Analyzing successful registration transactions...\n');
    
    for (let i = 0; i < Math.min(5, allNewOwnerEvents.length); i++) {
      const event = allNewOwnerEvents[i];
      console.log(`\n--- Registration ${i + 1} ---`);
      console.log(`Transaction: ${event.transactionHash}`);
      console.log(`Block: ${event.blockNumber.toString()}`);

      try {
        // Get the transaction
        const tx = await publicClient.getTransaction({ hash: event.transactionHash });
        console.log(`From: ${tx.from}`);
        console.log(`To: ${tx.to}`);
        console.log(`Value: ${tx.value.toString()} tRBTC`);

        // Check if this was a transferAndCall
        if (tx.to?.toLowerCase() === RIF_TOKEN.toLowerCase()) {
          console.log(`✅ Transaction is to RIF Token (likely transferAndCall)`);
          
          // Check if it has data (transferAndCall includes data)
          if (tx.input && tx.input.length > 138) {
            const dataLength = (tx.input.length - 138) / 2;
            console.log(`✅ Has data: ${dataLength} bytes (transferAndCall confirmed)`);
            
            // Try to decode transferAndCall
            // transferAndCall(address to, uint256 value, bytes data)
            // Selector: 0x4000aea0
            if (tx.input.toLowerCase().startsWith('0x4000aea0')) {
              console.log(`✅ Confirmed: transferAndCall function call`);
              
              // Extract the amount (bytes 4-36 after selector)
              // Format: selector(4) + to(32) + value(32) + data_offset(32) + data_length(32) + data(...)
              try {
                const valueHex = tx.input.slice(74, 138); // value is at offset 36-68 (after selector + to)
                const value = BigInt('0x' + valueHex);
                const valueRIF = Number(value) / 1e18;
                console.log(`💰 Amount sent: ${value.toString()} wei (${valueRIF.toFixed(4)} RIF)`);
                
                // This is the key finding!
                if (valueRIF < 1) {
                  console.log(`   ✅ Used reasonable amount (< 1 RIF) - price validation might not be strict!`);
                } else if (valueRIF > 1000) {
                  console.log(`   ⚠️  Used large amount (> 1000 RIF) - might be using buggy price`);
                } else {
                  console.log(`   ℹ️  Used moderate amount`);
                }
              } catch (e) {
                console.log(`   ⚠️  Could not extract amount from transaction data`);
              }
            }
          }
        } else if (tx.to?.toLowerCase() === FIFS_ADDR_REGISTRAR.toLowerCase()) {
          console.log(`ℹ️  Transaction is directly to FIFS Addr Registrar`);
        }

        // Check transaction receipt for status
        const receipt = await publicClient.getTransactionReceipt({ hash: event.transactionHash });
        console.log(`Status: ${receipt.status === 'success' ? '✅ Success' : '❌ Failed'}`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);

        // Check for Transfer events in this transaction
        const transferEvents = receipt.logs.filter(log => 
          log.address.toLowerCase() === RIF_TOKEN.toLowerCase()
        );
        if (transferEvents.length > 0) {
          console.log(`💰 Found ${transferEvents.length} RIF token transfer(s) in this transaction`);
          for (const transferLog of transferEvents) {
            try {
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
                data: transferLog.data,
                topics: transferLog.topics,
              });
              
              const args = decoded.args as { from: string; to: string; value: bigint };
              if (args.to.toLowerCase() === FIFS_ADDR_REGISTRAR.toLowerCase()) {
                const amountRIF = Number(args.value) / 1e18;
                console.log(`   → Transfer to registrar: ${args.value.toString()} wei (${amountRIF.toFixed(4)} RIF)`);
              }
            } catch (e) {
              // Ignore decode errors
            }
          }
        }

      } catch (error: any) {
        console.error(`   ❌ Error analyzing transaction:`, error.message);
      }
    }

    console.log('\n\n📊 Summary:');
    console.log('If successful registrations used amounts < 1 RIF:');
    console.log('  → Registrar might accept any amount >= minimum');
    console.log('  → Price validation might not be strict');
    console.log('  → We should try with our fixed 0.1 RIF amount');
    console.log('');
    console.log('If successful registrations used large amounts (> 1000 RIF):');
    console.log('  → Registrar requires the buggy price amount');
    console.log('  → We need to find a workaround or wait for fix');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findSuccessfulRegistrations()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
