"use client";

import { useState } from "react";

interface ManageTabsProps {
  children: (activeTab: string) => React.ReactNode;
}

export default function ManageTabs({ children }: ManageTabsProps) {
  const [activeTab, setActiveTab] = useState("domains");

  const tabs = [
    { id: "domains", label: "My Domains", icon: "📋" },
    { id: "register", label: "Register", icon: "✨" },
    { id: "renew", label: "Renew", icon: "🔄" },
    { id: "update", label: "Update Settings", icon: "⚙️" },
  ];

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-700 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{tab.icon}</span>
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">{children(activeTab)}</div>
    </div>
  );
}

