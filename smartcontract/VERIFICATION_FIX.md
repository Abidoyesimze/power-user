# Contract Verification - Fix for "Incorrect params" Error

## Issue
Getting "Incorrect params" error when trying to verify the contract.

## Possible Solutions

### Solution 1: Try ABI-Encoded Constructor Arguments

Instead of comma-separated addresses, try the ABI-encoded hex string:

```
0x0000000000000000000000007d284aaac6e925aad802a53c0c69efe3764597b8000000000000000000000000ca0a477e19bac7e0e172ccfd2e3c28a7200bdb7100000000000000000000000099a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c00000000000000000000000090734bd6bf96250a7b262e2bc34284b0d47c1e8d000000000000000000000000e48ad1d5fbf61394b5a7d81ab2f36736a046657b00000000000000000000000019f64674d8a5b4e652319f5e239efd3bc969a1fe
```

### Solution 2: Try Without 0x Prefix (if explorer doesn't accept it)

Remove the `0x` prefix from each address:
```
7d284aaac6e925aad802a53c0c69efe3764597b8,ca0a477e19bac7e0e172ccfd2e3c28a7200bdb71,99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c,90734bd6bf96250a7b262e2bc34284b0d47c1e8d,e48ad1d5fbf61394b5a7d81ab2f36736a046657b,19f64674d8a5b4e652319f5e239efd3bc969a1fe
```

### Solution 3: Use JSON File Method (Recommended)

The most reliable method is to use the build info JSON file:

1. Go to: https://explorer.testnet.rootstock.io/verify/0xbf1b2ca2cc17bd98679d584575d549c62b3214eb
2. Look for "Via JSON file" or "Upload JSON" option
3. Upload: `artifacts/build-info/solc-0_8_20-b7193972c93e3628712ba9d06ce3a956f1642d76.output.json`

This file contains all the necessary information and is the most reliable method.

### Solution 4: Check Compiler Settings Match Exactly

Make sure these match EXACTLY:
- **Compiler Version**: `0.8.20` (not `v0.8.20` or `0.8.20+commit...`)
- **Optimization**: Enabled
- **Runs**: `200` (not `200n` or any other format)
- **EVM Version**: `shanghai` (if asked)

### Solution 5: Try Different Constructor Argument Formats

Try these variations:

**Format 1** (with brackets):
```
[0x7d284aaac6e925aad802a53c0c69efe3764597b8,0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71,0x99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c,0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d,0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b,0x19f64674d8a5b4e652319f5e239efd3bc969a1fe]
```

**Format 2** (with spaces):
```
0x7d284aaac6e925aad802a53c0c69efe3764597b8, 0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71, 0x99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c, 0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d, 0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b, 0x19f64674d8a5b4e652319f5e239efd3bc969a1fe
```

## Most Likely Issue

The Rootstock explorer might expect:
1. **JSON file upload** (build info file) - This is the most reliable
2. **ABI-encoded hex string** instead of comma-separated addresses
3. **Exact compiler version string** - might need the full version like `0.8.20+commit.a1b79de6`

## Recommended Approach

1. **First try**: Use the JSON file upload method if available
2. **Second try**: Use the ABI-encoded hex string for constructor arguments
3. **Third try**: Check the deployment transaction to see the exact format used

## Getting Deployment Transaction

To see the exact constructor arguments used, check the contract creation transaction:
- Go to the contract page
- Click on "Transaction" tab
- Find the contract creation transaction (first transaction)
- Look at the "Input Data" to see the exact constructor arguments format

