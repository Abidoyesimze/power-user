"use client";

import WalletConnect from "../components/WalletConnect";
import DomainTable from "../components/DomainTable";
import BulkActions from "../components/BulkActions";
import { useState } from "react";
import Link from "next/link";

export default function ManagePage() {
  const [selectedCount, setSelectedCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-gray-950/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">RNS</span>
              </div>
              <span className="text-xl font-bold text-white">RNS Bulk Manager</span>
            </Link>
            <WalletConnect />
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Manage Your Domains</h1>
          <p className="text-gray-400 text-lg">
            Select multiple domains to perform bulk operations and save on gas fees
          </p>
        </div>

        <BulkActions selectedCount={selectedCount} />
        <DomainTable onSelectionChange={setSelectedCount} />
      </div>
    </div>
  );
}

