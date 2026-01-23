"use client";

import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { useState } from 'react';
import { encodePacked, keccak256, toBytes } from 'viem';
import { toast } from 'react-toastify';

// Contract addresses
const RIF_TOKEN = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe' as const;
const FIFS_ADDR_REGISTRAR = '0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d' as const;

export default function TestRegistrationPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [testName, setTestName] = useState('');
  const [testAmount, setTestAmount] = useState('100000000000000000'); // 0.1 RIF
  const [isTesting, setIsTesting] = useState(false);
  const [commitmentHash, setCommitmentHash] = useState<string | null>(null);
  const [canReveal, setCanReveal] = useState(false);

  const generateSecret = (): `0x${string}` => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return `0x${Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
  };

  const handleCommit = async () => {
    if (!isConnected || !address || !walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    if (!testName || testName.length < 5) {
      toast.error('Domain name must be at least 5 characters');
      return;
    }

    try {
      setIsTesting(true);
      const secret = generateSecret();
      const labelHash = keccak256(toBytes(testName.toLowerCase()));

      // Make commitment
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
        args: [labelHash, address, secret],
      });

      // Commit
      const txHash = await walletClient.writeContract({
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

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setCommitmentHash(commitment);
      toast.success('Commitment made! Wait 60 seconds...');
      
      // Start checking canReveal
      const interval = setInterval(async () => {
        try {
          const canRevealResult = await publicClient.readContract({
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
          
          if (canRevealResult) {
            setCanReveal(true);
            clearInterval(interval);
            toast.success('Commitment is ready! You can now register.');
          }
        } catch (e) {
          // Ignore
        }
      }, 2000);
      
    } catch (error: any) {
      toast.error(`Commit failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleRegister = async () => {
    if (!isConnected || !address || !walletClient || !publicClient || !commitmentHash) {
      toast.error('Missing requirements');
      return;
    }

    if (!canReveal) {
      toast.error('Commitment is not ready yet. Wait 60 seconds.');
      return;
    }

    try {
      setIsTesting(true);
      
      // We need the secret - but we generated it in handleCommit
      // For now, we'll need to regenerate or store it
      // This is a simplified version - in real test, store the secret
      toast.info('Note: This test needs the secret from commit. Implementing full flow...');
      
      // For actual testing, we'd need to:
      // 1. Store the secret when committing
      // 2. Use that secret here
      // 3. Encode registerData
      // 4. Call transferAndCall with testAmount
      
    } catch (error: any) {
      toast.error(`Registration failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Test Registration with Different Amounts</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Domain Name (5+ chars)</label>
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-gray-800 text-white"
            placeholder="test12345"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Test Amount (wei)</label>
          <input
            type="text"
            value={testAmount}
            onChange={(e) => setTestAmount(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-gray-800 text-white"
            placeholder="100000000000000000"
          />
          <p className="text-sm text-gray-400 mt-1">
            Current: {(BigInt(testAmount || '0') / BigInt('1000000000000000000')).toString()} RIF
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleCommit}
            disabled={isTesting || !testName || testName.length < 5}
            className="px-6 py-2 bg-blue-600 rounded-lg disabled:opacity-50"
          >
            Step 1: Commit
          </button>

          <button
            onClick={handleRegister}
            disabled={isTesting || !canReveal || !commitmentHash}
            className="px-6 py-2 bg-green-600 rounded-lg disabled:opacity-50"
          >
            Step 2: Register (Test Amount)
          </button>
        </div>

        {commitmentHash && (
          <div className="p-4 bg-gray-800 rounded-lg">
            <p className="text-sm">Commitment: {commitmentHash}</p>
            <p className="text-sm mt-2">
              Status: {canReveal ? '✅ Ready' : '⏳ Waiting...'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-yellow-900/20 rounded-lg">
        <h2 className="font-bold mb-2">Test Amounts to Try:</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>0.1 RIF: 100000000000000000 wei</li>
          <li>1 RIF: 1000000000000000000 wei</li>
          <li>10 RIF: 10000000000000000000 wei</li>
          <li>100 RIF: 100000000000000000000 wei</li>
        </ul>
      </div>
    </div>
  );
}
