"use client";

import Sidebar from "./components/Sidebar";
import WalletConnect from "../components/WalletConnect";
import Link from "next/link";

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

      {/* Content with Sidebar */}
      <div className="flex">
        <Sidebar />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

