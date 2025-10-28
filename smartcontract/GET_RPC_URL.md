# Get Rootstock Testnet RPC URL

## Option 1: Portal API Key (Recommended)

1. Go to https://portal.rootstock.io/
2. Sign up and get your API key
3. Your RPC URL will be: `https://rpc.testnet.rootstock.io/YOUR_API_KEY`
4. Add to `.env`:
   ```bash
   ROOTSTOCK_TESTNET_RPC_URL=https://rpc.testnet.rootstock.io/YOUR_API_KEY
   ```

## Option 2: Use Public Node

Add to `.env`:
```bash
ROOTSTOCK_TESTNET_RPC_URL=https://public-node.testnet.rsk.co
```

## Option 3: QuickNode/Infura (if you have one)

If you have QuickNode or Infura endpoints:
```bash
ROOTSTOCK_TESTNET_RPC_URL=https://your-custom-endpoint.com
```

## Current Issue

The 403 error means either:
1. The API key is invalid
2. The URL format is incorrect
3. The API key hasn't been activated

## Try Different Endpoints

You can also try these free public endpoints:
- `https://rsk-testnet.publicnode.com`
- `https://public-node.testnet.rsk.co`

Add whichever works to your `.env` file as `ROOTSTOCK_TESTNET_RPC_URL`.

