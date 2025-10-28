import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { RNS_BULK_MANAGER_ADDRESS, RNS_BULK_MANAGER_ABI } from '@/lib/abi';
import { namehash } from 'viem';

export function useRNSBulkManager() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const publicClient = usePublicClient();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // Helper function to generate node from domain name using proper namehash algorithm
  const nameToNode = (name: string): `0x${string}` => {
    // Normalize the domain name
    let normalizedName = name.toLowerCase().trim();
    if (!normalizedName.endsWith('.rsk')) {
      normalizedName = `${normalizedName}.rsk`;
    }
    
    // Use namehash from viem (same algorithm as ENS/RNS)
    return namehash(normalizedName);
  };

  const bulkRegister = async (requests: Array<{ name: string; owner: `0x${string}`; secret: `0x${string}`; duration: bigint }>) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    await writeContract({
      address: RNS_BULK_MANAGER_ADDRESS,
      abi: RNS_BULK_MANAGER_ABI,
      functionName: 'bulkRegister',
      args: [requests],
    });
  };

  const bulkRenew = async (domains: string[], durations: bigint[]) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    // Format the renewal requests
    const requests = domains.map((name, index) => ({
      name,
      duration: durations[index] || BigInt(365 * 86400), // Default to 1 year
    }));

    // Write to contract
    await writeContract({
      address: RNS_BULK_MANAGER_ADDRESS,
      abi: RNS_BULK_MANAGER_ABI,
      functionName: 'bulkRenew',
      args: [requests],
    });
  };

  const bulkSetAddress = async (nodes: `0x${string}`[], addresses: `0x${string}`[]) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    const requests = nodes.map((node, index) => ({
      node,
      targetAddress: addresses[index],
    }));

    await writeContract({
      address: RNS_BULK_MANAGER_ADDRESS,
      abi: RNS_BULK_MANAGER_ABI,
      functionName: 'bulkSetAddress',
      args: [requests],
    });
  };

  const bulkSetResolver = async (nodes: `0x${string}`[], resolverAddress: `0x${string}`) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    await writeContract({
      address: RNS_BULK_MANAGER_ADDRESS,
      abi: RNS_BULK_MANAGER_ABI,
      functionName: 'bulkSetResolver',
      args: [nodes, resolverAddress],
    });
  };

  const calculateRenewalCost = async (names: string[], durations: bigint[]): Promise<bigint> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    const result = await publicClient.readContract({
      address: RNS_BULK_MANAGER_ADDRESS,
      abi: RNS_BULK_MANAGER_ABI,
      functionName: 'calculateRenewalCost',
      args: [names, durations],
    });

    return result as bigint;
  };

  const checkAvailability = async (name: string): Promise<boolean> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    try {
      // Get the FIFS registrar address from the BulkManager contract
      const fifsRegistrarAddress = await publicClient.readContract({
        address: RNS_BULK_MANAGER_ADDRESS,
        abi: RNS_BULK_MANAGER_ABI,
        functionName: 'fifsRegistrar',
      });

      // Check availability using FIFS registrar
      const available = await publicClient.readContract({
        address: fifsRegistrarAddress as `0x${string}`,
        abi: [
          {
            inputs: [{ name: 'name', type: 'string' }],
            name: 'available',
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'available',
        args: [name],
      });

      return available as boolean;
    } catch (error) {
      console.error('Error checking availability:', error);
      // If we can't check, assume it's available (let the contract handle the error)
      return true;
    }
  };

  return {
    address,
    isConnected,
    bulkRegister,
    bulkRenew,
    bulkSetAddress,
    bulkSetResolver,
    calculateRenewalCost,
    checkAvailability,
    nameToNode,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    isLoading: isPending || isConfirming,
    error,
    reset,
  };
}

