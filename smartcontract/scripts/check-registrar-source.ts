/**
 * Script to check if we can find the registrar's source code or understand its behavior
 * by analyzing the contract's public functions and events
 * 
 * Run with: npx tsx smartcontract/scripts/check-registrar-source.ts
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

async function checkRegistrarSource() {
  console.log('🔍 Analyzing FIFS Addr Registrar contract...\n');
  console.log('📍 Address:', FIFS_ADDR_REGISTRAR);
  console.log('');

  // Step 1: Try to read all public state variables
  console.log('📊 Step 1: Checking public state variables...\n');
  
  const publicFunctions = [
    { name: 'minLength', args: [], expected: 'uint256' },
    { name: 'minCommitmentAge', args: [], expected: 'uint256' },
    { name: 'owner', args: [], expected: 'address' },
    { name: 'namePrice', args: [], expected: 'address' }, // Might be a contract address
  ];

  for (const func of publicFunctions) {
    try {
      const result = await publicClient.readContract({
        address: FIFS_ADDR_REGISTRAR,
        abi: [
          {
            inputs: func.args as any[],
            name: func.name,
            outputs: [{ name: '', type: func.expected }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: func.name as any,
        args: func.args as any,
      });
      console.log(`  ✅ ${func.name}: ${result.toString()}`);
    } catch (error: any) {
      console.log(`  ❌ ${func.name}: ${error.message.includes('does not exist') ? 'Not found' : 'Error'}`);
    }
  }
  console.log('');

  // Step 2: Check if there's a namePrice contract
  console.log('📊 Step 2: Checking namePrice contract (if exists)...\n');
  try {
    const namePriceAddress = await publicClient.readContract({
      address: FIFS_ADDR_REGISTRAR,
      abi: [
        {
          inputs: [],
          name: 'namePrice',
          outputs: [{ name: '', type: 'address' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'namePrice',
    });

    if (namePriceAddress && namePriceAddress !== '0x0000000000000000000000000000000000000000') {
      console.log(`  ✅ namePrice contract: ${namePriceAddress}`);
      console.log(`  💡 The registrar might use a separate price contract!`);
      console.log(`  💡 This could be the key - maybe we should query this contract instead`);
      
      // Try to read price from namePrice contract
      try {
        const priceFromContract = await publicClient.readContract({
          address: namePriceAddress,
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
          args: ['simze', BigInt(0), BigInt(31536000)],
        });
        
        const priceRIF = Number(priceFromContract) / 1e18;
        console.log(`  ✅ Price from namePrice contract: ${priceFromContract.toString()} wei (${priceRIF.toFixed(4)} RIF)`);
        
        if (priceRIF < 1) {
          console.log(`  🎉 FOUND IT! namePrice contract returns reasonable price!`);
          console.log(`  💡 We should use this contract for price calculation instead of registrar's price()`);
        }
      } catch (error: any) {
        console.log(`  ⚠️  Could not read price from namePrice contract: ${error.message}`);
      }
    } else {
      console.log(`  ❌ No namePrice contract found`);
    }
  } catch (error: any) {
    console.log(`  ⚠️  Could not read namePrice: ${error.message}`);
  }
  console.log('');

  // Step 3: Check for events that might indicate registration
  console.log('📊 Step 3: Checking for registration-related events...\n');
  console.log('  Looking for events in recent blocks...');
  
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - BigInt(2000);
    
    // Try to get logs from registrar
    const logs = await publicClient.getLogs({
      address: FIFS_ADDR_REGISTRAR,
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`  Found ${logs.length} events from registrar in last 2000 blocks`);
    
    if (logs.length > 0) {
      console.log(`  Recent events:`);
      for (let i = 0; i < Math.min(5, logs.length); i++) {
        const log = logs[i];
        console.log(`    Event ${i + 1}: ${log.topics[0]}`);
        console.log(`      Tx: ${log.transactionHash}`);
        console.log(`      Block: ${log.blockNumber.toString()}`);
      }
    }
  } catch (error: any) {
    console.log(`  ⚠️  Error checking events: ${error.message}`);
  }
  console.log('');

  // Step 4: Summary and recommendations
  console.log('📊 Summary and Next Steps:\n');
  console.log('If namePrice contract exists and returns reasonable prices:');
  console.log('  → Update contract to use namePrice.price() instead of registrar.price()');
  console.log('  → This should solve the "Not enough tokens" error');
  console.log('');
  console.log('If namePrice contract doesn\'t exist or also returns buggy prices:');
  console.log('  → Need to find alternative registration method');
  console.log('  → Or wait for registrar fix');
  console.log('  → Or contact RIF/RSK team');
}

checkRegistrarSource()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
