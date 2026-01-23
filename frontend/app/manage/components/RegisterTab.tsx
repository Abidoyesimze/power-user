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
  const { 
    bulkRegister, 
    isConnected, 
    isLoading, 
    address, 
    hash, 
    isConfirmed, 
    reset, 
    checkAvailability,
    checkBulkAvailability, // NEW: Use bulk checking
    calculateRegistrationCost 
  } = useRNSBulkManager();
  const { bulkCommit, canReveal, isReady: isRegistrarReady } = useRNSRegistrar();
  const { refetch: refetchDomains, domains: userDomains } = useUserDomains();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalPrice, setTotalPrice] = useState<bigint>(BigInt(0));
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(false);
  const [recentlyRegistered, setRecentlyRegistered] = useState<Set<string>>(new Set());
  
  // Commit-reveal flow state
  const [commitResults, setCommitResults] = useState<CommitResult[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isWaitingForReveal, setIsWaitingForReveal] = useState(false);
  const [registrationStage, setRegistrationStage] = useState<'idle' | 'committing' | 'waiting' | 'ready' | 'registering'>('idle');
  const [commitStartTime, setCommitStartTime] = useState<number | null>(null);
  
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const availabilityCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addDomain = () => {
    setDomains([...domains, { name: "", duration: "1" }]);
  };

  const removeDomain = (index: number) => {
    if (domains.length === 1) {
      toast.warning("You must have at least one domain");
      return;
    }
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
      debouncedCalculatePrices();
    }
  };
  
  /**
   * Calculate prices for all valid domains
   * Only calculates for domains that are confirmed available
   */
  const calculatePrices = async () => {
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
        ud => ud.name.toLowerCase().replace(/\.rsk$/i, '') === normalizedName
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
      const names = validDomains.map(d => d.name.trim().replace(/\.rsk$/i, ''));
      const durations = validDomains.map(d => BigInt(parseInt(d.duration) * 365 * 24 * 60 * 60));
      
      const total = await calculateRegistrationCost(names, durations);
      setTotalPrice(total);
    } catch (error) {
      console.error("Error calculating prices:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes("revert") || errorMessage.includes("VM Exception")) {
        // Mark domains as unavailable
        const unavailableNames = validDomains.map(d => d.name.toLowerCase().trim().replace(/\.rsk$/i, ''));
        
        setDomains(prev => prev.map(d => {
          const normalizedName = d.name.toLowerCase().trim().replace(/\.rsk$/i, '');
          if (unavailableNames.includes(normalizedName)) {
            return { ...d, isAvailable: false, isChecking: false };
          }
          return d;
        }));
        
        toast.error(
          `Some domains are no longer available. Please check and try again.`,
          { autoClose: 5000 }
        );
      } else {
        toast.error("Failed to calculate price. Please try again.", { autoClose: 5000 });
      }
      
      setTotalPrice(BigInt(0));
    } finally {
      setIsCalculatingTotal(false);
    }
  };
  
  // Debounced price calculation
  const debouncedCalculatePrices = (() => {
    let timeoutId: NodeJS.Timeout | null = null;
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => calculatePrices(), 500);
    };
  })();
  
  // Format RIF token amount (18 decimals)
  const formatRIF = (amount: bigint): string => {
    const rifAmount = Number(amount) / 1e18;
    if (rifAmount < 0.01) {
      return "< 0.01 RIF";
    }
    return `${rifAmount.toFixed(4)} RIF`;
  };

  /**
   * Check availability for a single domain
   * Includes debouncing and multiple validation layers
   */
  const checkDomainAvailability = async (index: number, name: string) => {
    // CRITICAL: Normalize to label-only (no .rsk suffix) for availability checks
    // The registrar availability API expects only the label, not the full domain
    const normalizedName = name.toLowerCase().trim().replace(/\.rsk$/i, '');
    const normalizedNameWithRsk = `${normalizedName}.rsk`;
    
    // Validate label format (alphanumeric and hyphens only, 3-63 chars)
    // This matches RNS label requirements
    if (!normalizedName || normalizedName.length < 3) {
      setDomains(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isAvailable: undefined, isChecking: false };
        return updated;
      });
      return;
    }
    
    // Additional format validation
    if (!/^[a-z0-9-]{3,63}$/.test(normalizedName)) {
      setDomains(prev => {
        const updated = [...prev];
        updated[index] = { 
          ...updated[index], 
          isAvailable: false, 
          isChecking: false 
        };
        return updated;
      });
      toast.error(`${name} has invalid format. Use 3-63 alphanumeric characters or hyphens.`, { autoClose: 4000 });
      return;
    }
    
    // Clear any pending check
    if (availabilityCheckTimeoutRef.current) {
      clearTimeout(availabilityCheckTimeoutRef.current);
    }
    
    // Debounce - wait 500ms after user stops typing
    availabilityCheckTimeoutRef.current = setTimeout(async () => {
      // Check recently registered
      if (recentlyRegistered.has(normalizedName)) {
        setDomains(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isAvailable: false, isChecking: false };
          return updated;
        });
        return;
      }
      
      // Check user's existing domains
      const isInUserDomains = userDomains.some(
        d => d.name.toLowerCase() === normalizedNameWithRsk.toLowerCase()
      );
      
      if (isInUserDomains) {
        setDomains(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isAvailable: false, isChecking: false };
          return updated;
        });
        return;
      }
      
      // Check on-chain availability
      try {
        setDomains(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isChecking: true, isAvailable: undefined };
          return updated;
        });

        const available = await checkAvailability(normalizedName);
        
        setDomains(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isAvailable: available, isChecking: false };
          return updated;
        });
        
        // Recalculate prices after availability confirmed
        if (available) {
          setTimeout(() => calculatePrices(), 300);
        } else {
          setTotalPrice(BigInt(0));
        }
      } catch (error) {
        console.error(`Error checking availability for ${name}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("revert") || errorMessage.includes("VM Exception")) {
          toast.error(`${name}.rsk appears to be unavailable.`, { autoClose: 4000 });
        } else {
          toast.error(`Failed to check ${name}. Please try again.`, { autoClose: 4000 });
        }
        
        setDomains(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], isChecking: false, isAvailable: undefined };
          return updated;
        });
      }
    }, 500);
  };
  
  /**
   * Validate all domains before proceeding with registration
   * Returns true if all validations pass
   */
  const validateDomains = async (): Promise<boolean> => {
    // Check for empty names
    const hasEmptyNames = domains.some(d => !d.name.trim());
    if (hasEmptyNames) {
      toast.warning("Please fill in all domain names");
      return false;
    }

    // Check for unavailable domains
    const takenDomains = domains.filter(d => d.isAvailable === false);
    if (takenDomains.length > 0) {
      const names = takenDomains.map(d => d.name).join(", ");
      toast.error(`Domain${takenDomains.length > 1 ? 's' : ''} already registered: ${names}`);
      return false;
    }

    // Check if still checking
    const stillChecking = domains.some(d => d.isChecking === true);
    if (stillChecking) {
      toast.info("Please wait while we verify domain availability...");
      return false;
    }

    // Check for unverified domains
    const unverifiedDomains = domains.filter(d => d.name.trim() && d.isAvailable === undefined);
    if (unverifiedDomains.length > 0) {
      toast.warning("Please wait for all domains to be verified");
      return false;
    }

    // CRITICAL: Re-verify all domains on-chain before proceeding
    toast.info("Verifying domain availability on-chain...");
    
    try {
      const domainNames = domains
        .filter(d => d.name.trim())
        .map(d => d.name.trim().replace(/\.rsk$/i, ''));
      
      const availability = await checkBulkAvailability(domainNames);
      
      const unavailableIndices: number[] = [];
      availability.forEach((isAvailable, idx) => {
        if (!isAvailable) {
          unavailableIndices.push(idx);
        }
      });
      
      if (unavailableIndices.length > 0) {
        // Update UI to reflect unavailable domains
        setDomains(prev => prev.map((d, idx) => {
          if (unavailableIndices.includes(idx)) {
            return { ...d, isAvailable: false };
          }
          return d;
        }));
        
        const unavailableNames = unavailableIndices.map(idx => domainNames[idx]).join(", ");
        toast.error(
          `The following domains are no longer available: ${unavailableNames}. They may have been registered by someone else.`,
          { autoClose: 6000 }
        );
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error("Error re-verifying availability:", error);
      toast.error("Failed to verify domain availability. Please try again.");
      return false;
    }
  };

  /**
   * Main registration handler
   * Manages the commit-reveal flow
   */
  const handleRegister = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isRegistrarReady) {
      toast.error("RNS registrar not ready. Please wait...");
      return;
    }

    // If we have commits and countdown is 0, proceed with registration
    if (commitResults.length > 0 && countdown === 0) {
      await proceedWithRegistration();
      return;
    }

    // If we have commits but still waiting, show message
    if (commitResults.length > 0 && countdown !== null && countdown > 0) {
      toast.info(`Please wait ${countdown} seconds before registration...`);
      return;
    }

    // Validate all domains
    const isValid = await validateDomains();
    if (!isValid) {
      return;
    }

    // Step 1: Commit all domains
    try {
      setIsCommitting(true);
      setIsProcessing(true);
      setRegistrationStage('committing');
      toast.info("Step 1/2: Creating commitments...");

      const domainNames = domains
        .filter(d => d.name.trim())
        .map(d => d.name.trim().replace(/\.rsk$/i, ''));
      
      const results = await bulkCommit(domainNames);

      if (results.length === 0) {
        throw new Error("No domains were committed successfully");
      }

      // Validate that we got commits for all domains
      const successfulCommits = results.filter(r => r.domain);
      if (successfulCommits.length < domainNames.length) {
        toast.warning(
          `Only ${successfulCommits.length} of ${domainNames.length} domains were committed successfully. Proceeding with available domains.`
        );
      }

      setCommitResults(successfulCommits);
      setIsCommitting(false);
      setIsWaitingForReveal(true);
      setRegistrationStage('waiting');
      setCommitStartTime(Date.now()); // Track when commits were made
      
      // IMPORTANT: Reset isProcessing after commit completes
      // User should be able to wait or cancel at this point
      setIsProcessing(false);
      
      // Start polling canReveal() instead of hardcoded 60-second wait
      // This ensures we wait for the actual minCommitmentAge, not a fixed time
      setCountdown(60); // Initial estimate
      toast.success(
        `Step 1/2 Complete: ${successfulCommits.length} domain${successfulCommits.length > 1 ? 's' : ''} committed! Waiting for commitment maturity...`,
        { autoClose: 5000 }
      );

      // Poll canReveal() for each commitment instead of hardcoded countdown
      const checkCommitmentsReady = async () => {
        try {
          const allReady = await Promise.all(
            successfulCommits.map(commit => canReveal(commit.commitmentHash))
          );
          
          if (allReady.every(ready => ready)) {
            // All commitments are ready
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            setCountdown(0);
            setRegistrationStage('ready');
            toast.success("All commitments are ready! You can now register.", { autoClose: 3000 });
          } else {
            // Still waiting - update countdown estimate based on elapsed time
            const elapsed = commitStartTime ? (Date.now() - commitStartTime) / 1000 : 0;
            const remaining = Math.max(0, 60 - elapsed);
            setCountdown(Math.ceil(remaining));
          }
        } catch (error) {
          console.error('Error checking commitment readiness:', error);
        }
      };

      // Check immediately, then every 2 seconds
      checkCommitmentsReady();
      countdownIntervalRef.current = setInterval(checkCommitmentsReady, 2000);

    } catch (error) {
      console.error("Commit failed:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Commit failed: ${errorMessage}`);
      
      setIsCommitting(false);
      setIsProcessing(false);
      setRegistrationStage('idle');
    }
  };

  /**
   * Proceed with registration after commit-reveal waiting period
   * CRITICAL: Validates that all commitments are ready before attempting registration
   */
  const proceedWithRegistration = async () => {
    if (!isConnected || !address || commitResults.length === 0) {
      return;
    }

    try {
      // CRITICAL FIX: Verify all commitments are ready before registering
      // This prevents "Commitment too new" errors
      toast.info("Verifying commitments are ready...");
      
      const commitmentChecks = await Promise.all(
        commitResults.map(async (commitResult) => {
          const ready = await canReveal(commitResult.commitmentHash);
          return { commitResult, ready };
        })
      );

      const notReady = commitmentChecks.filter(check => !check.ready);
      if (notReady.length > 0) {
        const notReadyNames = notReady.map(nr => nr.commitResult.domain).join(", ");
        toast.error(
          `The following domains are not ready yet: ${notReadyNames}. Please wait a bit longer.`,
          { autoClose: 8000 }
        );
        return;
      }

      setIsProcessing(true);
      setRegistrationStage('registering');
      toast.info("Step 2/2: Registering domains...");

      // Create registration requests using secrets from commit results
      // CRITICAL: Ensure name is label-only (no .rsk suffix) and lowercase
      const requests = commitResults.map((commitResult) => {
        // Find matching domain
        const domain = domains.find(
          d => d.name.toLowerCase().trim().replace(/\.rsk$/i, '') === 
               commitResult.domain.toLowerCase().trim().replace(/\.rsk$/i, '')
        );

        if (!domain) {
          throw new Error(`No matching domain found for commit: ${commitResult.domain}`);
        }

        // Normalize name: lowercase, strip .rsk, validate format
        const normalizedName = commitResult.domain
          .toLowerCase()
          .trim()
          .replace(/\.rsk$/i, '');
        
        // Validate label format (alphanumeric and hyphens only, 3-63 chars)
        if (!/^[a-z0-9-]{3,63}$/.test(normalizedName)) {
          throw new Error(`Invalid domain name format: ${normalizedName}. Must be 3-63 alphanumeric characters or hyphens.`);
        }

        return {
          name: normalizedName, // Label-only, no .rsk suffix
          owner: address,
          secret: commitResult.secret,
          duration: BigInt(parseInt(domain.duration) * 365 * 24 * 60 * 60),
          addr: address,
        };
      });

      console.log("Registering domains:", requests);
      
      // Call bulkRegister
      await bulkRegister(requests);

      // Success - Transaction confirmed
      const registeredNames = requests.map(r => r.name);
      
      // Mark as recently registered
      setRecentlyRegistered(prev => {
        const newSet = new Set(prev);
        registeredNames.forEach(name => newSet.add(name));
        return newSet;
      });
      
      // Show success message
      const domainList = registeredNames.map(n => `${n}.rsk`).join(", ");
      toast.success(
        `Successfully registered ${registeredNames.length} domain${registeredNames.length > 1 ? 's' : ''}!`,
        { autoClose: 6000 }
      );
      
      setTimeout(() => {
        toast.info(
          `Your domains (${domainList}) are now registered on RNS. They should appear in the official RIF app shortly.`,
          { autoClose: 10000 }
        );
      }, 2000);
      
      // Reset state
      setIsProcessing(false);
      setCommitResults([]);
      setCountdown(null);
      setIsWaitingForReveal(false);
      setRegistrationStage('idle');
      
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      
      // Clear form
      setDomains([{ name: '', duration: '1', isAvailable: undefined, isChecking: false }]);
      setTotalPrice(BigInt(0));
      
      // Refresh domain list
      refetchDomains();
      reset();
      
      // Remove from recently registered after 30 seconds
      setTimeout(() => {
        setRecentlyRegistered(prev => {
          const newSet = new Set(prev);
          registeredNames.forEach(name => newSet.delete(name));
          return newSet;
        });
      }, 30000);
      
    } catch (error) {
      console.error("Registration failed:", error);
      
      setIsProcessing(false);
      setRegistrationStage('idle');
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("User rejected") || errorMessage.includes("denied")) {
        toast.error("Transaction was cancelled. Please try again when ready.");
      } else if (errorMessage.includes("already registered") || errorMessage.includes("unavailable")) {
        toast.error("One or more domains were registered by someone else during the commit period. Please try again with different domains.");
        
        // Clear commits so user can start over
        setCommitResults([]);
        setCountdown(null);
        setIsWaitingForReveal(false);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      } else if (errorMessage.includes("allowance") || errorMessage.includes("approve")) {
        toast.error("Token approval failed. Please try again.");
      } else {
        toast.error(`Registration failed: ${errorMessage}`);
      }
    }
  };
  
  /**
   * Calculate prices when domains change (only for available domains)
   */
  useEffect(() => {
    const hasAvailableDomain = domains.some(
      d => d.name.trim() && d.isAvailable === true && !d.isChecking
    );
    
    if (!hasAvailableDomain) {
      setTotalPrice(BigInt(0));
      return;
    }
    
    const timer = setTimeout(() => {
      calculatePrices();
    }, 500);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains.map(d => `${d.name}-${d.duration}-${d.isAvailable}`).join(',')]);

  /**
   * Handle successful transaction confirmation
   */
  useEffect(() => {
    if (isConfirmed && hash) {
      // This is handled in proceedWithRegistration now
      // But we keep this for backwards compatibility
    }
  }, [isConfirmed, hash]);

  /**
   * Cleanup on unmount
   */
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

  /**
   * Poll to check if commitments can be revealed
   */
  useEffect(() => {
    if (!isWaitingForReveal || commitResults.length === 0 || !isRegistrarReady) {
      return;
    }

    const checkReveal = async () => {
      try {
        const canRevealChecks = await Promise.all(
          commitResults.map(result => canReveal(result.commitmentHash))
        );

        if (canRevealChecks.every(can => can)) {
          setIsWaitingForReveal(false);
          setCountdown(0);
          setRegistrationStage('ready');
          
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          
          toast.success("Commitments are ready! You can now complete registration.", {
            autoClose: 5000
          });
        }
      } catch (error) {
        console.error("Error checking reveal status:", error);
      }
    };

    checkReveal();
    const interval = setInterval(checkReveal, 2000);
    return () => clearInterval(interval);
  }, [isWaitingForReveal, commitResults, canReveal, isRegistrarReady]);

  /**
   * Cancel the current registration process
   */
  const cancelRegistration = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    setCommitResults([]);
    setCountdown(null);
    setIsWaitingForReveal(false);
    setIsCommitting(false);
    setIsProcessing(false);
    setRegistrationStage('idle');
    
    toast.info("Registration cancelled. You can start over when ready.");
  };

  /**
   * Get button text based on current state
   */
  const getButtonText = () => {
    if (isCommitting) return "Creating Commitments...";
    if (isWaitingForReveal && countdown !== null && countdown > 0) return `Waiting... (${countdown}s)`;
    if (isProcessing || isLoading) return "Processing...";
    if (domains.some(d => d.isAvailable === false)) return "Some domains unavailable";
    if (domains.every(d => !d.name.trim())) return "Enter domain names";
    
    const validCount = domains.filter(d => d.name.trim() && d.isAvailable === true).length;
    
    if (commitResults.length > 0 && countdown === 0) {
      return `Complete Registration (${validCount} domain${validCount > 1 ? 's' : ''})`;
    }
    
    return `Start Registration (${validCount} domain${validCount > 1 ? 's' : ''})`;
  };

  /**
   * Check if registration button should be disabled
   */
  const isButtonDisabled = () => {
    // During commit phase
    if (isCommitting) return true;
    
    // During registration phase
    if (registrationStage === 'registering' || isLoading) return true;
    
    // If not connected
    if (!isConnected || !isRegistrarReady) return true;
    
    // During waiting period (but NOT when ready)
    if (registrationStage === 'waiting' && countdown !== null && countdown > 0) return true;
    
    // If we're ready to register (after countdown), button should be ENABLED
    if (registrationStage === 'ready' && countdown === 0) return false;
    
    // Initial validation checks (only for idle state)
    if (registrationStage === 'idle') {
      if (domains.some(d => d.isAvailable === false)) return true;
      if (domains.every(d => !d.name.trim())) return true;
      if (domains.some(d => d.name.trim() && d.isChecking)) return true;
    }
    
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Register New Domains</h3>
        <p className="text-gray-400 text-sm mb-6">
          Register multiple RNS domains in a single transaction using the official RNS registrar
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
                    disabled={registrationStage !== 'idle'}
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
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
                    disabled={registrationStage !== 'idle'}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="1">1 Year</option>
                    <option value="2">2 Years</option>
                    <option value="5">5 Years</option>
                  </select>
                </div>
                <div className="flex items-end">
                  {domains.length > 1 ? (
                    <button
                      onClick={() => removeDomain(index)}
                      disabled={registrationStage !== 'idle'}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  ) : (
                    <div className="text-xs text-gray-500 py-2 w-full text-center">
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
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${registrationStage === 'ready' ? 'bg-green-400' : 'bg-blue-400 animate-pulse'}`}></div>
                  <p className="text-sm text-blue-400 font-semibold">
                    {registrationStage === 'waiting' && `Step 1/2 Complete: ${commitResults.length} domain${commitResults.length > 1 ? 's' : ''} committed`}
                    {registrationStage === 'ready' && "Ready to register!"}
                  </p>
                </div>
                
                {countdown !== null && countdown > 0 && (
                  <p className="text-2xl font-bold text-blue-400 mt-2">
                    {countdown} seconds remaining
                  </p>
                )}
                
                {countdown === 0 && (
                  <p className="text-sm text-green-400 mt-2">
                    ✓ Waiting period complete. Click button below to finalize registration.
                  </p>
                )}
                
                <p className="text-xs text-gray-400 mt-2">
                  The 60-second waiting period prevents front-running attacks
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Total Price Display */}
        <div className="mt-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-400">Total Registration Cost</p>
              <p className="text-2xl font-bold text-purple-400">
                {isCalculatingTotal 
                  ? "Calculating..." 
                  : totalPrice > BigInt(0)
                  ? formatRIF(totalPrice)
                  : domains.some(d => d.name.trim() && d.isChecking)
                  ? "Checking availability..."
                  : domains.some(d => d.name.trim() && d.isAvailable === undefined)
                  ? "Verifying domains..."
                  : domains.some(d => d.name.trim() && d.isAvailable === true)
                  ? formatRIF(totalPrice)
                  : "0 RIF"
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Paid in RIF tokens • Official RNS pricing • Gas fees apply separately
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={addDomain}
            disabled={registrationStage !== 'idle'}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Domain
          </button>
          
          {/* Show Cancel button during waiting period */}
          {(registrationStage === 'waiting' || registrationStage === 'ready') && (
            <button
              onClick={cancelRegistration}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          
          <button
            onClick={handleRegister}
            disabled={isButtonDisabled()}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1 font-semibold"
          >
            {getButtonText()}
          </button>
        </div>
        
        {/* Help Text */}
        {registrationStage === 'idle' && (
          <p className="text-xs text-gray-500 mt-4 text-center">
            Registration uses a commit-reveal scheme for security. Total time: ~2 minutes
          </p>
        )}
      </div>
    </div>
  );
}