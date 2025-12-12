# RNS Contract Analysis - Block Explorer Findings

## Date: 2025-12-12

## Contract Addresses Checked

### 1. FIFS Registrar: `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`
**Explorer**: https://explorer.testnet.rootstock.io/address/0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d

#### Read Functions Found:
1. `canReveal(bytes32 commitment)` - Check if commitment can be revealed
2. `isOwner()` - Check ownership (likely)
3. `makeCommitment(bytes32 label, address nameOwner, bytes32 secret)` - Create commitment
4. `minCommitmentAge()` - Get minimum commitment age
5. `minLength()` - Get minimum name length
6. `namePrice()` - Get name price
7. `owner()` - Get contract owner
8. **`price(string name, uint256 expires, uint256 duration)`** ⚠️ **DIFFERENT SIGNATURE**

#### Write Functions Found:
1. `commit(bytes32 commitment)` - Make a commitment (commit-reveal scheme)
2. **`register(string name, address nameOwner, bytes32 secret, uint256 duration, address addr)`** ⚠️ **DIFFERENT SIGNATURE**
3. `renounceOwnership()` - Renounce ownership
4. `setMinCommitmentAge(uint256 newMinCommitmentAge)` - Set min commitment age
5. `setMinLength(uint256 newMinLength)` - Set min length
6. `setNamePrice(address newNamePrice)` - Set name price
7. `tokenFallback(address from, uint256 value, bytes data)` - Token fallback
8. `transferOwnership(address newOwner)` - Transfer ownership

## ⚠️ CRITICAL FINDINGS

### Issue 1: `register` Function Signature Mismatch

**Our Interface:**
```solidity
function register(string memory name, address owner, bytes32 secret, uint256 duration) external;
```

**Actual Contract:**
```solidity
function register(string name, address nameOwner, bytes32 secret, uint256 duration, address addr) external;
```

**Difference:** The actual contract has an **extra `addr` parameter** at the end!

### Issue 2: `price` Function Signature Mismatch

**Our Interface:**
```solidity
function price(string memory name, uint256 duration) external view returns (uint256);
```

**Actual Contract:**
```solidity
function price(string name, uint256 expires, uint256 duration) external view returns (uint256);
```

**Difference:** The actual contract requires an **`expires` parameter** (likely the expiration timestamp)!

### Issue 3: Commit-Reveal Scheme

The contract uses a **commit-reveal scheme**, not a simple FIFS registration:
1. First call `commit(bytes32 commitment)` 
2. Wait for `minCommitmentAge`
3. Then call `register()` to reveal

**Our current implementation doesn't handle this!**

### Issue 4: Missing `available` Function

Our interface includes:
```solidity
function available(string memory name) external view returns (bool);
```

**This function was NOT found on the block explorer!** It may not exist or may have a different name.

## Next Steps

1. ✅ Update `IFIFSRegistrar.sol` interface to match actual contract signatures
2. ✅ Update `RNSBulkManager.sol` to handle commit-reveal scheme
3. ✅ Update `price()` calls to include `expires` parameter
4. ✅ Update `register()` calls to include `addr` parameter
5. ⚠️ Check if `available()` function exists or find alternative
6. ⚠️ Check other RNS contracts (Registry, Renewer, etc.)

### 2. RNS Registry: `0x7d284aaac6e925aad802a53c0c69efe3764597b8`
**Explorer**: https://explorer.testnet.rootstock.io/address/0x7d284aaac6e925aad802a53c0c69efe3764597b8

#### Read Functions Found:
1. `resolver(bytes32 node)` ✅ **MATCHES** our interface
2. `owner(bytes32 node)` ✅ **MATCHES** our interface
3. `ttl(bytes32 node)` ✅ **MATCHES** our interface

**Status**: ✅ RNS Registry interface is correct!

### 3. Renewer: `0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b`
**Explorer**: https://explorer.testnet.rootstock.io/address/0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b

#### Read Functions Found:
1. `isOwner()` - Check ownership
2. `namePrice()` - Get name price
3. `owner()` - Get contract owner
4. **`price(string name, uint256 expires, uint256 duration)`** ⚠️ **DIFFERENT SIGNATURE**

#### Write Functions Found:
1. **`renew(string name, uint256 duration)`** ✅ **MATCHES** our interface
2. `renounceOwnership()` - Renounce ownership
3. `setNamePrice(address newNamePrice)` - Set name price
4. `tokenFallback(address from, uint256 value, bytes data)` - Token fallback
5. `transferOwnership(address newOwner)` - Transfer ownership

## ⚠️ ADDITIONAL FINDINGS

### Issue 5: Renewer `price` Function Signature Mismatch

**Our Interface:**
```solidity
function price(string memory name, uint256 duration) external view returns (uint256);
```

**Actual Contract:**
```solidity
function price(string name, uint256 expires, uint256 duration) external view returns (uint256);
```

**Difference:** Same as FIFS Registrar - requires an **`expires` parameter** (expiration timestamp)!

### Issue 6: Renewer `renew` Function ✅ CORRECT

**Our Interface:**
```solidity
function renew(string memory name, uint256 duration) external returns (uint256);
```

**Actual Contract:**
```solidity
function renew(string name, uint256 duration) external returns (uint256);
```

**Status**: ✅ **MATCHES** - No changes needed!

## Summary of All Issues

| Contract | Function | Status | Issue |
|----------|----------|--------|-------|
| FIFS Registrar | `register` | ❌ | Missing `addr` parameter |
| FIFS Registrar | `price` | ❌ | Missing `expires` parameter |
| FIFS Registrar | `available` | ❌ | Function not found |
| FIFS Registrar | Commit-Reveal | ❌ | Not implemented |
| RNS Registry | All functions | ✅ | Correct |
| Renewer | `renew` | ✅ | Correct |
| Renewer | `price` | ❌ | Missing `expires` parameter |

## Other Contracts to Check (Not Yet Verified)

- RSK Owner: `0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71`
- Addr Resolver: `0x99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c`

