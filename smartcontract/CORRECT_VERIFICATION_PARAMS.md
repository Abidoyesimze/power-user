# Correct Verification Parameters for RNSBulkManager

## Contract Address
`0xbf1b2ca2cc17bd98679d584575d549c62b3214eb`

## Constructor Arguments (Comma-Separated Format)

**Use this EXACT format in the "Args separated by commas" field:**

```
0x7d284aaac6e925aad802a53c0c69efe3764597b8,0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71,0x99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c,0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d,0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b,0x19f64674d8a5b4e652319f5e239efd3bc969a1fe
```

**Important Notes:**
- NO spaces after commas
- All addresses must have `0x` prefix
- All addresses must be lowercase (or the exact case used in deployment)
- All 6 addresses must be present, in the exact order shown

## Compiler Settings

- **Compiler Version**: `0.8.20` (or `v0.8.20`)
- **Optimization**: Enabled
- **Optimization Runs**: `200`
- **EVM Version**: `shanghai` (NOT `prague` - Solidity 0.8.20 uses Shanghai EVM)

## Contract Name

- **Contract Name**: `RNSBulkManager`
- **Contract Path**: `contracts/RNSBulkManager.sol`

## Alternative: Use JSON File Upload (Recommended)

Instead of manual entry, you can upload the build info JSON file:

1. Click on the file upload area (where it says "Drop file or click here")
2. Upload: `artifacts/build-info/solc-0_8_20-b7193972c93e3628712ba9d06ce3a956f1642d76.output.json`
3. This method is more reliable as it includes all compiler settings automatically

## Common Mistakes to Avoid

1. ❌ Adding spaces: `0x123..., 0x456...` (WRONG)
2. ✅ No spaces: `0x123...,0x456...` (CORRECT)
3. ❌ Wrong EVM version: `prague` (WRONG for Solidity 0.8.20)
4. ✅ Correct EVM version: `shanghai` (CORRECT)
5. ❌ Missing `0x` prefix on addresses
6. ❌ Wrong order of constructor arguments
7. ❌ Using uppercase addresses when lowercase was used (or vice versa)

## Step-by-Step Verification

1. Go to: https://explorer.testnet.rootstock.io/verify/0xbf1b2ca2cc17bd98679d584575d549c62b3214eb
2. Select "Solidity Source File" (if not already selected)
3. Enter Contract name: `RNSBulkManager`
4. Upload the contract source file OR paste the source code
5. Set Optimization: `Yes`
6. Set Optimization Runs: `200`
7. Set EVM Version: `shanghai` (change from `prague` if needed)
8. Enter Constructor Arguments (use the format above - NO SPACES):
   ```
   0x7d284aaac6e925aad802a53c0c69efe3764597b8,0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71,0x99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c,0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d,0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b,0x19f64674d8a5b4e652319f5e239efd3bc969a1fe
   ```
9. Click "Verify Contract"

