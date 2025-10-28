"use client";

import WalletConnect from "./components/WalletConnect";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-gray-950/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">RNS</span>
              </div>
              <span className="text-xl font-bold text-white">RNS Bulk Manager</span>
            </div>
            <WalletConnect />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFmMjkzNyIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              Manage Your RNS Domains<br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">In Bulk</span>
          </h1>
            <p className="text-2xl text-gray-400 mb-12 leading-relaxed">
              Register, renew, and update multiple Rootstock Name Service domains in a single transaction.<br />
              <span className="text-gray-500">Save up to 80% on gas fees while managing hundreds of domains.</span>
            </p>
            <div className="flex items-center justify-center gap-4">
              <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40">
                Get Started
              </button>
              <button className="px-8 py-4 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-700 transition-all duration-200 border border-gray-700">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-y border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">80%</div>
              <div className="text-gray-400">Gas Savings</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">100+</div>
              <div className="text-gray-400">Domains Per TX</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">0</div>
              <div className="text-gray-400">Custodial Risk</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">24/7</div>
              <div className="text-gray-400">Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-black py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl font-bold text-white text-center mb-4">Why Use RNS Bulk Manager?</h2>
          <p className="text-center text-gray-400 mb-20 text-xl">Everything you need to manage your RNS domains efficiently</p>
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="p-8 rounded-2xl bg-gray-900 border border-gray-800 hover:border-purple-500/50 transition-all duration-300">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mb-6">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Save Gas</h3>
              <p className="text-gray-400 leading-relaxed">
                Batch multiple operations into a single transaction. Reduce gas costs by up to 80% when managing many domains. The more domains you manage, the more you save.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-gray-900 border border-gray-800 hover:border-purple-500/50 transition-all duration-300">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mb-6">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Batch Operations</h3>
              <p className="text-gray-400 leading-relaxed">
                Register, renew, or update dozens of domains simultaneously. Manage hundreds without manual transactions. Power through your domain operations.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-gray-900 border border-gray-800 hover:border-purple-500/50 transition-all duration-300">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6">
                <span className="text-3xl">🛡️</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Always Safe</h3>
              <p className="text-gray-400 leading-relaxed">
                Open source smart contract. Each operation is verified before execution. No custodial risk. Your keys, your domains.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-b from-black to-gray-950 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-xl text-gray-400">Get started in minutes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white">1</div>
              <h3 className="text-xl font-bold text-white mb-3">Connect Wallet</h3>
              <p className="text-gray-400">Connect your Rootstock wallet to get started</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white">2</div>
              <h3 className="text-xl font-bold text-white mb-3">Select Domains</h3>
              <p className="text-gray-400">Choose which domains you want to manage</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white">3</div>
              <h3 className="text-xl font-bold text-white mb-3">Choose Action</h3>
              <p className="text-gray-400">Select register, renew, or update operation</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white">4</div>
              <h3 className="text-xl font-bold text-white mb-3">Execute</h3>
              <p className="text-gray-400">Confirm transaction and save gas fees</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-y border-purple-500/30 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl font-bold text-white mb-6">Ready to Manage Your Domains?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join the power users managing their RNS domains efficiently
          </p>
          <WalletConnect />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400">
              Built for Rootstock Name Service • Open source • Self-hosted
            </p>
            <div className="mt-6 flex items-center justify-center gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition">Documentation</a>
              <a href="#" className="text-gray-400 hover:text-white transition">GitHub</a>
              <a href="#" className="text-gray-400 hover:text-white transition">Audit</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
