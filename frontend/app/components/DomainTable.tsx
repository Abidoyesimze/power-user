"use client";

import { useState, useEffect } from "react";

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

interface DomainTableProps {
  domains?: Domain[];
  onSelectionChange?: (selectedCount: number) => void;
  onSelectedDomainsChange?: (selectedDomains: Domain[]) => void;
}

export default function DomainTable({ 
  domains: externalDomains = [],
  onSelectionChange,
  onSelectedDomainsChange 
}: DomainTableProps) {
  const [domains, setDomains] = useState<Domain[]>(externalDomains);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<keyof Domain>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setDomains(externalDomains);
  }, [externalDomains]);

  useEffect(() => {
    onSelectionChange?.(selectedIds.size);
    const selectedDomains = domains.filter(d => selectedIds.has(d.id));
    onSelectedDomainsChange?.(selectedDomains);
  }, [selectedIds, domains, onSelectionChange, onSelectedDomainsChange]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected.size);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === domains.length) {
      setSelectedIds(new Set());
      onSelectionChange?.(0);
    } else {
      const allSelected = new Set(domains.map((d) => d.id));
      setSelectedIds(allSelected);
      onSelectionChange?.(allSelected.size);
    }
  };

  const handleSort = (column: keyof Domain) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const sortedDomains = [...domains].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    // Handle null/undefined values
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortOrder === "asc" ? 1 : -1;
    if (bVal == null) return sortOrder === "asc" ? -1 : 1;
    
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const formatExpiry = (domain: Domain): string => {
    if (!domain.expiry) return "N/A";
    
    if (domain.isExpired) {
      return `Expired`;
    }
    
    if (domain.daysUntilExpiry !== undefined) {
      if (domain.daysUntilExpiry < 0) return `Expired`;
      if (domain.daysUntilExpiry < 30) return `${domain.daysUntilExpiry} days`;
      return domain.expiry.toLocaleDateString();
    }
    
    return domain.expiry.toLocaleDateString();
  };

  const getExpiryBadge = (domain: Domain) => {
    if (!domain.expiry) return null;
    
    if (domain.isExpired) {
      return <span className="px-2 py-1 text-xs font-semibold bg-red-900/30 text-red-400 border border-red-500/50 rounded">Expired</span>;
    }
    
    if (domain.daysUntilExpiry !== undefined) {
      if (domain.daysUntilExpiry < 30) {
        return <span className="px-2 py-1 text-xs font-semibold bg-yellow-900/30 text-yellow-400 border border-yellow-500/50 rounded">{domain.daysUntilExpiry} days</span>;
      }
      if (domain.daysUntilExpiry < 90) {
        return <span className="px-2 py-1 text-xs font-semibold bg-blue-900/30 text-blue-400 border border-blue-500/50 rounded">{domain.daysUntilExpiry} days</span>;
      }
    }
    
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Your Domains ({domains.length})
          </h2>
          {selectedIds.size > 0 && (
            <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-700">
          <thead className="bg-gray-750">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedIds.size === domains.length && domains.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-750"
                onClick={() => handleSort("name")}
              >
                Domain Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Expiry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Resolver
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Address
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {sortedDomains.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-6xl mb-4">📭</span>
                    <p className="text-gray-400 text-lg mb-2">No domains found</p>
                    <p className="text-gray-500 text-sm">
                      Your registered domains will appear here
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedDomains.map((domain) => (
                <tr
                  key={domain.id}
                  className={`hover:bg-gray-750 ${
                    selectedIds.has(domain.id) ? "bg-blue-900/20" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(domain.id)}
                      onChange={() => toggleSelect(domain.id)}
                      className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {domain.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                    {domain.owner}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <span className={domain.isExpired ? "text-red-400" : domain.daysUntilExpiry !== undefined && domain.daysUntilExpiry < 30 ? "text-yellow-400" : "text-gray-400"}>
                        {formatExpiry(domain)}
                      </span>
                      {getExpiryBadge(domain)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                    {domain.resolver}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                    {domain.address}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

