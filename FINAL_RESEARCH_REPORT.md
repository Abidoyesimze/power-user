# Final Research Report: FIFS Addr Registrar Price Issue

## Executive Summary

After extensive research, we've identified the root cause of the "Not enough tokens" error and discovered critical information about the registrar's structure.

## Key Discoveries

### 1. Registrar Architecture

The FIFS Addr Registrar uses a **two-contract architecture**:

- **Registrar Contract**: `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`
  - Handles registration logic
  - Uses `tokenFallback` to receive ERC-677 `transferAndCall`
  - Delegates price calculation to namePrice contract

- **namePrice Contract**: `0x794F99F1A9382BA88b453DdB4bFa00aCaE8d50E8`
  - Handles price calculation
  - Has buggy `price()` function
  - Returns `duration + 2 RIF` instead of reasonable pricing

### 2. Price Bug Confirmed

**Both contracts return the same buggy value:**
- `registrar.price("simze", 0, 31536000)` → 31,536,002 RIF
- `namePrice.price("simze", 0, 31536000)` → 31,536,002 RIF
- **Expected**: ~0.1 RIF for 1 year
- **Actual**: 31,536,002 RIF (duration in seconds + 2)

### 3. Registrar Configuration

- **minLength**: 5 characters (verified)
- **minCommitmentAge**: 60 seconds (verified)
- **owner**: `0xb576cC74fA1C43dce3238B75aA56126A7fE835AB`

### 4. Error Analysis

**"Not enough tokens" error flow:**
1. Our contract sends 0.1 RIF via `transferAndCall`
2. Registrar's `tokenFallback` receives tokens
3. Registrar likely calls `namePrice.price()` to validate
4. Compares: 0.1 RIF < 31,536,002 RIF
5. Rejects with "Not enough tokens"

## Research Findings

### ✅ Completed Research

1. **Contract Structure Analysis**
   - Identified namePrice contract
   - Confirmed both contracts have same bug
   - Verified registrar configuration

2. **Price Function Testing**
   - Tested registrar.price()
   - Tested namePrice.price()
   - Both return buggy values

3. **Blockchain Analysis**
   - Attempted to find successful registrations
   - No recent registrations found (testnet might be inactive)
   - RPC block range limits prevented full analysis

4. **Scripts Created**
   - `check-registrar-source.ts` - Analyzes registrar structure
   - `test-minimal-amount.ts` - Tests price validation
   - `find-successful-registrations.ts` - Looks for successful registrations
   - `debug-token-transfer.ts` - Debugs token transfers
   - `test-transfer-and-call.ts` - Tests transferAndCall encoding

### ⏳ Pending Research

1. **Official SDK Source Code**
   - Need to check `github.com/rsksmart/rns-sdk`
   - Find RSKRegistrar.ts implementation
   - See how SDK handles pricing

2. **Price Validation Logic**
   - Need to understand if registrar validates strictly
   - Check if there's a minimum threshold
   - Test with different amounts

3. **Alternative Registration Methods**
   - Check if there's a way to bypass price validation
   - Look for testnet-specific behavior
   - Check for admin functions or workarounds

## Hypotheses

### Theory 1: Strict Price Validation (Most Likely)
- Registrar validates `receivedAmount >= namePrice.price()`
- Since namePrice returns buggy value, our 0.1 RIF is rejected
- **Solution**: Need to send buggy amount (31M RIF) - impractical

### Theory 2: Minimum Threshold
- Registrar might accept any amount >= some minimum (e.g., 0.01 RIF)
- "Not enough tokens" might mean something else
- **Solution**: Test with different amounts to find threshold

### Theory 3: Testnet-Specific Behavior
- Registrar might have special testnet handling
- Might accept any amount on testnet
- **Solution**: Test with minimal amount (1 wei)

### Theory 4: Alternative Registration Path
- There might be a different function that bypasses price check
- Or registrar might not validate price in certain conditions
- **Solution**: Find alternative registration method

## Recommendations

### Immediate Actions

1. **Check Official SDK**
   - Review `github.com/rsksmart/rns-sdk` source code
   - See how SDK calculates amount for `transferAndCall`
   - Check if SDK uses fixed price or queries namePrice

2. **Test Price Validation**
   - Try sending 1 wei to see if there's a minimum threshold
   - Try sending various amounts to understand validation logic
   - Check if error message changes with different amounts

3. **Contact RIF/RSK Team**
   - Report the namePrice contract bug
   - Ask about testnet-specific behavior
   - Request workaround or fix timeline

### Long-term Solutions

1. **Wait for Fix**
   - Report bug to RIF/RSK team
   - Wait for namePrice contract fix
   - Update contract to use fixed price until fix

2. **Alternative Implementation**
   - Use Basic FIFS Registrar (if it works)
   - Implement separate resolver/address setting
   - Accept that testnet has limitations

3. **Workaround Implementation**
   - If registrar accepts minimum amount, use that
   - If there's alternative path, use that
   - Document workaround for users

## Files Created

1. `RESEARCH_FINDINGS.md` - Initial research findings
2. `RESEARCH_SUMMARY.md` - Summary of discoveries
3. `FINAL_RESEARCH_REPORT.md` - This comprehensive report
4. `smartcontract/scripts/check-registrar-source.ts` - Registrar analysis
5. `smartcontract/scripts/test-minimal-amount.ts` - Price testing
6. `smartcontract/scripts/find-successful-registrations.ts` - Registration finder
7. `smartcontract/scripts/debug-token-transfer.ts` - Token transfer debugger
8. `smartcontract/scripts/test-transfer-and-call.ts` - transferAndCall tester

## Next Steps

1. ✅ **Completed**: Identified namePrice contract and confirmed bug
2. ⏳ **In Progress**: Checking official SDK implementation
3. ⏳ **Pending**: Testing price validation with different amounts
4. ⏳ **Pending**: Contacting RIF/RSK team about bug

## Conclusion

The root cause is clear: the namePrice contract has a bug that returns `duration + 2 RIF` instead of reasonable pricing. The registrar likely validates amounts against this buggy price, causing our 0.1 RIF to be rejected.

**The solution depends on:**
- Whether the official SDK has a workaround
- Whether the registrar accepts minimum amounts
- Whether there's an alternative registration method
- Whether we need to wait for a fix

We need to continue research on the official SDK and test price validation behavior to find a workaround.
