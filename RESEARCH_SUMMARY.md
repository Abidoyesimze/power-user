# Research Summary: FIFS Addr Registrar Price Issue

## Critical Discovery

### The `namePrice` Contract

The FIFS Addr Registrar uses a **separate price contract** (`namePrice`):
- **Address**: `0x794F99F1A9382BA88b453DdB4bFa00aCaE8d50E8`
- **Function**: `price(string name, uint256 expires, uint256 duration)`
- **Bug**: Returns `duration + 2 RIF` (same as registrar's price function)

### Key Findings

1. **Registrar Structure**:
   - Registrar: `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`
   - namePrice Contract: `0x794F99F1A9382BA88b453DdB4bFa00aCaE8d50E8`
   - minLength: 5 characters
   - minCommitmentAge: 60 seconds

2. **Price Bug Confirmed**:
   - Both `registrar.price()` and `namePrice.price()` return the same buggy value
   - For 1 year: Returns 31,536,002 RIF instead of ~0.1 RIF
   - Bug is in the namePrice contract, not the registrar itself

3. **Our Implementation**:
   - We calculate: 0.1 RIF per year (correct)
   - We send: 0.1 RIF via `transferAndCall`
   - Registrar rejects: "Not enough tokens"

## Hypothesis

The registrar's `tokenFallback` function likely:
1. Receives tokens via `transferAndCall`
2. Calls `namePrice.price()` to get expected amount
3. Validates: `receivedAmount >= namePrice.price()`
4. Since 0.1 RIF < 31M RIF, it rejects with "Not enough tokens"

## Next Steps

### Option 1: Check Official SDK
- Review `github.com/rsksmart/rns-sdk` source code
- See how SDK handles pricing for `transferAndCall`
- Check if SDK uses fixed price or queries namePrice

### Option 2: Test Price Validation
- Try sending exactly what namePrice returns (31M RIF) - should work but impractical
- Try sending 1 wei - see if there's a minimum threshold
- Try sending various amounts to find the actual validation logic

### Option 3: Alternative Registration Method
- Check if there's a way to register without going through price validation
- Look for direct registration functions that bypass price check
- Check if registrar has testnet-specific behavior

### Option 4: Contact RIF/RSK Team
- Report the namePrice contract bug
- Ask about testnet-specific behavior
- Request workaround or fix timeline

## Files Created

1. `smartcontract/scripts/check-registrar-source.ts` - Analyzes registrar contract
2. `smartcontract/scripts/test-minimal-amount.ts` - Tests price validation
3. `smartcontract/scripts/find-successful-registrations.ts` - Looks for successful registrations
4. `RESEARCH_FINDINGS.md` - Initial research findings
5. `RESEARCH_SUMMARY.md` - This summary

## Current Status

- ✅ Identified namePrice contract
- ✅ Confirmed price bug in namePrice contract
- ✅ Understanding registrar structure
- ⏳ Need to check official SDK implementation
- ⏳ Need to test if registrar actually validates price strictly
- ⏳ Need to find workaround or wait for fix
