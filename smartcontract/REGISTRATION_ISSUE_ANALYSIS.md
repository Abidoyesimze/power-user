# RNS Registration Issue Analysis

## Problem Summary

Based on the [RNS Documentation](https://dev.rootstock.io/concepts/rif-suite/rns/) and our verification script results, we've identified the root cause of registration failures.

## Key Findings

### 1. Domain Name Format Issue

According to the RNS documentation and common registrar patterns, the FIFS registrar likely expects domain names **WITHOUT** the `.rsk` suffix when calling `register()`, `available()`, and `price()` functions.

**Current Implementation:**
- Frontend sends: `"test123.rsk"` 
- Contract passes: `"test123.rsk"` to FIFS registrar
- FIFS registrar likely expects: `"test123"` (without `.rsk`)

### 2. Testnet FIFS Registrar Behavior

The testnet FIFS registrar (`0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`) is reverting on:
- `available(string name)` - when called with names containing `.rsk`
- `price(string name, uint256 duration)` - when called with names containing `.rsk`

This suggests the registrar validates domain names and rejects names that include the TLD suffix.

### 3. Contract Flow Analysis

Our `RNSBulkManager` contract flow:
1. ✅ Receives registration requests
2. ❌ Calls `fifsRegistrar.price(name, duration)` - **REVERTS** if name includes `.rsk`
3. ❌ Emits `OperationFailed(i, "Failed to get price")`
4. ❌ Skips registration for that domain
5. ✅ Transaction succeeds (but with 0 successful registrations)
6. ✅ Emits `BulkRegistration` with `count = 0`

### 4. Verification Script Results

From our verification script:
- Transaction confirmed: ✅
- No `BulkRegistration` event with count > 0: ❌
- Registry owner remains zero: ❌
- FIFS registrar view functions revert: ❌

## Root Cause

**The domain name format is incorrect.** We're passing `"test123.rsk"` to the FIFS registrar, but it expects just `"test123"`.

## Solution

### Option 1: Fix in Frontend (Recommended)

Strip the `.rsk` suffix before sending to the contract:

```typescript
// In RegisterTab.tsx
const requests = domains.map((d) => ({
  name: d.name.trim().replace(/\.rsk$/, ''), // Remove .rsk suffix
  owner: address,
  secret: emptySecret,
  duration: BigInt(parseInt(d.duration) * 365 * 24 * 60 * 60),
}));
```

### Option 2: Fix in Contract

Strip the `.rsk` suffix in the contract before calling FIFS registrar:

```solidity
// In RNSBulkManager.sol
function stripRskSuffix(string memory name) internal pure returns (string memory) {
    bytes memory nameBytes = bytes(name);
    bytes memory rskSuffix = bytes(".rsk");
    
    if (nameBytes.length <= rskSuffix.length) {
        return name;
    }
    
    // Check if name ends with ".rsk"
    bool hasRskSuffix = true;
    for (uint i = 0; i < rskSuffix.length; i++) {
        if (nameBytes[nameBytes.length - rskSuffix.length + i] != rskSuffix[i]) {
            hasRskSuffix = false;
            break;
        }
    }
    
    if (hasRskSuffix) {
        // Return name without .rsk suffix
        bytes memory result = new bytes(nameBytes.length - rskSuffix.length);
        for (uint i = 0; i < result.length; i++) {
            result[i] = nameBytes[i];
        }
        return string(result);
    }
    
    return name;
}
```

Then use it:
```solidity
string memory domainName = stripRskSuffix(requests[i].name);
try fifsRegistrar.price(domainName, requests[i].duration) returns (uint256 cost) {
    // ...
}
```

### Option 3: Fix in Both (Most Robust)

Handle it in both places to ensure consistency.

## Verification

After implementing the fix, the verification script should show:
- ✅ `BulkRegistration` event with `count > 0`
- ✅ Registry owner matches deployer address
- ✅ FIFS registrar `available()` returns `false` after registration

## References

- [RNS Documentation](https://dev.rootstock.io/concepts/rif-suite/rns/)
- [RNS Specification](https://dev.rootstock.io/concepts/rif-suite/rns/specs/)
- Testnet FIFS Registrar: `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`

