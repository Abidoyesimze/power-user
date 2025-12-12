# Contract Verification Information

## Quick Verification Details

**Contract Address**: `0xbf1b2ca2cc17bd98679d584575d549c62b3214eb`  
**Verification URL**: https://explorer.testnet.rootstock.io/verify/0xbf1b2ca2cc17bd98679d584575d549c62b3214eb

## Form Fields to Fill

### 1. Contract Name
```
RNSBulkManager
```

### 2. Compiler Version
```
0.8.20
```

### 3. Optimization
- **Enabled**: Yes
- **Runs**: 200

### 4. Constructor Arguments (comma-separated)
```
0x7d284aaac6e925aad802a53c0c69efe3764597b8,0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71,0x99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c,0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d,0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b,0x19f64674d8a5b4e652319f5e239efd3bc969a1fe
```

### 5. Source Files to Upload

You need to upload all contract source files. The main contract imports these interfaces:

1. **Main Contract**: `contracts/RNSBulkManager.sol`
2. **Interfaces** (all required):
   - `contracts/interfaces/IRNS.sol`
   - `contracts/interfaces/IRSKOwner.sol`
   - `contracts/interfaces/IAddrResolver.sol`
   - `contracts/interfaces/IFIFSRegistrar.sol`
   - `contracts/interfaces/IRenewer.sol`
   - `contracts/interfaces/IERC20.sol`

## Alternative: Use JSON File Method

If the explorer supports "Via JSON file" option:

1. Upload the build info file:
   ```
   artifacts/build-info/solc-0_8_20-b7193972c93e3628712ba9d06ce3a956f1642d76.output.json
   ```

2. This file contains all the necessary information for verification.

## Verification Steps

1. Navigate to: https://explorer.testnet.rootstock.io/verify/0xbf1b2ca2cc17bd98679d584575d549c62b3214eb
2. Fill in the form with the information above
3. Upload all source files
4. Click "Verify Contract"
5. Wait for verification to complete (may take a few minutes)

## After Verification

Once verified, you'll be able to:
- View the contract source code on the explorer
- Interact with contract functions directly
- See all events and transactions
- Verify the contract matches the deployed bytecode

