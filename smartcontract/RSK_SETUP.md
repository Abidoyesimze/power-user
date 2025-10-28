# Rootstock Testnet Setup Guide

## Get Your API Key

1. Visit the Rootstock RPC Portal: https://portal.rootstock.io/
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add it to your `.env` file

## Update .env File

Add these lines to your `.env` file in the `smartcontract/` directory:

```bash
# Your private key (already set)
PRIVATE_KEY=your_private_key_here

# Rootstock Testnet API Key (get from https://portal.rootstock.io/)
ROOTSTOCK_TESTNET_API_KEY=your_api_key_here

# RNS Contract Addresses (already set as defaults)
RNS_REGISTRY_TESTNET=0x7d284aaac6e925aad802a53c0c69efe3764597b8
RSK_OWNER_TESTNET=0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71
FIFS_ADDR_REGISTRAR_TESTNET=0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d
RENEWER_TESTNET=0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b
RIF_TOKEN_TESTNET=0x19f64674d8a5b4e652319f5e239efd3bc969a1fe
```

## Get Testnet RBTC

Visit the Rootstock faucet: https://faucet.rootstock.io/

## Deploy to Testnet

Once you have your API key in the `.env` file:

```bash
npm run deploy:testnet
```

## Links

- Portal: https://portal.rootstock.io/
- Faucet: https://faucet.rootstock.io/
- Explorer: https://explorer.testnet.rootstock.io/
- Documentation: https://developers.rootstock.io/

