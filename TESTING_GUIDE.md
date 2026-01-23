# Testing Guide: Registrar Amount Validation

## Overview

This guide helps you test what amounts the FIFS Addr Registrar actually accepts for registration.

## Key Question

**Does the registrar validate the amount strictly against `namePrice.price()`?**

- If YES: Only 31M RIF will work (impractical)
- If NO: There might be a minimum threshold we can use

## Test Scripts Created

### 1. `test-registrar-amounts.ts`
- Analyzes different amounts
- Shows which amounts meet the expected price
- Provides recommendations
- **Does NOT make transactions** (safe to run)

### 2. `test-actual-registration.ts`
- Actually tests registration with different amounts
- **WARNING: Makes real transactions and spends RIF tokens!**
- Requires private key (use testnet account)
- Tests one amount at a time

## Testing Strategy

### Phase 1: Analysis (Safe)
```bash
npx tsx smartcontract/scripts/test-registrar-amounts.ts
```
This shows:
- Expected price from namePrice contract
- Which test amounts meet the expected price
- Recommendations for actual testing

### Phase 2: Actual Testing (Spends Tokens!)

**Test with minimum amount first:**
```bash
# Test with 0.01 RIF (minimum we calculate)
npx tsx smartcontract/scripts/test-actual-registration.ts <privateKey> 10000000000000000
```

**If that fails, try increasing amounts:**
```bash
# Test with 0.1 RIF (our current)
npx tsx smartcontract/scripts/test-actual-registration.ts <privateKey> 100000000000000000

# Test with 1 RIF
npx tsx smartcontract/scripts/test-actual-registration.ts <privateKey> 1000000000000000000

# Test with 10 RIF
npx tsx smartcontract/scripts/test-actual-registration.ts <privateKey> 10000000000000000000
```

**If all fail, test with buggy amount (to confirm):**
```bash
# Test with buggy price (31M RIF) - should work but impractical
npx tsx smartcontract/scripts/test-actual-registration.ts <privateKey> 31536002000000000000000000
```

## Expected Outcomes

### Scenario 1: Strict Validation
- **Result**: Only buggy amount (31M RIF) works
- **Conclusion**: Registrar validates strictly
- **Solution**: Wait for namePrice contract fix, or find workaround

### Scenario 2: Minimum Threshold
- **Result**: Some minimum amount (e.g., 0.1 RIF, 1 RIF) works
- **Conclusion**: Registrar has minimum threshold
- **Solution**: Use that minimum amount in our contract

### Scenario 3: Any Amount Works
- **Result**: Even 0.01 RIF works
- **Conclusion**: "Not enough tokens" error is from something else
- **Solution**: Debug the actual error source (commitment, name format, etc.)

### Scenario 4: No Amount Works
- **Result**: Even buggy amount fails
- **Conclusion**: Error is NOT about amount
- **Solution**: Check commitment, name format, or other validation

## Safety Notes

⚠️ **WARNING**: `test-actual-registration.ts` makes real transactions!

- Use a testnet account with limited RIF tokens
- Each test spends RIF tokens
- Use unique domain names for each test
- Don't use your main account private key

## Interpreting Results

### If registration succeeds with 0.1 RIF:
✅ **Great!** Registrar accepts our fixed price
- Update contract to use 0.1 RIF
- Problem solved!

### If registration fails with 0.1 RIF but succeeds with 1 RIF:
✅ **Good!** Registrar has minimum threshold
- Update contract to use 1 RIF (or whatever minimum works)
- Problem solved!

### If only buggy amount (31M RIF) works:
❌ **Bad!** Registrar validates strictly
- Need to wait for namePrice contract fix
- Or find alternative registration method
- Or contact RIF/RSK team

### If all amounts fail:
❌ **Different issue!** Error is not about amount
- Check commitment status
- Check name format (5+ characters)
- Check other validation errors
- Debug the actual error source

## Next Steps After Testing

1. **Document findings** in `RESEARCH_FINDINGS.md`
2. **Update contract** if minimum threshold is found
3. **Report bug** to RIF/RSK team if strict validation confirmed
4. **Implement workaround** based on test results
