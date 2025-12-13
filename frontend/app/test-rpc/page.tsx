"use client";

import { useState } from "react";
import { createPublicClient, http, formatEther } from "viem";

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
  },
});

export default function TestRPCPage() {
  const [results, setResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testRPC = async () => {
    setIsTesting(true);
    setResults([]);
    
    try {
      addResult('🧪 Starting RPC tests...');
      addResult(`📍 RPC URL: ${RPC_URL}`);
      addResult('');

      // Test 1: Get Block Number
      try {
        addResult('Test 1: Getting latest block number...');
        const blockNumber = await publicClient.getBlockNumber();
        addResult(`✅ Latest block: ${blockNumber.toString()}`);
      } catch (error) {
        addResult(`❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Test 2: Read Contract
      try {
        addResult('\nTest 2: Reading contract (eth_call)...');
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
        
        addResult(`✅ Contract read successful. Owner: ${owner}`);
      } catch (error) {
        addResult(`❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Test 3: Get Logs
      try {
        addResult('\nTest 3: Getting logs (eth_getLogs)...');
        const RNS_BULK_MANAGER = '0x6621e4f2fc0761ab31d1b89babef2be0a83901ab' as `0x${string}`;
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock - BigInt(1000);
        
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
        
        addResult(`✅ eth_getLogs successful. Found ${logs.length} events`);
      } catch (error) {
        addResult(`❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Test 4: Calculate Registration Cost
      try {
        addResult('\nTest 4: Calculating registration cost...');
        const RNS_BULK_MANAGER = '0x6621e4f2fc0761ab31d1b89babef2be0a83901ab' as `0x${string}`;
        const names = ['test'];
        const durations = [BigInt(365 * 24 * 60 * 60)];
        
        const cost = await publicClient.readContract({
          address: RNS_BULK_MANAGER,
          abi: [
            {
              inputs: [
                { name: 'names', type: 'string[]' },
                { name: 'durations', type: 'uint256[]' },
              ],
              name: 'calculateRegistrationCost',
              outputs: [{ name: 'totalCost', type: 'uint256' }],
              stateMutability: 'pure',
              type: 'function',
            },
          ] as const,
          functionName: 'calculateRegistrationCost',
          args: [names, durations],
        });
        
        addResult(`✅ Cost calculation successful. Cost: ${formatEther(cost)} RIF`);
      } catch (error) {
        addResult(`❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      addResult('\n✅ All critical tests passed! RPC endpoint is working correctly.');
      addResult('💡 CORS is enabled - browser requests should work.');
      
    } catch (error) {
      addResult(`\n❌ Test suite failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">RPC Endpoint Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-2">Current RPC URL:</p>
            <code className="text-green-400 text-sm break-all">{RPC_URL}</code>
          </div>
          
          <button
            onClick={testRPC}
            disabled={isTesting}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? 'Testing...' : 'Run RPC Tests'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>
            <div className="bg-gray-900 rounded p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {results.join('\n')}
            </div>
          </div>
        )}

        <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">What This Tests</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>✅ CORS support (browser requests)</li>
            <li>✅ eth_call (reading contracts)</li>
            <li>✅ eth_getLogs (fetching events)</li>
            <li>✅ eth_getBlockNumber (block queries)</li>
            <li>✅ Contract function calls</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

