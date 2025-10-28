"use client";

import DomainTable from "../components/DomainTable";
import BulkActions from "../components/BulkActions";
import NameSearch from "./components/NameSearch";
import { useUserDomains } from "@/lib/hooks/useDomains";
import { useState } from "react";

interface Domain {
  id: string;
  name: string;
  owner: string;
  expiry: Date | null;
  resolver: string;
  address: string;
  isExpired?: boolean;
  daysUntilExpiry?: number;
}

export default function ManagePage() {
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>([]);
  const { domains, isLoading, error, refetch } = useUserDomains();

  return (
    <div className="px-8 py-12">
        <div className="max-w-5xl">
            {/* Search Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-4xl font-bold text-white">Your Rootstock name</h1>
                <button
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh domains"
                >
                  <span className={isLoading ? "animate-spin" : ""}>🔄</span>
                  {isLoading ? "Loading..." : "Refresh"}
                </button>
              </div>
              <p className="text-gray-400 text-xl mb-6">
                Your identity across web3, one name for all your crypto addresses, and your decentralized website.
              </p>
            </div>

            <div className="space-y-8">
              {/* Search Component */}
              <NameSearch />

              {/* BulkActions when domains are selected */}
              {selectedCount > 0 && (
                <BulkActions selectedCount={selectedCount} selectedDomains={selectedDomains} />
              )}

              {/* Domain Table */}
              <DomainTable 
                domains={domains}
                onSelectionChange={setSelectedCount} 
                onSelectedDomainsChange={setSelectedDomains}
              />
              
              {isLoading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                  <p className="text-gray-400 mt-4">Loading your domains...</p>
                </div>
              )}
              
              {error && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400">
                  <p>{error}</p>
                </div>
              )}
          </div>
        </div>
    </div>
  );
}

