/**
 * Script to check the minimum domain name length requirement
 * from the FIFS Addr Registrar contract
 * 
 * Run with: npx tsx smartcontract/scripts/check-min-length.ts
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

// FIFS Addr Registrar address (testnet)
const FIFS_ADDR_REGISTRAR = '0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d' as const;

async function checkMinLength() {
  console.log('🔍 Checking minimum domain name length requirement...\n');
  console.log('📍 FIFS Addr Registrar:', FIFS_ADDR_REGISTRAR);
  console.log('');

  try {
    // Try to read minLength() function
    console.log('📊 Step 1: Reading minLength() from FIFS Addr Registrar...');
    
    const minLength = await publicClient.readContract({
      address: FIFS_ADDR_REGISTRAR,
      abi: [
        {
          inputs: [],
          name: 'minLength',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'minLength',
    });

    console.log('  ✅ minLength:', minLength.toString());
    console.log('  ✅ Minimum characters required:', minLength.toString());
    console.log('');

    // Test different name lengths
    console.log('📊 Step 2: Testing name length validation...');
    const testNames = ['simi', 'simze', 'test', 'test123', 'a', 'ab', 'abc', 'abcd', 'abcde'];
    
    for (const name of testNames) {
      const length = name.length;
      const isValid = length >= Number(minLength);
      const status = isValid ? '✅' : '❌';
      console.log(`  ${status} "${name}" (${length} chars): ${isValid ? 'Valid' : `Too short (min: ${minLength})`}`);
    }

    console.log('');
    console.log('📊 Step 3: Checking if "simi" (4 chars) should be accepted...');
    if (Number(minLength) <= 4) {
      console.log(`  ✅ "simi" (4 chars) SHOULD be accepted (minLength: ${minLength})`);
      console.log('  ⚠️  If registration is failing, the issue is likely NOT the minimum length.');
    } else {
      console.log(`  ❌ "simi" (4 chars) is TOO SHORT (minLength: ${minLength})`);
      console.log(`  💡 You need at least ${minLength} characters for domain names.`);
    }

  } catch (error) {
    console.error('❌ Error checking minLength:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('does not exist') || error.message.includes('not found')) {
        console.log('\n⚠️  minLength() function may not exist on this contract.');
        console.log('   The error "Short names not available" might be coming from a different validation.');
      }
    }
  }
}

checkMinLength()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
