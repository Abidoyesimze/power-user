import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { keccak256, toBytes, bytesToHex } from 'viem';

// RNS Contract addresses for testnet
const FIFS_REGISTRAR_TESTNET = '0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d' as `0x${string}`;

// FIFS Registrar ABI (minimal - only functions we need)
const FIFS_REGISTRAR_ABI = [
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
    name: 'commit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'commitment', type: 'bytes32' }],
    name: 'canReveal',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface CommitResult {
  domain: string;
  secret: `0x${string}`;
  commitmentHash: `0x${string}`;
  transactionHash: `0x${string}`;
}

/**
 * Hook for RNS commit-reveal flow using viem
 * Implements the same logic as the official SDK but using viem/wagmi
 */
export function useRNSRegistrar() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  /**
   * Generate a random secret (32 bytes) using Web Crypto API (browser-compatible)
   */
  const generateSecret = (): `0x${string}` => {
    // Use Web Crypto API for browser compatibility
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return bytesToHex(array) as `0x${string}`;
  };

  /**
   * Hash a domain label (same as SDK's hashLabel)
   */
  const hashLabel = (label: string): `0x${string}` => {
    return keccak256(toBytes(label));
  };

  /**
   * Make commitment hash (same as SDK's makeCommitment)
   */
  const makeCommitment = async (
    label: string,
    nameOwner: `0x${string}`,
    secret: `0x${string}`
  ): Promise<`0x${string}`> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    const labelHash = hashLabel(label);

    // Call makeCommitment on the FIFS registrar
    const commitment = await publicClient.readContract({
      address: FIFS_REGISTRAR_TESTNET,
      abi: FIFS_REGISTRAR_ABI,
      functionName: 'makeCommitment',
      args: [labelHash, nameOwner, secret],
    });

    return commitment;
  };

  /**
   * Commit to register a single domain
   * Returns the secret and commitment hash for later use in registration
   */
  const commitToRegister = async (domainName: string): Promise<CommitResult> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!walletClient) {
      throw new Error('Wallet client not available');
    }

    // Remove .rsk suffix if present (FIFS registrar expects name without TLD)
    const label = domainName.toLowerCase().trim().replace(/\.rsk$/i, '');

    // Generate random secret (following SDK pattern)
    const secret = generateSecret();

    try {
      // Create commitment hash
      const commitmentHash = await makeCommitment(label, address, secret);

      // Commit the commitment
      const hash = await walletClient.writeContract({
        address: FIFS_REGISTRAR_TESTNET,
        abi: FIFS_REGISTRAR_ABI,
        functionName: 'commit',
        args: [commitmentHash],
      });

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      return {
        domain: domainName,
        secret,
        commitmentHash,
        transactionHash: hash,
      };
    } catch (error) {
      console.error('Error committing to register:', error);
      throw new Error(`Failed to commit registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Commit to register multiple domains
   * Returns array of commit results with secrets
   */
  const bulkCommit = async (domainNames: string[]): Promise<CommitResult[]> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    const results: CommitResult[] = [];

    // Commit each domain sequentially to avoid nonce issues
    for (const domainName of domainNames) {
      try {
        const result = await commitToRegister(domainName);
        results.push(result);
      } catch (error) {
        console.error(`Failed to commit domain ${domainName}:`, error);
        // Continue with other domains even if one fails
        // The error will be shown in the UI
        throw error; // Re-throw to let caller handle it
      }
    }

    return results;
  };

  /**
   * Check if a commitment can be revealed (60 seconds have passed)
   */
  const canReveal = async (commitmentHash: `0x${string}`): Promise<boolean> => {
    if (!publicClient) {
      return false;
    }

    try {
      const canRevealResult = await publicClient.readContract({
        address: FIFS_REGISTRAR_TESTNET,
        abi: FIFS_REGISTRAR_ABI,
        functionName: 'canReveal',
        args: [commitmentHash],
      });

      return canRevealResult;
    } catch (error) {
      console.error('Error checking if can reveal:', error);
      return false;
    }
  };

  return {
    isReady: isConnected && !!address && !!publicClient && !!walletClient,
    commitToRegister,
    bulkCommit,
    canReveal,
    generateSecret,
    hashLabel,
    makeCommitment,
  };
}

