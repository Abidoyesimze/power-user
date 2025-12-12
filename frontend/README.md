# RNS Bulk Manager - Frontend

A powerful React frontend for managing Rootstock Name Service (RNS) domains with bulk operations.

## Features

- Connect wallet (MetaMask, WalletConnect)
- View all your RNS domains in a table
- Select multiple domains for bulk operations
- Bulk registration
- Bulk renewal
- Bulk address updates
- Real-time gas estimates
- Transaction status tracking

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Wagmi** - React Hooks for Ethereum
- **Viem** - TypeScript interface for Ethereum
- **React Query** - Data fetching and caching

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Environment Variables

Create a `.env.local` file:

```bash
# RNS Bulk Manager Contract Address (will be set after deployment)
NEXT_PUBLIC_CONTRACT_ADDRESS=

# Rootstock Testnet RPC URL
# IMPORTANT: Must support eth_getLogs method
# The public-node.testnet.rsk.co does NOT support eth_getLogs
# Use the RPC URL below which supports eth_getLogs:
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.rootstock.io/eB6SwV0sOgFuotmD35JzhuCqpnYf8W-T

# Chain ID
NEXT_PUBLIC_CHAIN_ID=31
```

## Project Structure

```
frontend/
├── app/
│   ├── components/     # React components
│   ├── lib/           # Utilities, hooks
│   └── providers/     # Wagmi providers
└── public/            # Static assets
```

## Getting Started

1. Install dependencies
2. Configure environment variables
3. Connect wallet
4. Start managing your RNS domains!
