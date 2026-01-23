# Research Findings: FIFS Addr Registrar Price Issue

## Problem Summary

The FIFS Addr Registrar on RSK Testnet (`0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`) has a critical bug in its `price()` function:
- Returns `duration + 2 RIF` instead of reasonable pricing
- For 1 year (31,536,000 seconds): Returns **31,536,002 RIF** instead of ~0.1 RIF
- This makes registration impossible when using the registrar's price

## Research Results

### 1. Contract Analysis
- ✅ Contract has `price(string, uint256, uint256)` function
- ✅ Contract has `tokenFallback(address, uint256, bytes)` function (supports ERC-677)
- ✅ Contract bytecode: 10,564 bytes
- ✅ Both functions confirmed in bytecode

### 2. Official SDK Behavior
According to `OFFICIAL_SDK_ANALYSIS.md`:
- Official SDK uses `transferAndCall` pattern: `rifToken.transferAndCall(registrar, amount, data)`
- SDK passes `amount` parameter - **but where does it get this amount from?**
- Key question: Does the SDK query `price()` or use a fixed amount?

### 3. Current Implementation
Our contract:
- Uses fixed price: 0.1 RIF per year (bypasses broken `price()` function)
- Calls `transferAndCall` with calculated amount (0.1 RIF for 1 year)
- Registrar rejects with "Not enough tokens"

### 4. Hypothesis

**Theory 1: Registrar validates amount internally**
- When `tokenFallback` receives tokens, it might call `price()` internally
- Compares received amount vs `price()` result
- Rejects if amount < price (which is always true due to bug)

**Theory 2: Registrar accepts any amount**
- Registrar might not validate price in `tokenFallback`
- "Not enough tokens" error might come from elsewhere
- Could be commitment validation, name validation, or other checks

**Theory 3: Different registration path**
- Maybe there's a way to register without going through `price()` validation
- Or registrar has special testnet handling

## Next Steps to Investigate

### Option A: Check Successful Registrations
1. Find actual successful registration transactions on testnet
2. Check what amount was sent in those transactions
3. Verify if they used `transferAndCall` or different method

### Option B: Test with Different Amounts
1. Try sending exactly what `price()` returns (31M RIF) - should work but impractical
2. Try sending 1 wei - see if registrar accepts minimal amount
3. Try sending various amounts to find threshold

### Option C: Check Registrar Source Code
1. Look for registrar source code on GitHub (RIF/RSK repositories)
2. Understand how `tokenFallback` validates amounts
3. Find if there's a workaround or testnet-specific behavior

### Option D: Contact RIF/RSK Team
1. Report the `price()` bug
2. Ask about testnet-specific behavior
3. Request documentation on correct registration flow

## Recommended Approach

**Immediate Action:**
1. Check blockchain explorer for successful registrations
2. Analyze transaction data to see amounts used
3. Test with minimal amount (1 wei) to see if price validation is the issue

**If price validation is the blocker:**
- We may need to send the buggy price amount (31M RIF) - impractical
- Or wait for registrar fix
- Or find alternative registration method

**If price validation is NOT the issue:**
- "Not enough tokens" error is coming from elsewhere
- Could be commitment validation, name format, or other checks
- Need to debug the actual error source

## Files Created

1. `smartcontract/scripts/research-registrar-behavior.ts` - Research script
2. `smartcontract/scripts/debug-token-transfer.ts` - Debug script for token transfers
3. `smartcontract/scripts/test-transfer-and-call.ts` - Test script for transferAndCall

## References

- FIFS Addr Registrar: `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`
- Explorer: https://explorer.testnet.rsk.co/address/0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d
- Official SDK Analysis: `smartcontract/OFFICIAL_SDK_ANALYSIS.md`
- Testnet Price Workaround: `smartcontract/TESTNET_PRICE_WORKAROUND.md`
