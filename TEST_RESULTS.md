# Test Results: Registrar Amount Validation

## Summary
We tested the FIFS Addr Registrar's amount validation to understand why "Not enough tokens" errors occur.

## Test Results

### Test 1: 0.1 RIF (100000000000000000 wei)
- **Result**: ❌ Failed with "Not enough tokens"
- **Conclusion**: 0.1 RIF is insufficient

### Test 2: 1 RIF (1000000000000000000 wei)
- **Result**: ❌ Failed with "Not enough tokens"
- **Conclusion**: 1 RIF is also insufficient

## Key Findings

1. **Registrar Strictly Validates Amount**
   - The registrar checks `amount >= namePrice.price(name, expires, duration)`
   - `namePrice.price()` returns **31,536,002 RIF** (buggy value)
   - This is `duration + 2` RIF instead of a reasonable price

2. **Only Buggy Amount Works**
   - Only amounts >= 31,536,002 RIF will pass validation
   - This is impractical for users (31M RIF per domain!)

3. **Root Cause Confirmed**
   - The "Not enough tokens" error is caused by the registrar's internal validation
   - It compares the sent amount against `namePrice.price()`
   - Since `namePrice.price()` is buggy, normal amounts fail

## Analysis from `test-registrar-amounts.ts`

The analysis script showed:
- Expected price from `namePrice.price()`: **31,536,002 RIF**
- Our test amounts (0.1 RIF, 1 RIF, etc.) are all **0.00%** of expected
- Only the "Buggy price" (31M RIF) meets the requirement

## Recommendations

### Option 1: Wait for Testnet Fix (Recommended)
- Contact Rootstock devrel team about the `namePrice` contract bug
- Request fix for testnet `namePrice.price()` function
- This is the proper long-term solution

### Option 2: Use Mainnet
- Mainnet `namePrice` contract may not have this bug
- Test on mainnet to confirm
- **WARNING**: This costs real money!

### Option 3: Workaround (Not Recommended)
- Send 31M RIF per registration (impractical)
- This defeats the purpose of bulk registration

### Option 4: Alternative Approach
- Use a different registrar if available
- Or implement a custom pricing mechanism (if possible)

## Next Steps

1. **Report to Devrel Team**
   - Share these test results
   - Request fix for testnet `namePrice.price()` function
   - Ask if there's a workaround or alternative

2. **Document the Issue**
   - Update contract comments to explain the limitation
   - Add warning in frontend about testnet limitations

3. **Consider Mainnet Testing**
   - Test if mainnet has the same issue
   - If mainnet works, document testnet limitation

## Test Scripts Used

1. `test-registrar-amounts.ts` - Analysis (safe, no transactions)
2. `test-actual-registration.ts` - Actual registration tests (spends tokens)

Both scripts are in `smartcontract/scripts/`
