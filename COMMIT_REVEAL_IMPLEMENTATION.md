# Commit-Reveal Implementation Summary

## Overview

We've successfully implemented the commit-reveal flow for RNS domain registration using a hybrid approach:
- **Frontend**: Uses viem-based implementation (following official SDK pattern) for commit phase
- **Contract**: Uses our `RNSBulkManager` contract for bulk registration (reveal phase)

## What Was Implemented

### 1. RNS Registrar Hook (`frontend/lib/hooks/useRNSRegistrar.ts`)

A custom hook that implements the commit-reveal flow using viem (compatible with wagmi):

- **`commitToRegister(domainName)`**: Commits a single domain
  - Generates random secret (32 bytes)
  - Creates commitment hash using FIFS registrar's `makeCommitment`
  - Commits the hash to the blockchain
  - Returns secret and commitment hash for later use

- **`bulkCommit(domainNames)`**: Commits multiple domains
  - Commits each domain sequentially
  - Returns array of commit results with secrets

- **`canReveal(commitmentHash)`**: Checks if commitment is ready
  - Returns true if 60 seconds have passed
  - Used to enable registration button

### 2. Updated RegisterTab Component

The registration flow now works in two steps:

#### Step 1: Commit Phase
1. User clicks "Register"
2. Frontend calls `bulkCommit()` for all domains
3. Each domain gets a random secret and commitment hash
4. Commitments are submitted to FIFS registrar
5. UI shows "Step 1/2 Complete" with countdown timer

#### Step 2: Wait Phase (60 seconds)
1. Countdown timer starts at 60 seconds
2. Frontend polls `canReveal()` every 2 seconds
3. UI shows remaining time
4. Button is disabled during countdown

#### Step 3: Register Phase
1. After 60 seconds, countdown reaches 0
2. Button becomes enabled
3. User clicks "Register" again (or auto-triggers)
4. Frontend calls `bulkRegister()` with secrets from commit phase
5. Our contract registers all domains in one transaction

### 3. UI Enhancements

- **Commit Status Display**: Shows commit progress and countdown
- **Countdown Timer**: Visual countdown from 60 seconds
- **Two-Step Button**: Button text changes based on phase
  - "Register X Domains" → Initial state
  - "Committing..." → During commit
  - "Waiting... (Xs)" → During countdown
  - "Register X Domains" → Ready to register

## Key Features

### ✅ Proper Secret Generation
- Uses `randomBytes(32)` to generate secrets (not empty bytes32)
- Matches official SDK pattern

### ✅ Commit-Reveal Flow
- Follows official RNS FIFS registrar requirements
- 60-second wait period enforced
- Automatic polling to check reveal readiness

### ✅ Bulk Operations
- Commits all domains in sequence
- Registers all domains in one transaction (gas efficient)
- Handles partial failures gracefully

### ✅ User Experience
- Clear two-step process indication
- Real-time countdown timer
- Helpful status messages
- Automatic state cleanup after registration

## Technical Details

### Contract Addresses (Testnet)
- FIFS Registrar: `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`
- RNS Bulk Manager: `0xdd190753dd92104de84555892344c05b9c009577`

### Flow Diagram

```
User clicks "Register"
    ↓
[Step 1: Commit]
    ├─ Generate secrets (random 32 bytes)
    ├─ Create commitment hashes
    ├─ Submit commits to FIFS registrar
    └─ Store secrets & hashes
    ↓
[Step 2: Wait 60 seconds]
    ├─ Countdown timer (60 → 0)
    ├─ Poll canReveal() every 2s
    └─ Enable button when ready
    ↓
[Step 3: Register]
    ├─ Use stored secrets
    ├─ Call bulkRegister() with secrets
    └─ Register all domains in one tx
```

## Testing Checklist

- [ ] Commit phase works for single domain
- [ ] Commit phase works for multiple domains
- [ ] Countdown timer works correctly
- [ ] Registration works after countdown
- [ ] Secrets are properly stored and used
- [ ] Error handling for failed commits
- [ ] Error handling for failed registrations
- [ ] UI state cleanup after success
- [ ] Domains appear in official RNS registry

## Next Steps

1. **Test the complete flow** on testnet
2. **Verify domain ownership** after registration
3. **Check official RNS app** to confirm domains appear
4. **Handle edge cases**:
   - What if user closes browser during countdown?
   - What if commitment expires?
   - What if registration fails after commit?

## Files Modified

1. `frontend/lib/hooks/useRNSRegistrar.ts` - New hook for commit-reveal
2. `frontend/app/manage/components/RegisterTab.tsx` - Updated registration flow
3. `frontend/package.json` - Added `@rsksmart/rns-sdk` (for reference, though we use viem implementation)

## Notes

- We use viem-based implementation instead of the official SDK because:
  - We're already using viem/wagmi
  - Avoids ethers.js dependency
  - More consistent with our stack
  - Same logic as official SDK, just adapted for viem

- The implementation follows the official SDK's pattern:
  - Same secret generation
  - Same commitment hash calculation
  - Same commit-reveal flow
  - Just using viem instead of ethers.js

