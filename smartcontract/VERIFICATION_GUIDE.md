# Contract Verification Guide

## Contract Details

**Contract Address**: `0xbf1b2ca2cc17bd98679d584575d549c62b3214eb`  
**Network**: RSK Testnet (Chain ID: 31)  
**Explorer**: https://explorer.testnet.rootstock.io/address/0xbf1b2ca2cc17bd98679d584575d549c62b3214eb

## Verification Information

### Compiler Settings
- **Compiler Version**: `0.8.20`
- **Optimization**: Enabled
- **Runs**: 200
- **EVM Version**: shanghai

### Constructor Arguments
```
0x7d284aaac6e925aad802a53c0c69efe3764597b8,0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71,0x99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c,0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d,0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b,0x19f64674d8a5b4e652319f5e239efd3bc969a1fe
```

**Constructor Parameters** (in order):
1. `_rnsRegistry`: `0x7d284aaac6e925aad802a53c0c69efe3764597b8`
2. `_rskOwner`: `0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71`
3. `_addrResolver`: `0x99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c`
4. `_fifsRegistrar`: `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`
5. `_renewer`: `0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b`
6. `_rifToken`: `0x19f64674d8a5b4e652319f5e239efd3bc969a1fe`

### Build Info File Location
```
smartcontract/artifacts/build-info/solc-0_8_20-b7193972c93e3628712ba9d06ce3a956f1642d76.output.json
```

## Verification Methods

### Method 1: Via JSON File (Recommended)
1. Go to: https://explorer.testnet.rootstock.io/verify/0xbf1b2ca2cc17bd98679d584575d549c62b3214eb
2. Select "Via JSON file" option
3. Upload the build info file: `artifacts/build-info/solc-0_8_20-b7193972c93e3628712ba9d06ce3a956f1642d76.output.json`
4. Click "Verify Contract"

### Method 2: Manual Verification
1. Go to: https://explorer.testnet.rootstock.io/verify/0xbf1b2ca2cc17bd98679d584575d549c62b3214eb
2. Select "Solidity Source File"
3. Fill in the form:
   - **Contract Name**: `RNSBulkManager`
   - **Compiler Version**: `0.8.20`
   - **Optimization**: Enabled
   - **Runs**: 200
   - **Constructor Arguments**: `0x7d284aaac6e925aad802a53c0c69efe3764597b8,0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71,0x99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c,0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d,0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b,0x19f64674d8a5b4e652319f5e239efd3bc969a1fe`
4. Upload the contract source file: `contracts/RNSBulkManager.sol`
5. Upload all interface files:
   - `contracts/interfaces/IRNS.sol`
   - `contracts/interfaces/IRSKOwner.sol`
   - `contracts/interfaces/IAddrResolver.sol`
   - `contracts/interfaces/IFIFSRegistrar.sol`
   - `contracts/interfaces/IRenewer.sol`
   - `contracts/interfaces/IERC20.sol`
6. Click "Verify Contract"

## Contract Source Files

All source files are located in:
- Main contract: `smartcontract/contracts/RNSBulkManager.sol`
- Interfaces: `smartcontract/contracts/interfaces/*.sol`

## Verification Status

Once verified, the contract will show:
- ✅ Verified checkmark
- Source code visible on explorer
- Ability to interact with contract functions directly

