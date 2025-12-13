"use client";

import { useState, useEffect, useRef } from "react";
import { useRNSBulkManager } from "@/lib/hooks/useContract";
import { useRNSRegistrar, CommitResult } from "@/lib/hooks/useRNSRegistrar";
import { toast } from "react-toastify";
import { useUserDomains } from "@/lib/hooks/useDomains";

interface DomainStatus {
  name: string;
  duration: string;
  isAvailable?: boolean;
  isChecking?: boolean;
  price?: bigint;
  isCalculatingPrice?: boolean;
}

export default function RegisterTab() {
  const [domains, setDomains] = useState<DomainStatus[]>([{ name: "", duration: "1" }]);
  const { bulkRegister, isConnected, isLoading, address, hash, isConfirmed, reset, checkAvailability, calculateRegistrationCost } = useRNSBulkManager();
  const { bulkCommit, canReveal, isReady: isRegistrarReady } = useRNSRegistrar();
  const { refetch: refetchDomains, domains: userDomains } = useUserDomains();
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalPrice, setTotalPrice] = useState<bigint>(BigInt(0));
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(false);
  // Track recently registered domains to mark them as unavailable
  const [recentlyRegistered, setRecentlyRegistered] = useState<Set<string>>(new Set());
  
  // Commit-reveal flow state
  const [commitResults, setCommitResults] = useState<CommitResult[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isWaitingForReveal, setIsWaitingForReveal] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const availabilityCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addDomain = () => {
    setDomains([...domains, { name: "", duration: "1" }]);
  };

  const removeDomain = (index: number) => {
    setDomains(domains.filter((_, i) => i !== index));
  };

  const updateDomain = (index: number, field: string, value: string) => {
    const updated = [...domains];
    updated[index] = { ...updated[index], [field]: value };
    setDomains(updated);

    // Check availability when domain name changes
    if (field === "name" && value.trim()) {
      checkDomainAvailability(index, value);
    }
    
    // Recalculate prices when name or duration changes
    if ((field === "name" || field === "duration") && value.trim()) {
      calculatePrices();
    }
  };
  
  const calculatePrices = async () => {
    // Only calculate prices for domains that are confirmed available
    // Add comprehensive checks to prevent calculating for unavailable domains
    const validDomains = domains.filter(d => {
      const name = d.name.trim();
      if (!name) return false;
      
      // Must be explicitly marked as available
      if (d.isAvailable !== true) return false;
      
      // Must not be currently checking
      if (d.isChecking) return false;
      
      // Must not be in user's registered domains list
      const normalizedName = name.toLowerCase().replace(/\.rsk$/i, '');
      const isInUserDomains = userDomains.some(
        ud => {
          const udName = ud.name.toLowerCase().replace(/\.rsk$/i, '');
          return udName === normalizedName;
        }
      );
      if (isInUserDomains) return false;
      
      // Must not be recently registered
      if (recentlyRegistered.has(normalizedName)) return false;
      
      return true;
    });
    
    if (validDomains.length === 0) {
      setTotalPrice(BigInt(0));
      return;
    }
    
    setIsCalculatingTotal(true);
    try {
      // Strip .rsk suffix before sending to contract (FIFS registrar expects names without .rsk)
      const names = validDomains.map(d => d.name.trim().replace(/\.rsk$/i, ''));
      const durations = validDomains.map(d => BigInt(parseInt(d.duration) * 365 * 24 * 60 * 60));
      
      // Final validation before calling contract
      if (names.length === 0 || names.some(n => !n || n.length === 0)) {
        setTotalPrice(BigInt(0));
        return;
      }
      
      // Call the contract to calculate price
      // Note: calculateRegistrationCost already strips .rsk, but we do it here too for safety
      const total = await calculateRegistrationCost(names, durations);
      setTotalPrice(total);
    } catch (error) {
      console.error("Error calculating prices:", error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("revert") || errorMessage.includes("VM Exception")) {
        // Domain is likely not available (contract reverted)
        const unavailableDomains = validDomains.map(d => d.name).join(", ");
        
        // Mark these domains as unavailable in the UI
        setDomains(prev => prev.map(d => {
          const normalizedName = d.name.toLowerCase().trim().replace(/\.rsk$/i, '');
          const isUnavailable = validDomains.some(vd => 
            vd.name.toLowerCase().trim().replace(/\.rsk$/i, '') === normalizedName
          );
          if (isUnavailable) {
            return { ...d, isAvailable: false, isChecking: false };
          }
          return d;
        }));
        
        toast.error(
          `Cannot calculate price: ${unavailableDomains} ${validDomains.length > 1 ? 'are' : 'is'} already registered or unavailable.`,
          { autoClose: 5000 }
        );
      } else {
        // Other errors (network, RPC, etc.)
        toast.error("Failed to calculate registration price. Please try again.", { autoClose: 5000 });
      }
      
      // Set price to 0 on error
      setTotalPrice(BigInt(0));
    } finally {
      setIsCalculatingTotal(false);
    }
  };
  
  // Format RIF token amount (18 decimals)
  const formatRIF = (amount: bigint): string => {
    const rifAmount = Number(amount) / 1e18;
    if (rifAmount < 0.01) {
      return "< 0.01 RIF";
    }
    return `${rifAmount.toFixed(4)} RIF`;
  };

  const checkDomainAvailability = async (index: number, name: string) => {
    const normalizedName = name.toLowerCase().trim().replace(/\.rsk$/i, '');
    const normalizedNameWithRsk = `${normalizedName}.rsk`;
    
    // Skip empty names or very short names (less than 3 characters)
    // This prevents checking on every keystroke and avoids errors for invalid short names
    if (!normalizedName || normalizedName.length < 3) {
      setDomains(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isAvailable: undefined, isChecking: false };
        return updated;
      });
      return;
    }
    
    // Clear any pending availability check
    if (availabilityCheckTimeoutRef.current) {
      clearTimeout(availabilityCheckTimeoutRef.current);
    }
    
    // Debounce availability check - wait 500ms after user stops typing
    availabilityCheckTimeoutRef.current = setTimeout(async () => {
      // Step 1: Check if this domain was recently registered
      if (recentlyRegistered.has(normalizedName)) {
        setDomains(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isAvailable: false, isChecking: false };
          return updated;
        });
        return;
      }
      
      // Step 2: Check if domain is in user's registered domains list (same as NameSearch)
      const isInUserDomains = userDomains.some(
        d => d.name.toLowerCase() === normalizedNameWithRsk.toLowerCase()
      );
      
      if (isInUserDomains) {
        // Domain is already registered by this user
        setDomains(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isAvailable: false, isChecking: false };
          return updated;
        });
        return;
      }
      
      // Step 3: Check availability using the hook (which checks FIFS registrar and registry)
      try {
        setDomains(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isChecking: true, isAvailable: undefined };
          return updated;
        });

        const available = await checkAvailability(name);
        
        setDomains(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isAvailable: available, isChecking: false };
          return updated;
        });
      
      // Recalculate prices after availability check
      if (available) {
        // Small delay to ensure state is updated before calculating prices
        // This prevents race conditions where price calculation runs before availability is confirmed
        setTimeout(() => {
          // Double-check that domain is still available before calculating price
          const currentDomain = domains[index];
          if (currentDomain && currentDomain.isAvailable === true && !currentDomain.isChecking) {
            calculatePrices();
          } else {
            setTotalPrice(BigInt(0));
          }
        }, 300);
      } else {
        setTotalPrice(BigInt(0)); // Clear price if domain is unavailable
      }
    } catch (error) {
      console.error(`Error checking availability for ${name}:`, error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("revert") || errorMessage.includes("VM Exception")) {
        toast.error(`${name}.rsk appears to be unavailable. Please check the domain name.`, { autoClose: 4000 });
      } else {
        toast.error(`Failed to check availability for ${name}. Please try again.`, { autoClose: 4000 });
      }
      
      setDomains(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isChecking: false, isAvailable: undefined };
        return updated;
      });
    }
  };
  
  // Calculate prices when domains change (only for available domains)
  useEffect(() => {
    // Only calculate if we have at least one confirmed available domain
    const hasAvailableDomain = domains.some(d => d.name.trim() && d.isAvailable === true && !d.isChecking);
    
    if (!hasAvailableDomain) {
      setTotalPrice(BigInt(0));
      return;
    }
    
    const timer = setTimeout(() => {
      calculatePrices();
    }, 500); // Debounce price calculation
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains.map(d => `${d.name}-${d.duration}-${d.isAvailable}`).join(',')]);

  // Show success message when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && hash) {
      // Store the registered domain names before clearing the form
      const registeredNames = domains
        .filter(d => d.name.trim())
        .map(d => d.name.toLowerCase().trim());
      
      // Add to recently registered set
      setRecentlyRegistered(prev => {
        const newSet = new Set(prev);
        registeredNames.forEach(name => newSet.add(name));
        return newSet;
      });
      
      const domainList = registeredNames.map(n => `${n}.rsk`).join(", ");
      toast.success(
        `Successfully registered ${domains.length} domain${domains.length > 1 ? 's' : ''}! The transaction has been confirmed.`,
        { autoClose: 6000 }
      );
      
      // Show additional info about official RNS visibility
      setTimeout(() => {
        toast.info(
          `Your domains (${domainList}) are registered through the official RNS FIFS registrar (same as the RIF app). They should appear in the official RIF app shortly. Note: On testnet, there may be a delay before domains appear in the RIF app due to registry update timing.`,
          { autoClose: 12000 }
        );
      }, 2000);
      
      // Clear commit-reveal state
      setCommitResults([]);
      setCountdown(null);
      setIsWaitingForReveal(false);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      
      // Clear the form
      setDomains([{ name: "", duration: "1" }]);
      
      // Refresh domain list
      refetchDomains();
      
      // Reset the hook state
      reset();
      
      // After 30 seconds, remove from recently registered (blockchain state should be updated by then)
      setTimeout(() => {
        setRecentlyRegistered(prev => {
          const newSet = new Set(prev);
          registeredNames.forEach(name => newSet.delete(name));
          return newSet;
        });
      }, 30000); // 30 seconds
    }
  }, [isConfirmed, hash, domains, reset, refetchDomains]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (availabilityCheckTimeoutRef.current) {
        clearTimeout(availabilityCheckTimeoutRef.current);
      }
    };
  }, []);

  // Check if commitments can be revealed (poll every second)
  useEffect(() => {
    if (!isWaitingForReveal || commitResults.length === 0 || !isRegistrarReady) {
      return;
    }

    const checkReveal = async () => {
      try {
        // Check all commitments
        const canRevealChecks = await Promise.all(
          commitResults.map(result => canReveal(result.commitmentHash))
        );

        // If all can be revealed, enable registration
        if (canRevealChecks.every(can => can)) {
          setIsWaitingForReveal(false);
          setCountdown(0);
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          toast.success("Commitments are ready! You can now register.");
        }
      } catch (error) {
        console.error("Error checking reveal status:", error);
      }
    };

    // Check immediately
    checkReveal();

    // Then check every 2 seconds
    const interval = setInterval(checkReveal, 2000);
    return () => clearInterval(interval);
  }, [isWaitingForReveal, commitResults, canReveal, isRegistrarReady]);

  const handleRegister = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isRegistrarReady) {
      toast.error("RNS registrar not ready. Please wait...");
      return;
    }

    // Validate domain names
    const hasEmptyNames = domains.some(d => !d.name.trim());
    if (hasEmptyNames) {
      toast.warning("Please fill in all domain names");
      return;
    }

    // Check if any domain is already taken
    const takenDomains = domains.filter(d => d.isAvailable === false);
    if (takenDomains.length > 0) {
      const names = takenDomains.map(d => d.name).join(", ");
      toast.error(`Domain${takenDomains.length > 1 ? 's' : ''} already registered: ${names}`);
      return;
    }

    // Check if we're still checking some domains
    const stillChecking = domains.some(d => d.isChecking === true);
    if (stillChecking) {
      toast.info("Please wait while we verify domain availability...");
      return;
    }

    // If we have commit results and countdown is 0, proceed with registration
    if (commitResults.length > 0 && countdown === 0) {
      await proceedWithRegistration();
      return;
    }

    // If we have commit results but still waiting, show message
    if (commitResults.length > 0 && countdown !== null && countdown > 0) {
      toast.info(`Please wait ${countdown} seconds before registration...`);
      return;
    }

    // Step 1: Commit all domains
    try {
      setIsCommitting(true);
      setIsProcessing(true);
      toast.info("Step 1/2: Committing domains...");

      const domainNames = domains.map(d => d.name.trim());
      const results = await bulkCommit(domainNames);

      if (results.length === 0) {
        throw new Error("No domains were committed successfully");
      }

      setCommitResults(results);
      setIsCommitting(false);
      setIsWaitingForReveal(true);
      
      // Start countdown from 60 seconds
      setCountdown(60);
      toast.success(`Step 1/2 Complete: ${results.length} domain${results.length > 1 ? 's' : ''} committed! Waiting 60 seconds...`);

      // Start countdown timer
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error("Commit failed:", error);
      toast.error(`Commit failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsCommitting(false);
      setIsProcessing(false);
    }
  };

  const proceedWithRegistration = async () => {
    if (!isConnected || !address || commitResults.length === 0) {
      return;
    }

    try {
      setIsProcessing(true);
      toast.info("Step 2/2: Registering domains...");

      // Create registration requests using secrets from commit results
      const requests = domains
        .filter(d => d.name.trim())
        .map((d) => {
          // Find matching commit result
          const commitResult = commitResults.find(
            cr => cr.domain.toLowerCase().trim() === d.name.toLowerCase().trim()
          );

          if (!commitResult) {
            throw new Error(`No commit result found for domain: ${d.name}`);
          }

          return {
            name: d.name.trim().replace(/\.rsk$/i, ''), // Remove .rsk suffix
            owner: address,
            secret: commitResult.secret, // Use secret from commit
            duration: BigInt(parseInt(d.duration) * 365 * 24 * 60 * 60),
            addr: address,
          };
        });

      console.log("Calling bulkRegister with requests:", requests);
      
      // Call bulkRegister - this will:
      // 1. Check allowance
      // 2. Approve if needed (wallet popup #1)
      // 3. Call writeContract (wallet popup #2)
      // 4. Wait for transaction confirmation
      await bulkRegister(requests);

      // Transaction is now confirmed
      const registeredCount = domains.length;
      
      // Store registered domain names for the useEffect
      const registeredNames = domains
        .filter(d => d.name.trim())
        .map(d => d.name.toLowerCase().trim());
      setRecentlyRegistered(prev => {
        const newSet = new Set(prev);
        registeredNames.forEach(name => newSet.add(name));
        return newSet;
      });
      
      // Reset state
      setIsProcessing(false);
      
      // Clear commit results and countdown
      setCommitResults([]);
      setCountdown(null);
      setIsWaitingForReveal(false);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      
      // Clear domain inputs
      setDomains([{ name: '', duration: '1', isAvailable: null, isChecking: false, price: BigInt(0) }]);
      
      toast.success(`Successfully registered ${registeredCount} domain${registeredCount > 1 ? 's' : ''}!`);
      
      // Refetch domains to show newly registered ones
      refetchDomains();
    } catch (error) {
      console.error("Registration failed:", error);
      
      // Reset processing state on error
      setIsProcessing(false);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("User rejected") || errorMessage.includes("denied")) {
        toast.error("Transaction was cancelled. Please try again when ready.");
      } else if (errorMessage.includes("allowance") || errorMessage.includes("approve")) {
        toast.error("Token approval failed. Please try again.");
      } else {
        toast.error(`Registration failed: ${errorMessage}`);
      }
    }
    // Note: Don't set isProcessing to false here - let it stay true until transaction is confirmed or user cancels
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Register New Domains</h3>
        <p className="text-gray-400 text-sm mb-6">
          Register multiple RNS domains in a single transaction and save on gas fees
        </p>

        <div className="space-y-4">
          {domains.map((domain, index) => (
            <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Domain Name
                    {domain.isChecking && (
                      <span className="ml-2 text-xs text-blue-400 animate-pulse">Checking...</span>
                    )}
                    {domain.isAvailable === true && domain.name && (
                      <span className="ml-2 text-xs text-green-400">✓ Available</span>
                    )}
                    {domain.isAvailable === false && domain.name && (
                      <span className="ml-2 text-xs text-red-400">✗ Already registered</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="mysite (will become mysite.rsk)"
                    value={domain.name}
                    onChange={(e) => updateDomain(index, "name", e.target.value)}
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${
                      domain.isAvailable === false 
                        ? "border-red-500 focus:ring-red-500" 
                        : domain.isAvailable === true
                        ? "border-green-500 focus:ring-green-500"
                        : "border-gray-600 focus:ring-purple-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Registration Duration
                  </label>
                  <select
                    value={domain.duration}
                    onChange={(e) => updateDomain(index, "duration", e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="1">1 Year</option>
                    <option value="2">2 Years</option>
                    <option value="5">5 Years</option>
                  </select>
                </div>
                <div className="flex items-end">
                  {domains.length > 1 && (
                    <button
                      onClick={() => removeDomain(index)}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                  {domains.length === 1 && (
                    <div className="text-xs text-gray-500 py-2">
                      Owner: {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : "Not connected"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Commit-Reveal Status */}
        {commitResults.length > 0 && (
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-400 font-semibold">
                  {isWaitingForReveal 
                    ? `Step 1/2 Complete: ${commitResults.length} domain${commitResults.length > 1 ? 's' : ''} committed`
                    : countdown === 0
                    ? "Ready to register!"
                    : "Waiting for commitments to mature..."
                  }
                </p>
                {countdown !== null && countdown > 0 && (
                  <p className="text-2xl font-bold text-blue-400 mt-2">
                    {countdown} seconds remaining
                  </p>
                )}
                {countdown === 0 && (
                  <p className="text-sm text-green-400 mt-2">
                    ✓ Commitments are ready. Click Register to proceed.
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Commit-reveal scheme prevents front-running (60 second wait required)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Total Price Display */}
        <div className="mt-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Registration Cost</p>
              <p className="text-2xl font-bold text-purple-400">
                {isCalculatingTotal 
                  ? "Calculating..." 
                  : totalPrice > BigInt(0)
                  ? formatRIF(totalPrice)
                  : domains.some(d => d.name.trim() && d.isChecking)
                  ? "Checking availability..."
                  : domains.some(d => d.name.trim() && d.isAvailable === undefined)
                  ? "Enter domain names"
                  : "0 RIF"
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Paid in RIF tokens • Official RNS pricing
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={addDomain}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            + Add Domain
          </button>
          <button
            onClick={handleRegister}
            disabled={
              isProcessing || 
              isLoading || 
              !isConnected || 
              !isRegistrarReady ||
              domains.some(d => d.isAvailable === false) ||
              domains.every(d => !d.name.trim()) ||
              (commitResults.length > 0 && countdown !== null && countdown > 0)
            }
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {isCommitting
              ? "Committing..."
              : isWaitingForReveal && countdown !== null && countdown > 0
              ? `Waiting... (${countdown}s)`
              : isProcessing || isLoading 
              ? "Processing..." 
              : domains.some(d => d.isAvailable === false)
              ? "Some domains are unavailable"
              : domains.every(d => !d.name.trim())
              ? "Enter domain names"
              : commitResults.length > 0 && countdown === 0
              ? `Register ${domains.filter(d => d.name.trim()).length} Domain${domains.filter(d => d.name.trim()).length > 1 ? "s" : ""}`
              : `Register ${domains.filter(d => d.name.trim()).length} Domain${domains.filter(d => d.name.trim()).length > 1 ? "s" : ""}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}

