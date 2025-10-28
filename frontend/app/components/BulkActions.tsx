"use client";

import { useState, useEffect } from "react";
import { useRNSBulkManager } from "@/lib/hooks/useContract";
import { useUserDomains } from "@/lib/hooks/useDomains";
import { toast } from "react-toastify";

interface BulkActionsProps {
  selectedCount: number;
  selectedDomains?: Array<{ name: string; node?: string }>;
}

export default function BulkActions({ selectedCount, selectedDomains = [] }: BulkActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { bulkRenew, bulkSetAddress, bulkSetResolver, isConnected, isLoading, nameToNode, hash, isConfirmed, reset } = useRNSBulkManager();
  const { refetch: refetchDomains } = useUserDomains();
  const [renewalDuration, setRenewalDuration] = useState("1");

  // Auto-refresh after successful transactions
  useEffect(() => {
    if (isConfirmed && hash) {
      refetchDomains();
      toast.success("Domains updated successfully!");
      reset();
    }
  }, [isConfirmed, hash, refetchDomains, reset]);

  const handleBulkRenew = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsProcessing(true);
      const durationInSeconds = BigInt(parseInt(renewalDuration) * 365 * 24 * 60 * 60);
      const durations = Array(selectedDomains.length).fill(durationInSeconds);
      const names = selectedDomains.map(d => d.name);
      
      await bulkRenew(names, durations);
      toast.info(`Renewal transaction submitted! Please approve in your wallet.`);
    } catch (error) {
      console.error("Bulk renew failed:", error);
      toast.error(`Renewal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkSetAddress = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    const address = prompt("Enter the address to set for all selected domains:");
    if (!address) {
      toast.info("Address update cancelled");
      return;
    }

    try {
      setIsProcessing(true);
      const nodes = selectedDomains.map(d => d.node || nameToNode(d.name)) as `0x${string}`[];
      const addresses = Array(selectedDomains.length).fill(address) as `0x${string}`[];
      
      await bulkSetAddress(nodes, addresses);
      toast.info("Address update transaction submitted! Please approve in your wallet.");
    } catch (error) {
      console.error("Bulk set address failed:", error);
      toast.error(`Set address failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkSetResolver = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    const resolverAddress = prompt("Enter the resolver address:");
    if (!resolverAddress) {
      toast.info("Resolver update cancelled");
      return;
    }

    try {
      setIsProcessing(true);
      const nodes = selectedDomains.map(d => d.node || nameToNode(d.name)) as `0x${string}`[];
      
      await bulkSetResolver(nodes, resolverAddress as `0x${string}`);
      toast.info("Resolver update transaction submitted! Please approve in your wallet.");
    } catch (error) {
      console.error("Bulk set resolver failed:", error);
      toast.error(`Set resolver failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Transfer functionality not yet available in deployed contract
  // Will be added in future update

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1 text-sm font-medium text-white">
            {selectedCount} selected
          </span>
          <p className="text-sm text-gray-400">
            Actions will be executed in a single transaction
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <select
              value={renewalDuration}
              onChange={(e) => setRenewalDuration(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="1">1 Year</option>
              <option value="2">2 Years</option>
              <option value="3">3 Years</option>
              <option value="5">5 Years</option>
            </select>
          <button
            onClick={handleBulkRenew}
              disabled={isProcessing || isLoading || !isConnected}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
              {isProcessing ? "Processing..." : "Renew"}
          </button>
          </div>
          <button
            onClick={handleBulkSetAddress}
            disabled={isProcessing || isLoading || !isConnected}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Set Address
          </button>
          <button
            onClick={handleBulkSetResolver}
            disabled={isProcessing || isLoading || !isConnected}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Set Resolver
          </button>
        </div>
      </div>
    </div>
  );
}

