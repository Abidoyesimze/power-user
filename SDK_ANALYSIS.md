# Official RNS SDK Analysis - Price Handling

## Key Discovery from SDK Source Code

### SDK Registration Function

```typescript
async register (label: string, owner: string, secret: string, duration: BigNumber, amount: BigNumber, addr?: string): Promise<ContractTransaction> {
  // Encodes data with signature, owner, secret, duration, addr, name
  const data = `${_signature}${_owner}${_secret}${_duration}${_addr}${_name}`
  
  return this.rifToken.transferAndCall(this.fifsAddrRegistrar.address, amount, data)
}
```

### SDK Price Function

```typescript
price (label: string, duration: BigNumber): Promise<BigNumber> {
  return this.fifsAddrRegistrar.price(label, constants.Zero, duration)
}
```

## Critical Finding

**The SDK's `register()` function accepts `amount` as a parameter!**

This means:
- ✅ SDK does NOT calculate amount internally
- ✅ SDK does NOT query price() to get amount
- ✅ The **caller** (frontend/app) must provide the amount
- ✅ SDK just passes whatever amount is provided to `transferAndCall`

## Implications

### How Official Frontend/App Handles This

The official RNS frontend/app must:
1. Either query `price()` and use that amount (would get buggy value on testnet)
2. Or use a fixed price calculation (workaround for testnet bug)
3. Or have testnet-specific logic

### Our Implementation

We're doing the same thing:
- We calculate fixed price (0.1 RIF/year)
- We pass it to `transferAndCall`
- But registrar rejects it

## The Real Question

**Why does the registrar reject our 0.1 RIF when the SDK also passes amounts?**

Possible answers:
1. **Official frontend sends buggy amount** (31M RIF) - impractical but works
2. **Registrar doesn't validate amount** - but then why do we get "Not enough tokens"?
3. **There's a minimum threshold** - registrar accepts any amount >= some minimum
4. **Testnet has different behavior** - registrar might be more lenient
5. **Error is from something else** - "Not enough tokens" might not be about amount

## Next Steps

1. **Test with minimal amount** (1 wei) to see if it's price validation
2. **Check if error message is misleading** - might be commitment or other validation
3. **Try sending the buggy amount** (31M RIF) to confirm if that's the issue
4. **Check registrar's tokenFallback implementation** - see what it actually validates

## Hypothesis Update

Based on SDK analysis:
- SDK doesn't validate or calculate amount - it's passed from caller
- Official apps must handle the buggy price() somehow
- Either they send buggy amount, or registrar accepts minimum amounts
- We need to test if registrar has a minimum threshold
