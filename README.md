# RNS Bulk Manager

A powerful dApp for managing Rootstock Name Service (RNS) domains with bulk operations. This tool enables users to register, renew, and update records for multiple RNS domains in a single transaction, providing the "Namecheap" or "GoDaddy" bulk management experience that the RNS ecosystem currently lacks.

## 🚀 Features

- **Bulk Registration**: Register multiple RNS domains in a single transaction
- **Bulk Renewal**: Renew multiple domains simultaneously (by name or tokenId)
- **Bulk Address Updates**: Update addresses for multiple domains at once
- **Bulk Resolver Updates**: Set resolvers across multiple domains
- **Multi-chain Address Support**: Manage addresses for different chains (Bitcoin, Ethereum, etc.)
- **Ownership Verification**: Batch check domain ownership before operations
- **Generic Multicall**: Combine multiple operations in one transaction
- **Partial Failure Handling**: Failed operations don't revert successful ones

## 📋 Repository

**GitHub**: https://github.com/Abidoyesimze/power-user

## 🏗️ Project Structure

```
BulkManager/
├── smartcontract/
│   ├── contracts/
│   │   ├── RNSBulkManager.sol       # Main bulk manager contract
│   │   ├── interfaces/              # RNS interface definitions
│   │   └── mocks/                   # Mock contracts for testing
│   ├── test/
│   │   └── RNSBulkManager.test.ts  # Comprehensive test suite
│   ├── scripts/
│   │   └── deploy-rns-bulk-manager.ts
│   ├── hardhat.config.ts            # RSK network configuration
│   └── package.json
└── README.md
```

## 🧪 Test Results

```
8/8 tests passing

✅ Setup Tests
✅ Token Distribution  
✅ Cost Calculations
✅ Ownership Verification
✅ Edge Cases
```

## 🔧 Setup & Installation

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Hardhat

### Install Dependencies

```bash
cd smartcontract
npm install
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

## 📝 RNS Contract Addresses

### RSK Testnet
- **RNS Registry**: `0x7d284aaac6e925aad802a53c0c69efe3764597b8`
- **RSK Owner**: `0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71`
- **FIFS Registrar**: `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`
- **RIF Token**: `0x19f64674d8a5b4e652319f5e239efd3bc969a1fe`
- **Renewer**: `0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b`

### RSK Mainnet
- **RNS Registry**: `0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5`
- **RSK Owner**: `0x45d3e4fb311982a06ba52359d44cb4f5980e0ef1`
- **FIFS Registrar**: `0xd9c79ced86ecf49f5e4a973594634c83197c35ab`
- **RIF Token**: `0x2acc95758f8b5f583470ba265eb685a8f45fc9d5`

## 🚢 Deployment

### Deploy to RSK Testnet

1. Set up your `.env` file with your private key
2. Get testnet RBTC from the faucet: https://faucet.rsk.co/
3. Deploy:

```bash
npm run deploy:testnet
```

### Deploy to RSK Mainnet

```bash
npm run deploy:mainnet
```

## 📖 Usage Example

```typescript
import { getContract } from "viem";
import { publicClient } from "./client";

const bulkManager = getContract({
  address: "0x...", // Your deployment address
  abi: RNSBulkManagerABI,
  publicClient,
});

// Bulk register domains
await bulkManager.write.bulkRegister([{
  name: "domain1.rsk",
  owner: "0x...",
  secret: "0x...",
  duration: 365 * 24 * 60 * 60
}]);

// Bulk renew domains
await bulkManager.write.bulkRenew([{
  name: "domain1.rsk",
  duration: 365 * 24 * 60 * 60
}]);

// Update addresses
await bulkManager.write.bulkSetAddress([{
  node: "0x...",
  targetAddress: "0x..."
}]);
```

## 🛠️ Development

### Project Status

✅ Smart contract completed
✅ Comprehensive test suite (8/8 passing)
✅ Mock contracts for testing
✅ Rootstock network configuration
⏳ Frontend (Next step)
⏳ Testnet deployment
⏳ Production deployment

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

- **GitHub**: https://github.com/Abidoyesimze/power-user
- **Project**: RNS Bulk Manager for Rootstock

