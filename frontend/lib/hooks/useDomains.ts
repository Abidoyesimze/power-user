"use client";

import { useAccount, usePublicClient } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { Address, namehash, decodeFunctionData } from "viem";
import { RNS_BULK_MANAGER_ABI } from "@/lib/abi";

// Contract addresses on testnet
const RNS_REGISTRY = "0x7d284aaac6e925aad802a53c0c69efe3764597b8" as Address;
const RNS_BULK_MANAGER = "0xdb34e8611333fd6dd3a57c59f125eba8878378cd" as Address;

interface Domain {
  id: string;
  name: string;
  owner: string;
  expiry: Date | null;
  resolver: string;
  address: string;
  tokenId: bigint;
  isExpired?: boolean;
  daysUntilExpiry?: number;
}

export function useUserDomains() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    if (!isConnected || !address || !publicClient) {
      setDomains([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Query our BulkRegistration events to get registered domains
      const currentBlock = await publicClient.getBlockNumber();
      // RPC limits to 2000 blocks
      const fromBlock = currentBlock > BigInt(2000) ? currentBlock - BigInt(2000) : BigInt(0);

      // Query BulkRegistration events from our contract
      const bulkRegistrationLogs = await publicClient.getLogs({
        address: RNS_BULK_MANAGER,
        event: {
          type: "event",
          name: "BulkRegistration",
          inputs: [
            { indexed: true, name: "user", type: "address" },
            { indexed: false, name: "count", type: "uint256" },
            { indexed: false, name: "totalCost", type: "uint256" },
          ],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        args: {
          user: address,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        fromBlock,
        toBlock: "latest",
      });

      console.log("Found BulkRegistration events:", bulkRegistrationLogs.length);

      // For each event, fetch the transaction to decode domain names
      const uniqueDomains = new Map<string, Domain>();
      
      for (const log of bulkRegistrationLogs) {
        try {
          // Get the transaction to decode domain names
          const tx = await publicClient.getTransaction({ hash: log.transactionHash });
          
          console.log("Processing transaction:", log.transactionHash);
          
          // Decode the function call using viem's decodeFunctionData
          const decoded = decodeFunctionData({
            abi: RNS_BULK_MANAGER_ABI,
            data: tx.input,
          });
          
          console.log("Decoded function:", decoded.functionName);
          
          if (decoded.functionName === "bulkRegister" && decoded.args) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const requests = decoded.args[0] as any[]; // First parameter is the array of requests
            console.log("Number of requests:", requests?.length);
            
            if (!Array.isArray(requests)) {
              console.error("Requests is not an array:", requests);
              continue;
            }
            
            for (const request of requests) {
              const domainName = request.name as string;
              const duration = request.duration as bigint; // Duration in seconds
              console.log("Processing domain:", domainName);
              
              const normalizedName = domainName.toLowerCase().endsWith('.rsk') 
                ? domainName.toLowerCase() 
                : `${domainName.toLowerCase()}.rsk`;
              
              console.log("Normalized name:", normalizedName);
              
              const node = namehash(normalizedName);
              const nodeStr = node;
              
              if (!uniqueDomains.has(nodeStr)) {
                // Verify ownership
                try {
                  console.log("Checking ownership for node:", node);
                  
                  // Get the transaction receipt to get block timestamp
                  const receipt = await publicClient.getTransactionReceipt({ hash: log.transactionHash });
                  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
                  const registrationTime = new Date(Number(block.timestamp) * 1000);
                  
                  // Calculate expiration date (registration time + duration)
                  const expiryDate = new Date(registrationTime.getTime() + Number(duration) * 1000);
                  const now = new Date();
                  const isExpired = expiryDate < now;
                  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  
                  const owner = await publicClient.readContract({
                    address: RNS_REGISTRY,
                    abi: [
                      {
                        inputs: [{ name: "node", type: "bytes32" }],
                        name: "owner",
                        outputs: [{ name: "", type: "address" }],
                        stateMutability: "view",
                        type: "function",
                      },
                    ],
                    functionName: "owner",
                    args: [node],
                  });
                  
                  console.log("Owner from registry:", owner);
                  console.log("User address:", address);
                  
                  // Check if domain is owned by user OR if it's zero address (not yet registered in registry)
                  // Since we're tracking registrations through our BulkManager, we trust our events
                  if (owner.toLowerCase() === address.toLowerCase() || owner === "0x0000000000000000000000000000000000000000") {
                    console.log("✅ Domain registered through BulkManager:", normalizedName);
                    uniqueDomains.set(nodeStr, {
                      id: nodeStr,
                      name: normalizedName,
                      owner: owner !== "0x0000000000000000000000000000000000000000" ? owner as string : address,
                      expiry: expiryDate,
                      resolver: "0x0000000000000000000000000000000000000000",
                      address: "0x0000000000000000000000000000000000000000",
                      tokenId: BigInt(node),
                      isExpired,
                      daysUntilExpiry,
                    });
                  } else {
                    console.log("❌ Domain not owned by user:", normalizedName, "owner:", owner);
                  }
                } catch (err) {
                  console.error(`Error checking ownership for ${normalizedName}:`, err);
                }
              }
            }
          }
        } catch (err) {
          console.error("Error processing BulkRegistration event:", err);
          console.error("Transaction hash:", log.transactionHash);
        }
      }

      setDomains(Array.from(uniqueDomains.values()));

      if (uniqueDomains.size === 0) {
        console.log("No domains found in the last 2000 blocks. If you just registered a domain, it may take a moment to appear, or you can manually refresh.");
      }
    } catch (err: unknown) {
      console.error("Error fetching domains:", err);
      
      let errorMsg = "Failed to load domains.";
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("Invalid params") || errorMessage.includes("block range")) {
        errorMsg = "RPC block range limit reached. Try a smaller date range.";
      } else if (errorMessage.includes("does not exist")) {
        errorMsg = "RPC endpoint doesn't support event queries. Try refreshing or check your connection.";
      }
      
      setError(errorMsg);
      setDomains([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, publicClient]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  return { domains, isLoading, error, refetch: fetchDomains };
}
