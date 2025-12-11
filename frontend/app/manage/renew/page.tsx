"use client";

import { useState } from "react";
import DomainTable from "../../components/DomainTable";
import BulkActions from "../../components/BulkActions";
import { useUserDomains } from "@/lib/hooks/useDomains";

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

export default function RenewPage() {
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>([]);
  const { domains, isLoading, error } = useUserDomains();

  return (
    <div className="px-8 py-12">
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Renew Your Domains</h1>
          <p className="text-gray-400 text-lg">
            Select domains to renew in bulk and save on gas fees
          </p>
        </div>

        <div className="space-y-8">
          {selectedCount > 0 && (
            <BulkActions selectedCount={selectedCount} selectedDomains={selectedDomains} />
          )}

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

          {!isLoading && domains.length === 0 && (
            <div className="bg-gray-900 rounded-lg p-12 border border-gray-700 text-center">
              <p className="text-gray-400 text-lg">
                No domains found. Select domains from &quot;My Domains&quot; tab to renew them here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

