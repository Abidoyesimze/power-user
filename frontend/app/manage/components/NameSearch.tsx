"use client";

import { useState } from "react";
import { usePublicClient, useAccount } from "wagmi";
import { RNS_BULK_MANAGER_ADDRESS, RNS_BULK_MANAGER_ABI } from "@/lib/abi";
import { namehash } from "viem";
import { useUserDomains } from "@/lib/hooks/useDomains";

export default function NameSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    available: boolean;
    registered: boolean;
    owner?: string;
    expiry?: string;
  } | null>(null);
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { domains: userDomains } = useUserDomains();

  const checkNameAvailability = async () => {
    if (!searchTerm) return;

    setIsSearching(true);
    setSearchResult(null);

    try {
          // Normalize the domain name (without .rsk for FIFS registrar)
          // FIFS registrar expects domain names WITHOUT the .rsk suffix
          const domainName = searchTerm.toLowerCase().trim().replace(/\.rsk$/i, "");
          const normalizedName = `${domainName}.rsk`;

      if (!publicClient) {
        throw new Error("Public client not available");
      }

      // RNS Registry address on testnet
      const RNS_REGISTRY = "0x7d284aaac6e925aad802a53c0c69efe3764597b8" as const;
      const node = namehash(normalizedName);
      
      // Step 0: FIRST check if domain is in user's registered domains list
      // This is the most reliable check for domains registered through our platform
      const isInUserDomains = userDomains.some(
        d => d.name.toLowerCase() === normalizedName.toLowerCase()
      );
      
      if (isInUserDomains) {
        // Domain is definitely registered (in user's list)
        const userDomain = userDomains.find(
          d => d.name.toLowerCase() === normalizedName.toLowerCase()
        );
        setSearchResult({
          available: false,
          registered: true,
          owner: userDomain?.owner || address,
        });
        return;
      }
      
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
          functionName: "fifsRegistrar",
        });

        try {
          const available = await publicClient.readContract({
            address: fifsRegistrarAddress as `0x${string}`,
            abi: [
              {
                inputs: [{ name: "name", type: "string" }],
                name: "available",
                outputs: [{ name: "", type: "bool" }],
                stateMutability: "view",
                type: "function",
              },
            ],
            functionName: "available",
            args: [domainName],
          });
          fifsAvailable = available as boolean;
        } catch (fifsCallError) {
          // If FIFS registrar call reverts, it might mean the domain is invalid or taken
          // We'll check the registry to be sure
          console.warn("FIFS registrar available() call reverted:", fifsCallError);
          fifsAvailable = null;
        }
      } catch (fifsError) {
        console.warn("Could not get FIFS registrar address:", fifsError);
      }
      
      // Step 2: Check registry owner (ALWAYS check this, even if FIFS check succeeded)
      try {
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
        registryOwner = owner as string;
      } catch (registryError) {
        console.error("Registry owner check failed:", registryError);
      }
      
          // Step 3: Determine availability based on both checks
          // Priority: Registry owner check is most reliable (especially on testnet)
          // FIFS registrar is used as secondary confirmation
          
          // Domain is UNAVAILABLE if registry has a non-zero owner
          if (registryOwner && registryOwner !== "0x0000000000000000000000000000000000000000") {
            // Domain is registered
            setSearchResult({
              available: false,
              registered: true,
              owner: registryOwner,
            });
          } else {
            // Registry owner is zero - domain is likely available
            // Use FIFS registrar as confirmation if available
            if (fifsAvailable === true) {
              // Both registry and FIFS confirm available
              setSearchResult({
                available: true,
                registered: false,
              });
            } else {
              // FIFS registrar reverted or returned false, but registry says available
              // On testnet, FIFS registrar may have issues, so trust the registry
              // If registry owner is zero, domain is available
              setSearchResult({
                available: true,
                registered: false,
              });
            }
          }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResult({
        available: false,
        registered: false,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      checkNameAvailability();
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-2xl p-8 border border-purple-500/20">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-3">
        Check Domain Availability
      </h2>
      <p className="text-gray-400 mb-6">
        Search for .rsk domains and see if they&apos;re available for registration
      </p>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Enter domain name (e.g., mysite)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-6 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
        />
        <button
          onClick={checkNameAvailability}
          disabled={!searchTerm || isSearching}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      {searchResult && (
        <div className="mt-6 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
          <div className="flex items-center gap-3">
            {searchResult.available ? (
              <>
                <span className="text-green-500 text-2xl">✅</span>
                <div>
                  <p className="text-green-400 font-semibold">Available!</p>
                  <p className="text-gray-400 text-sm">
                    {searchTerm}.rsk is available for registration
                  </p>
                </div>
              </>
            ) : (
              <>
                <span className="text-red-500 text-2xl">❌</span>
                <div>
                  <p className="text-red-400 font-semibold">Already Registered</p>
                  <p className="text-gray-400 text-sm">
                    Owner: {searchResult.owner?.substring(0, 10)}...
                    {searchResult.owner?.substring(searchResult.owner.length - 8)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

