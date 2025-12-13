# FIFS Registrar Price Function Issue

## Problem Identified

The FIFS Registrar's `price` function is returning incorrect values on RSK Testnet.

### Test Case
- **Contract**: `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`
- **Function**: `price(string name, uint256 expires, uint256 duration)`
- **Arguments**:
  - `name`: `simze`
  - `expires`: `0`
  - `duration`: `31536000` (1 year in seconds)

### Result
- **Returned Value**: `31536002000000000000000000` wei
- **In RIF**: `31,536,002 RIF` (31.5 million RIF!)

### Expected Behavior
Domain registration should cost approximately:
- **Expected**: `0.01` to `1.0` RIF for 1 year
- **Actual**: `31,536,002 RIF` (31.5 million RIF)

## Analysis

The returned value (`31,536,002 RIF`) is suspiciously close to:
- Duration in seconds: `31,536,000`
- Returned value: `31,536,002` (duration + 2)

This suggests the FIFS registrar might be:
1. **Bug**: Returning duration as price (with incorrect unit conversion)
2. **Bug**: Using duration directly in price calculation without proper scaling
3. **Bug**: Missing decimal handling (treating seconds as RIF tokens)

## Impact

This makes domain registration **impossible** on testnet because:
- Users would need 31.5 million RIF tokens to register a single domain
- The actual cost should be less than 1 RIF
- This is clearly a bug in the FIFS registrar contract

## Possible Causes

1. **Unit Mismatch**: The registrar might be expecting duration in a different unit (e.g., years instead of seconds)
2. **Calculation Error**: The price formula might be incorrectly using duration
3. **Testnet Bug**: The testnet FIFS registrar might have a known bug

## Workarounds

### Option 1: Check if Mainnet Works Differently
- Test the same function on RSK Mainnet
- Mainnet contract might be different/fixed

### Option 2: Use Different Duration
- Try with `1` second duration to see if price changes
- If price = `3` RIF for 1 second, confirms the bug

### Option 3: Check Official RNS Documentation
- Verify expected pricing from RNS documentation
- Check if there's a known issue or workaround

### Option 4: Contact Rootstock Team
- Report this as a bug in the testnet FIFS registrar
- Request fix or clarification

## Test Results

```
Function: price(string, uint256, uint256)
Arguments: ("simze", 0, 31536000)
Result: 31536002000000000000000000 wei = 31,536,002 RIF
```

## Test Results - Pattern Confirmed

Testing different durations shows the bug pattern:

| Duration | Price Returned | Ratio |
|----------|---------------|-------|
| 1 second | 2 RIF | 2.0 |
| 1 minute | 62 RIF | 1.03 |
| 1 hour | 3,602 RIF | 1.00 |
| 1 day | 86,402 RIF | 1.00 |
| 1 year | 31,536,002 RIF | 1.00 |
| 2 years | 63,072,002 RIF | 1.00 |

**Pattern**: `Price = Duration (in seconds) + 2 RIF`

This confirms the FIFS registrar is incorrectly using duration directly as price.

## Workaround Implemented

Added price validation in `RNSBulkManager.sol`:
- Maximum price cap: 10 RIF per domain
- Clear error message when price exceeds cap
- Prevents users from attempting impossible transactions

## Next Steps

1. ✅ Document the issue
2. ✅ Test with different durations to confirm pattern
3. ✅ Add workaround in contract (price validation)
4. ⏳ Check RNS documentation for expected pricing
5. ⏳ Test on mainnet if available
6. ⏳ Report to Rootstock team

## Related Files

- `smartcontract/contracts/interfaces/IFIFSRegistrar.sol` - Interface definition
- `smartcontract/contracts/RNSBulkManager.sol` - Uses FIFS registrar price
- `smartcontract/scripts/debug-registration.ts` - Debug script

