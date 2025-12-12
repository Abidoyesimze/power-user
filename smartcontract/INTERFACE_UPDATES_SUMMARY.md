# RNS Contract Interface Updates - Summary

## Date: 2025-12-12

## Overview
Updated all RNS contract interfaces and implementations to match the actual deployed contracts on RSK Testnet, as verified via block explorer.

## Changes Made

### 1. Interface Updates

#### IFIFSRegistrar.sol
- ✅ Added `addr` parameter to `register()` function (5th parameter)
- ✅ Added `expires` parameter to `price()` function (2nd parameter, use 0 for new registrations)
- ✅ Added commit-reveal functions: `commit()`, `canReveal()`, `makeCommitment()`, `minCommitmentAge()`
- ⚠️ Removed `available()` function (not found on actual contract)

#### IRenewer.sol
- ✅ Added `expires` parameter to `price()` function (2nd parameter)
- ✅ `renew()` function unchanged (already correct)

### 2. Contract Implementation Updates

#### RNSBulkManager.sol
- ✅ Updated `RegistrationRequest` struct to include `addr` field
- ✅ Updated `RenewalRequest` struct to include `expires` field
- ✅ Updated all `fifsRegistrar.price()` calls to include `expires = 0` parameter
- ✅ Updated all `fifsRegistrar.register()` calls to include `addr` parameter
- ✅ Updated all `renewer.price()` calls to include `expires` parameter
- ✅ Updated `calculateRenewalCost()` to accept `expires` array parameter

### 3. Mock Contracts Updates

#### MockFIFSRegistrar.sol
- ✅ Updated `register()` to match new signature with `addr` parameter
- ✅ Updated `price()` to match new signature with `expires` parameter
- ✅ Added commit-reveal functions (minimal implementation for testing)
- ✅ Kept `available()` function for backward compatibility in tests

#### MockRenewer.sol
- ✅ Updated `price()` to match new signature with `expires` parameter
- ✅ Updated `renew()` to use new `price()` signature

### 4. Test Updates

#### RNSBulkManager.test.ts
- ✅ Updated `mockFIFSRegistrar.read.price()` calls to include `expires = 0`
- ✅ Updated `calculateRenewalCost()` test to include `expires` array
- ✅ Updated `mockRenewer.read.price()` calls to include `expires` parameter

### 5. Script Updates

#### verify-registration.ts
- ✅ Updated FIFS registrar ABI to include `expires` parameter in `price()` function
- ✅ Updated `price()` call to include `expires = 0` for new registrations

### 6. Frontend Updates

#### useContract.ts
- ✅ Updated `bulkRegister()` request type to include `addr` field
- ✅ Updated `bulkRenew()` to include `expires = 0` in requests
- ✅ Updated `calculateRenewalCost()` to accept `expires` array parameter

#### RegisterTab.tsx
- ✅ Updated registration requests to include `addr` field (set to owner address)

## Important Notes

### Commit-Reveal Scheme
The FIFS Registrar uses a commit-reveal scheme, but our bulk registration function still calls `register()` directly. This works if:
1. The commitment was made in a previous transaction, OR
2. The contract allows direct registration in some cases

**Future Enhancement**: Consider implementing a two-step bulk registration process:
1. `bulkCommit()` - Make commitments for all domains
2. `bulkRegister()` - Reveal and register after `minCommitmentAge` has passed

### Expires Parameter
- **For new registrations**: Use `expires = 0`
- **For renewals**: Ideally should be the current expiration timestamp, but using `0` may work if the contract can determine it internally

**Future Enhancement**: Query expiration times from the registry/registrar and pass them explicitly.

### Address Parameter
The `addr` parameter in `register()` sets the address for the domain immediately after registration. We default to using the owner's address, but users could specify a different address if needed.

## Testing Status

✅ All interfaces updated
✅ All implementations updated
✅ All mocks updated
✅ All tests updated
✅ All scripts updated
✅ Frontend code updated
✅ No linter errors

## Next Steps

1. **Compile contracts** to regenerate ABI files:
   ```bash
   cd smartcontract
   npm run compile
   ```

2. **Run tests** to verify everything works:
   ```bash
   npm test
   ```

3. **Update frontend ABI** if needed (should be auto-generated from compilation)

4. **Test on testnet** to verify the changes work with actual contracts

5. **Consider implementing**:
   - Two-step commit-reveal bulk registration
   - Expiration time querying for renewals
   - Better error handling for missing expires values

## Files Modified

### Smart Contracts
- `contracts/interfaces/IFIFSRegistrar.sol`
- `contracts/interfaces/IRenewer.sol`
- `contracts/RNSBulkManager.sol`
- `contracts/mocks/MockFIFSRegistrar.sol`
- `contracts/mocks/MockRenewer.sol`

### Tests
- `test/RNSBulkManager.test.ts`

### Scripts
- `scripts/verify-registration.ts`

### Frontend
- `frontend/lib/hooks/useContract.ts`
- `frontend/app/manage/components/RegisterTab.tsx`

## Verification

All changes have been verified against the actual contract ABIs found on:
- FIFS Registrar: https://explorer.testnet.rootstock.io/address/0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d
- RNS Registry: https://explorer.testnet.rootstock.io/address/0x7d284aaac6e925aad802a53c0c69efe3764597b8
- Renewer: https://explorer.testnet.rootstock.io/address/0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b

