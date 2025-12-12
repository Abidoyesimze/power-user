"use client";

import { useState, useEffect } from "react";
import { useRNSBulkManager } from "@/lib/hooks/useContract";
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
  const { refetch: refetchDomains, domains: userDomains } = useUserDomains();
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalPrice, setTotalPrice] = useState<bigint>(BigInt(0));
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(false);
  // Track recently registered domains to mark them as unavailable
  const [recentlyRegistered, setRecentlyRegistered] = useState<Set<string>>(new Set());

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
    // Only calculate prices for domains that are available (not unavailable, not still checking)
    const validDomains = domains.filter(d => 
      d.name.trim() && 
      d.isAvailable === true && // Only calculate for confirmed available domains
      !d.isChecking // Don't calculate while still checking
    );
    
    if (validDomains.length === 0) {
      setTotalPrice(BigInt(0));
      return;
    }
    
    setIsCalculatingTotal(true);
    try {
      const names = validDomains.map(d => d.name.trim());
      const durations = validDomains.map(d => BigInt(parseInt(d.duration) * 365 * 24 * 60 * 60));
      
      const total = await calculateRegistrationCost(names, durations);
      setTotalPrice(total);
    } catch (error) {
      console.error("Error calculating prices:", error);
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
    const normalizedName = name.toLowerCase().trim();
    const normalizedNameWithRsk = normalizedName.endsWith('.rsk') ? normalizedName : `${normalizedName}.rsk`;
    
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
        calculatePrices();
      } else {
        setTotalPrice(BigInt(0)); // Clear price if domain is unavailable
      }
    } catch (error) {
      console.error(`Error checking availability for ${name}:`, error);
      setDomains(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isChecking: false, isAvailable: undefined };
        return updated;
      });
    }
  };
  
  // Calculate prices when domains change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePrices();
    }, 500); // Debounce price calculation
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains.map(d => `${d.name}-${d.duration}`).join(',')]);

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
      
      toast.success(`Successfully registered ${domains.length} domain${domains.length > 1 ? 's' : ''}! The transaction has been confirmed.`);
      
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

  const handleRegister = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
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

    try {
      setIsProcessing(true);
      toast.info("Preparing registration transaction...");
      
      // For FIFS registration, secret is just empty bytes32 (0x0000...0000)
      const emptySecret = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
      
      const requests = domains.map((d) => ({
        name: d.name,
        owner: address, // Use connected wallet address
        secret: emptySecret, // Empty bytes32 for FIFS
        duration: BigInt(parseInt(d.duration) * 365 * 24 * 60 * 60),
      }));

      await bulkRegister(requests);
      
      // Show info message - success will be shown in useEffect when confirmed
      toast.info(`Transaction submitted! Please confirm in your wallet to register ${domains.length} domain${domains.length > 1 ? 's' : ''}.`);
    } catch (error) {
      console.error("Registration failed:", error);
      toast.error(`Registration failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
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

        {/* Total Price Display */}
        {totalPrice > BigInt(0) && (
          <div className="mt-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Registration Cost</p>
                <p className="text-2xl font-bold text-purple-400">
                  {isCalculatingTotal ? "Calculating..." : formatRIF(totalPrice)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Paid in RIF tokens • Official RNS pricing
                </p>
              </div>
            </div>
          </div>
        )}

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
              domains.some(d => d.isAvailable === false) ||
              domains.every(d => !d.name.trim())
            }
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {isProcessing || isLoading 
              ? "Processing..." 
              : domains.some(d => d.isAvailable === false)
              ? "Some domains are unavailable"
              : domains.every(d => !d.name.trim())
              ? "Enter domain names"
              : `Register ${domains.filter(d => d.name.trim()).length} Domain${domains.filter(d => d.name.trim()).length > 1 ? "s" : ""}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}

