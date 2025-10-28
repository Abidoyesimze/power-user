"use client";

interface BulkActionsProps {
  selectedCount: number;
}

export default function BulkActions({ selectedCount }: BulkActionsProps) {
  const handleBulkRenew = () => {
    console.log("Bulk renew", selectedCount, "domains");
  };

  const handleBulkSetAddress = () => {
    console.log("Bulk set address for", selectedCount, "domains");
  };

  const handleBulkSetResolver = () => {
    console.log("Bulk set resolver for", selectedCount, "domains");
  };

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
          <button
            onClick={handleBulkRenew}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors"
          >
            Renew
          </button>
          <button
            onClick={handleBulkSetAddress}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors"
          >
            Set Address
          </button>
          <button
            onClick={handleBulkSetResolver}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors"
          >
            Set Resolver
          </button>
        </div>
      </div>
    </div>
  );
}

