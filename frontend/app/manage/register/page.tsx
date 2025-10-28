"use client";

import RegisterTab from "../components/RegisterTab";

export default function RegisterPage() {
  return (
    <div className="px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Register New Domains</h1>
        <p className="text-gray-400 text-lg">
          Register multiple RNS domains in a single transaction and save on gas fees
        </p>
      </div>

      <RegisterTab />
    </div>
  );
}

