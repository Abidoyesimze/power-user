# Rootstock Testnet RPC Endpoints

## Recommended Endpoints (in order of preference)

### 1. Rootstock Portal API (Recommended - CORS Enabled)
```
https://rpc.testnet.rootstock.io/YOUR_API_KEY
```
- ✅ Official endpoint
- ✅ Supports CORS (works in browser)
- ✅ Supports eth_getLogs (required for domain events)
- ✅ Most reliable
- ⚠️ Requires API key from https://portal.rootstock.io/
- **Get free API key**: https://portal.rootstock.io/

### 2. PublicNode (CORS Issues)
```
https://rsk-testnet.publicnode.com
```
- ✅ Free
- ✅ No API key required
- ✅ Supports eth_getLogs
- ❌ **CORS blocked** - doesn't work in browser
- ⚠️ Only works server-side

### 3. dRPC (Limited Support)
```
https://rootstock-testnet.drpc.org
```
- ✅ Free
- ❌ Does NOT support eth_getLogs
- ❌ May have CORS issues
- ⚠️ Not recommended for this app

### 3. Rootstock Portal API (Requires API Key)
```
https://rpc.testnet.rootstock.io/YOUR_API_KEY
```
- ✅ Official endpoint
- ✅ Supports eth_getLogs
- ⚠️ Requires API key from https://portal.rootstock.io/

### 4. Official Public Node (Fallback)
```
https://public-node.testnet.rsk.co
```
- ✅ Official endpoint
- ✅ No API key required
- ❌ May not support eth_getLogs

## How to Use

### Option 1: Set in .env.local (Recommended)
Create or update `frontend/.env.local`:
```bash
NEXT_PUBLIC_RPC_URL=https://rootstock-testnet.drpc.org
```

### Option 2: Use Default Fallback
The app will automatically try endpoints in this order:
1. `NEXT_PUBLIC_RPC_URL` from .env.local
2. dRPC endpoint
3. PublicNode endpoint
4. Official public node

## Get Your Own API Key (Optional)

1. Visit https://portal.rootstock.io/
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_RPC_URL=https://rpc.testnet.rootstock.io/YOUR_API_KEY
   ```

## Testing RPC Endpoints

You can test which endpoint works best for you by temporarily setting `NEXT_PUBLIC_RPC_URL` in `.env.local` and restarting the dev server.

