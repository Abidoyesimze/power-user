# Deployment Fix - Issues Found and Resolutions

## ⚠️ Critical Issues Found in Deployment Guide

### Issue 1: Deployment Script Mismatch
**Problem**: The deployment script only passes 6 parameters, but `RNSBulkManager_Fixed` constructor requires 7 parameters.

**Status**: ✅ FIXED - Updated deployment script to include both FIFS registrars

### Issue 2: Address Resolver Address Discrepancy
**Guide says**: `0x1e7ae43e3503efb886104ace36051ea72b301cdf`  
**Old script used**: `0x99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c`  
**Resolution**: Updated script to use `0x1e7ae43e3503efb886104ace36051ea72b301cdf` as per guide

**⚠️ ACTION REQUIRED**: Verify which resolver address is correct on testnet before deployment!

### Issue 3: FIFS Registrar Addresses
**Guide states**:
- Testnet Basic FIFS (for commits): `0x36ffda909f941950a552011f2c50569fda14a169`
- Testnet FIFS Addr (for registration): `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`

**Old script**: Only had one FIFS registrar address  
**Resolution**: ✅ FIXED - Updated script to use both addresses

**⚠️ ACTION REQUIRED**: Verify both addresses are correct on testnet before deployment!

## ✅ Changes Made to Deployment Script

1. Added separate environment variables for both FIFS registrars:
   - `FIFS_REGISTRAR_TESTNET` (for commits)
   - `FIFS_ADDR_REGISTRAR_TESTNET` (for registration)

2. Updated constructor call to pass 7 parameters (including `_fifsAddrRegistrar`)

3. Updated ADDR_RESOLVER address to match guide

## 📋 Pre-Deployment Checklist

### Step 1: Verify Contract Addresses
Before deploying, verify these addresses are correct on RSK Testnet:

- [ ] RNS Registry: `0x7d284aaac6e925aad802a53c0c69efe3764597b8`
- [ ] RSK Owner: `0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71`
- [ ] **Addr Resolver**: `0x1e7ae43e3503efb886104ace36051ea72b301cdf` ⚠️ VERIFY
- [ ] **FIFS Registrar (commits)**: `0x36ffda909f941950a552011f2c50569fda14a169` ⚠️ VERIFY
- [ ] **FIFS Addr Registrar**: `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d` ⚠️ VERIFY
- [ ] Renewer: `0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b`
- [ ] RIF Token: `0x19f64674d8a5b4e652319f5e239efd3bc969a1fe`

### Step 2: Contract Name Conflict
**Issue**: Both `RNSBulkManager_Complete.sol` and `RNSBulkManager_Fixed.sol` define a contract named `RNSBulkManager`.

**Options**:
1. **Temporarily rename** `RNSBulkManager_Complete.sol` contract name (not recommended)
2. **Deploy directly** - Hardhat will use the first matching contract found
3. **Specify file** - Update deploy script to specify the Fixed file

**Recommended**: Ensure `RNSBulkManager_Fixed.sol` is the one Hardhat compiles first, or temporarily move Complete to a backup location.

### Step 3: Update Hardhat Config (if needed)
The hardhat config doesn't specify which contract to compile. By default, it compiles all contracts. To ensure the Fixed version is used:

**Option A**: Rename the contract in Fixed file (not recommended - breaks compatibility)

**Option B**: Ensure Fixed file is alphabetically first or use explicit import in deploy script

**Option C**: Move Complete to a `deprecated/` folder temporarily

## 🚀 Updated Deployment Steps

### 1. Set Environment Variables (Optional - defaults provided)
```bash
# In smartcontract/.env
FIFS_REGISTRAR_TESTNET=0x36ffda909f941950a552011f2c50569fda14a169
FIFS_ADDR_REGISTRAR_TESTNET=0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d
ADDR_RESOLVER_TESTNET=0x1e7ae43e3503efb886104ace36051ea72b301cdf
```

### 2. Compile Contract
```bash
cd smartcontract
npx hardhat compile
```

### 3. Deploy
```bash
npx hardhat run scripts/deploy-rns-bulk-manager.ts --network rskTestnet
```

### 4. Verify Deployment
The script will output the deployed contract address. Save this for frontend update.

### 5. Verify on Block Explorer
```bash
# Verify constructor parameters
npx hardhat verify --network rskTestnet DEPLOYED_ADDRESS \
  "0x7d284aaac6e925aad802a53c0c69efe3764597b8" \
  "0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71" \
  "0x1e7ae43e3503efb886104ace36051ea72b301cdf" \
  "0x36ffda909f941950a552011f2c50569fda14a169" \
  "0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d" \
  "0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b" \
  "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe"
```

## 🔍 Address Verification Method

To verify addresses, check the block explorer:
1. Testnet Explorer: https://explorer.testnet.rootstock.io/
2. Enter each address
3. Verify contract code exists
4. Check contract interactions/functions match expected interfaces

## 📝 Notes

1. **Mainnet addresses** in the guide are not verified - only use on mainnet after thorough testing on testnet
2. The guide's resolver address (`0x1e7ae43e...`) should be verified against RNS documentation
3. Both FIFS registrar addresses should be confirmed as separate contracts

## ⚠️ Before Proceeding

**MUST VERIFY**:
- [ ] ADDR_RESOLVER address is correct
- [ ] Basic FIFS Registrar address is correct  
- [ ] FIFS Addr Registrar address is correct
- [ ] Contract compiles without errors
- [ ] Contract name conflict is resolved
