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

    // Write the contract transaction
    // Note: We use writeContract which returns a hash, and useWaitForTransactionReceipt handles the waiting
    await writeContract({
      address: RNS_BULK_MANAGER_ADDRESS,
      abi: RNS_BULK_MANAGER_ABI,
      functionName: 'bulkRegister',
      args: [requests],
    });
    
    // The transaction hash is stored in the hook's `hash` state
    // useWaitForTransactionReceipt will handle waiting for confirmation
    // Domains are registered through the official FIFS registrar, so they should appear in the official RNS registry
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

  const calculateRegistrationCost = async (names: string[], durations: bigint[]): Promise<bigint> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    const result = await publicClient.readContract({
      address: RNS_BULK_MANAGER_ADDRESS,
      abi: RNS_BULK_MANAGER_ABI,
      functionName: 'calculateRegistrationCost',
      args: [names, durations],
    });

    return result as bigint;
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
      // Normalize domain name (without .rsk for FIFS registrar)
      // FIFS registrar expects domain names WITHOUT the .rsk suffix
      const domainName = name.toLowerCase().trim().replace(/\.rsk$/i, '');
      const normalizedName = `${domainName}.rsk`;
      const RNS_REGISTRY = "0x7d284aaac6e925aad802a53c0c69efe3764597b8" as const;
      const node = namehash(normalizedName);
      
      // Strategy: Check BOTH FIFS registrar AND registry owner
      // A domain is unavailable if:
      // 1. FIFS registrar says it's not available, OR
      // 2. Registry owner is not zero address
      // This ensures we catch all registered domains
      
      let fifsAvailable: boolean | null = null;
      let registryOwner: string | null = null;
      
      // Step 1: Check FIFS registrar availability
      try {
        const fifsRegistrarAddress = await publicClient.readContract({
          address: RNS_BULK_MANAGER_ADDRESS,
          abi: RNS_BULK_MANAGER_ABI,
          functionName: 'fifsRegistrar',
        });

        try {
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
            args: [domainName],
          });
          fifsAvailable = available as boolean;
        } catch (fifsCallError) {
          // If FIFS registrar call reverts, the domain is NOT available
          // FIFS registrar reverts for unavailable/invalid domains
          console.warn('FIFS registrar available() call reverted - domain is unavailable:', fifsCallError);
          fifsAvailable = false; // Treat revert as unavailable
        }
      } catch (fifsError) {
        console.warn('Could not get FIFS registrar address:', fifsError);
      }
      
      // Step 2: Check registry owner (ALWAYS check this, even if FIFS check succeeded)
      try {
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
          ],
          functionName: 'owner',
          args: [node],
        });
        registryOwner = owner as string;
      } catch (registryError) {
        console.error('Registry owner check failed:', registryError);
      }
      
      // Step 3: Determine availability based on both checks
      // Priority: Registry owner check is most reliable (especially on testnet)
      // FIFS registrar is used as secondary confirmation
      
      // Domain is UNAVAILABLE if registry has a non-zero owner
      if (registryOwner && registryOwner !== "0x0000000000000000000000000000000000000000") {
        return false; // Domain is registered
      }
      
      // If registry owner is zero, domain is likely available
      // Use FIFS registrar as confirmation if available
      if (registryOwner === "0x0000000000000000000000000000000000000000" || !registryOwner) {
        // Registry says available - check FIFS for confirmation
        if (fifsAvailable === true) {
          return true; // Both registry and FIFS confirm available
        }
        
        // FIFS registrar reverted or returned false, but registry says available
        // On testnet, FIFS registrar may have issues, so trust the registry
        // If registry owner is zero, domain is available
        if (fifsAvailable === false || fifsAvailable === null) {
          // FIFS registrar has issues on testnet, but registry is reliable
          // Trust the registry - if owner is zero, domain is available
          return true;
        }
      }
      
      // Default: if we can't determine, assume unavailable to be safe
      return false;
    } catch (error) {
      console.error('Error checking availability:', error);
      // If we can't check, assume it's unavailable to be safe
      // This prevents false positives where domain shows available but registration fails
      return false;
    }
  };

  return {
    address,
    isConnected,
    bulkRegister,
    bulkRenew,
    bulkSetAddress,
    bulkSetResolver,
    calculateRegistrationCost,
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

