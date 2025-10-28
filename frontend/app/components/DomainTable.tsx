"use client";

import { useState } from "react";

interface Domain {
  id: string;
  name: string;
  owner: string;
  expiry: string;
  resolver: string;
  address: string;
}

const mockDomains: Domain[] = [
  {
    id: "1",
    name: "alice.rsk",
    owner: "0x1234...5678",
    expiry: "2025-12-31",
    resolver: "0xabcd...efgh",
    address: "0x9876...5432",
  },
  {
    id: "2",
    name: "bob.rsk",
    owner: "0x1234...5678",
    expiry: "2025-11-15",
    resolver: "0xabcd...efgh",
    address: "0x9876...5432",
  },
];

export default function DomainTable() {
  const [domains, setDomains] = useState(mockDomains);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<keyof Domain>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === domains.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(domains.map((d) => d.id)));
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
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

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
            {sortedDomains.map((domain) => (
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {domain.expiry}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                  {domain.resolver}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                  {domain.address}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

