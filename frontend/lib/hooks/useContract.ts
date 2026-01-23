import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useWalletClient } from 'wagmi';
import { RNS_BULK_MANAGER_ADDRESS, RNS_BULK_MANAGER_ABI } from '@/lib/abi';
import { namehash, keccak256, toBytes, decodeEventLog } from 'viem';
import { toast } from 'react-toastify';

export function useRNSBulkManager() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

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

  const bulkRegister = async (requests: Array<{ name: string; owner: `0x${string}`; secret: `0x${string}`; duration: bigint; addr: `0x${string}` }>) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!publicClient) {
      throw new Error('Public client not available');
    }

    // RIF Token address on testnet
    const RIF_TOKEN = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe' as `0x${string}`;

    console.log('Starting bulkRegister...', { requestCount: requests.length });
    
    // Calculate total cost first (with timeout)
    const names = requests.map(r => r.name);
    const durations = requests.map(r => r.duration);
    console.log('Calculating registration cost...');
    
    let totalCost: bigint;
    try {
      totalCost = await Promise.race([
        calculateRegistrationCost(names, durations),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Cost calculation timeout')), 30000)
        )
      ]);
      console.log('Total cost calculated:', totalCost.toString());
    } catch (error) {
      console.error('Failed to calculate cost:', error);
      throw new Error(`Failed to calculate registration cost: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Check current allowance (with timeout)
    console.log('Checking RIF token allowance...');
    let currentAllowance: bigint;
    try {
      currentAllowance = await Promise.race([
        publicClient.readContract({
          address: RIF_TOKEN,
          abi: [
            {
              inputs: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' }
              ],
              name: 'allowance',
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function'
            }
          ] as const,
          functionName: 'allowance',
          args: [address, RNS_BULK_MANAGER_ADDRESS]
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Allowance check timeout')), 30000)
        )
      ]);
      console.log('Current allowance:', currentAllowance.toString());
    } catch (error) {
      console.error('Failed to check allowance:', error);
      throw new Error(`Failed to check token allowance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Approve tokens if allowance is insufficient
    if (currentAllowance < totalCost) {
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      console.log('Insufficient allowance. Requesting approval...', {
        currentAllowance: currentAllowance.toString(),
        totalCost: totalCost.toString()
      });

      // Approve a bit more than needed to avoid frequent approvals
      const approveAmount = totalCost * BigInt(2); // Approve 2x the cost for future registrations
      
      toast.info("Please approve RIF token spending in your wallet...");
      
      const approveHash = await walletClient.writeContract({
        address: RIF_TOKEN,
        abi: [
          {
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            name: 'approve',
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
            type: 'function'
          }
        ] as const,
        functionName: 'approve',
        args: [RNS_BULK_MANAGER_ADDRESS, approveAmount]
      });

      console.log('Approval transaction submitted:', approveHash);
      toast.info("Waiting for approval confirmation...");

      // Wait for approval transaction to be confirmed
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log('Approval confirmed');
      toast.success("Token approval confirmed!");
    }

    // Write the contract transaction
    // Use walletClient.writeContract for consistency with approval flow
    // This gives us better control and ensures wallet popup appears
    if (!walletClient) {
      throw new Error('Wallet client not available');
    }
    
    console.log('Calling writeContract for bulkRegister...', {
      address: RNS_BULK_MANAGER_ADDRESS,
      requestCount: requests.length,
      requests: requests.map(r => ({ name: r.name, duration: r.duration.toString() }))
    });
    
    toast.info("Please confirm the registration transaction in your wallet...");
    
    try {
      // Use walletClient.writeContract - this will trigger wallet popup immediately
      console.log('About to call walletClient.writeContract - wallet popup should appear now...');
      
      const txHash = await Promise.race([
        walletClient.writeContract({
          address: RNS_BULK_MANAGER_ADDRESS,
          abi: RNS_BULK_MANAGER_ABI,
          functionName: 'bulkRegister',
          args: [requests],
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Transaction request timeout - wallet popup may not have appeared')), 60000)
        )
      ]);
      
      console.log('Transaction submitted. Hash:', txHash);
      
      // Update the hash in the hook's state by calling the hook's writeContract
      // This ensures useWaitForTransactionReceipt can track it
      // Actually, we can't directly update the hook's state, but we can use the returned hash
      // The hook's useWaitForTransactionReceipt will work with any hash
      
      // Store the hash so the component can track it
      // Note: The hook's hash state won't be updated, but we can work with the returned hash
      
      toast.success("Transaction submitted! Waiting for confirmation...");
      
      // Wait for transaction receipt
      console.log('Waiting for transaction confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log('Transaction confirmed!');
      
      // Check for OperationFailed events to see if any registrations failed
      const operationFailedLogs = receipt.logs.filter(log => {
        try {
          const decoded = decodeEventLog({
            abi: RNS_BULK_MANAGER_ABI,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === 'OperationFailed';
        } catch {
          return false;
        }
      });
      
      if (operationFailedLogs.length > 0) {
        console.warn('⚠️ Some registrations failed:', operationFailedLogs.length);
        const failedReasons: string[] = [];
        
        for (const log of operationFailedLogs) {
          try {
            const decoded = decodeEventLog({
              abi: RNS_BULK_MANAGER_ABI,
              data: log.data,
              topics: log.topics,
            });
            
            if (decoded.eventName === 'OperationFailed' && decoded.args) {
              // Type-safe access to args
              const args = decoded.args as unknown as { index: bigint; reason: string };
              const index = Number(args.index);
              const reason = args.reason;
              
              console.error(`❌ Registration ${index} failed: ${reason}`);
              
              // Categorize common errors for better user feedback
              if (reason.includes('Commitment') || reason.includes('commitment')) {
                failedReasons.push(`Domain ${index + 1}: Commitment not ready. Please commit first and wait 60+ seconds.`);
              } else if (reason.includes('already registered') || reason.includes('unavailable')) {
                failedReasons.push(`Domain ${index + 1}: Already registered or unavailable.`);
              } else if (reason.includes('RIF token') || reason.includes('transfer')) {
                failedReasons.push(`Domain ${index + 1}: Payment failed. Check RIF token balance.`);
              } else {
                failedReasons.push(`Domain ${index + 1}: ${reason}`);
              }
            }
          } catch (e) {
            console.error('Failed to decode OperationFailed event:', e);
            failedReasons.push('Unknown error occurred');
          }
        }
        
        // Show detailed error messages
        if (failedReasons.length > 0) {
          toast.error(
            `${failedReasons.length} registration(s) failed:\n${failedReasons.slice(0, 3).join('\n')}${failedReasons.length > 3 ? `\n...and ${failedReasons.length - 3} more` : ''}`,
            { autoClose: 10000 }
          );
        }
      } else {
        console.log('✅ All registrations succeeded (no OperationFailed events)');
      }
      
    } catch (writeError: unknown) {
      // If writeContract fails, it might be because user rejected or there's an error
      console.error('writeContract error:', writeError);
      
      // Check if it's a user rejection
      const errorMessage = writeError instanceof Error ? writeError.message : String(writeError);
      const errorCode = (writeError as { code?: number })?.code;
      const errorShortMessage = (writeError as { shortMessage?: string })?.shortMessage;
      
      if (errorMessage.includes('User rejected') || 
          errorMessage.includes('denied') ||
          errorCode === 4001 ||
          errorShortMessage?.includes('User rejected') ||
          errorShortMessage?.includes('denied')) {
        throw new Error('Transaction was cancelled by user');
      }
      
      // Check if it's a timeout
      if (errorMessage.includes('timeout')) {
        throw new Error('Transaction request timed out. Please check your wallet connection and try again.');
      }
      
      throw writeError;
    }
  };

  const bulkRenew = async (domains: string[], durations: bigint[]) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    // Format the renewal requests
    // Note: expires is required but can be 0 if unknown - contract may handle it
    const requests = domains.map((name, index) => ({
      name,
      duration: durations[index] || BigInt(365 * 86400), // Default to 1 year
      expires: BigInt(0), // Use 0 as default - contract may calculate from current expiration
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

  const calculateRenewalCost = async (names: string[], expires: bigint[], durations: bigint[]): Promise<bigint> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    const result = await publicClient.readContract({
      address: RNS_BULK_MANAGER_ADDRESS,
      abi: RNS_BULK_MANAGER_ABI,
      functionName: 'calculateRenewalCost',
      args: [names, expires, durations],
    });

    return result as bigint;
  };

  /**
   * CRITICAL: Check if a domain is available for registration
   * Uses contract's isDomainAvailable function (which checks both RNS Registry and RSKOwner)
   * Falls back to manual checking if contract call fails
   * 
   * IMPORTANT: For .rsk registrations, the registrar availability API expects only the label,
   * without the .rsk suffix. This function normalizes the input accordingly.
   */
  const checkAvailability = async (name: string): Promise<boolean> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    try {
      // CRITICAL: Normalize input - label-only, lowercase, strip .rsk
      // The registrar availability API expects only the label, not the full domain
      let domainName = name.toLowerCase().trim().replace(/\.rsk$/i, '');
      
      // Validate label format (alphanumeric and hyphens only, 3-63 chars)
      // This matches RNS label requirements
      if (!/^[a-z0-9-]{3,63}$/.test(domainName)) {
        console.warn(`Invalid label format: ${domainName}`);
        return false;
      }
      
      // PRIMARY: Use contract's isDomainAvailable function
      // This is more reliable as it matches the contract's logic exactly
      // Contract expects label-only (without .rsk suffix)
      try {
        const available = await publicClient.readContract({
          address: RNS_BULK_MANAGER_ADDRESS,
          abi: RNS_BULK_MANAGER_ABI,
          functionName: 'isDomainAvailable',
          args: [domainName], // Label-only, no .rsk suffix
        });
        
        return available as boolean;
      } catch (contractError) {
        console.warn('Contract availability check failed, falling back to manual check:', contractError);
        // Fallback to manual checking if contract call fails
        return manualAvailabilityCheck(domainName);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      // If all checks fail, assume unavailable to be safe
      return false;
    }
  };

  /**
   * Fallback manual availability check
   * Directly checks RNS Registry and RSKOwner contracts
   */
  const manualAvailabilityCheck = async (domainName: string): Promise<boolean> => {
    if (!publicClient) {
      return false;
    }

    const RNS_REGISTRY = "0x7d284aaac6e925aad802a53c0c69efe3764597b8" as const;
    const RSK_OWNER = "0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71" as const;
    
    try {
      // Calculate namehash
      const normalizedName = `${domainName}.rsk`;
      const node = namehash(normalizedName);
      const label = keccak256(toBytes(domainName));
      
      // Step 1: Check RNS Registry owner
      try {
        const registryOwner = await publicClient.readContract({
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
        
        // If registry owner is address(0), domain might be available
        if (registryOwner === "0x0000000000000000000000000000000000000000") {
          return true;
        }
      } catch (error) {
        console.error('Error checking registry owner:', error);
        // If registry check fails, continue to RSKOwner check
      }
      
      // Step 2: Check RSKOwner NFT ownership and expiration
      try {
        const tokenId = BigInt(label);
        
        // Try to get owner - will revert if domain is available/expired
        await publicClient.readContract({
          address: RSK_OWNER,
          abi: [
            {
              inputs: [{ name: 'tokenId', type: 'uint256' }],
              name: 'ownerOf',
              outputs: [{ name: 'owner', type: 'address' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'ownerOf',
          args: [tokenId],
        });
        
        // If ownerOf succeeds, check expiration
        const expirationTime = await publicClient.readContract({
          address: RSK_OWNER,
          abi: [
            {
              inputs: [{ name: 'tokenId', type: 'uint256' }],
              name: 'expirationTime',
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'expirationTime',
          args: [tokenId],
        });
        
        const now = Math.floor(Date.now() / 1000);
        const isExpired = Number(expirationTime) < now;
        
        return isExpired; // Available if expired
      } catch {
        // If ownerOf reverts, domain doesn't have an active NFT owner (available)
        return true;
      }
    } catch {
      console.error('Manual availability check failed');
      return false;
    }
  };

  /**
   * Batch check availability for multiple domains
   * Uses contract's checkBulkAvailability function
   */
  const checkBulkAvailability = async (names: string[]): Promise<boolean[]> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    try {
      // Remove .rsk suffix from all names
      const cleanNames = names.map(n => n.toLowerCase().trim().replace(/\.rsk$/i, ''));
      
      const availability = await publicClient.readContract({
        address: RNS_BULK_MANAGER_ADDRESS,
        abi: RNS_BULK_MANAGER_ABI,
        functionName: 'checkBulkAvailability',
        args: [cleanNames],
      });
      
      return availability as boolean[];
    } catch (error) {
      console.error('Error checking bulk availability:', error);
      
      // Fallback: Check each domain individually
      const results = await Promise.all(
        names.map(name => checkAvailability(name))
      );
      
      return results;
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
    checkBulkAvailability,
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

