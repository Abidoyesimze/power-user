# Testnet Price Workaround Implementation

## Problem
The FIFS Registrar on RSK Testnet has a critical bug:
- **Short durations** (seconds, minutes): Prices are reasonable (2-62 RIF)
- **Long durations** (days, years): Prices are impossible (86,402 - 31.5M RIF)

The registrar returns `duration + 2 RIF`, making multi-year registrations impossible.

## Solution
Implemented a **fixed price workaround** that bypasses the broken FIFS registrar price function.

### How It Works

1. **Workaround Enabled** (`useTestnetPriceWorkaround = true`):
   - Uses fixed price: **0.1 RIF per year**
   - Minimum price: **0.01 RIF** (for durations < 1 year)
   - Calculates: `price = (duration_in_seconds / 31536000) * 0.1 RIF`

2. **Workaround Disabled** (`useTestnetPriceWorkaround = false`):
   - Uses FIFS registrar price (for mainnet when bug is fixed)
   - Falls back to fixed price if registrar price > 10 RIF

### Price Examples

| Duration | FIFS Registrar (Buggy) | Workaround (Fixed) |
|----------|----------------------|-------------------|
| 1 second | 2 RIF | 0.01 RIF (minimum) |
| 1 minute | 62 RIF | 0.01 RIF (minimum) |
| 1 day | 86,402 RIF | 0.01 RIF (minimum) |
| 1 year | 31,536,002 RIF | 0.1 RIF ✅ |
| 2 years | 63,072,002 RIF | 0.2 RIF ✅ |
| 5 years | 157,680,002 RIF | 0.5 RIF ✅ |

## Implementation Details

### Constants
```solidity
uint256 public constant MAX_REGISTRATION_PRICE = 10 * 10**18; // 10 RIF cap
uint256 public constant TESTNET_PRICE_PER_YEAR = 1 * 10**17; // 0.1 RIF per year
bool public useTestnetPriceWorkaround = true; // Enabled by default
```

### Functions Updated
- `bulkRegister()` - Uses workaround for price calculation
- `calculateRegistrationCost()` - Uses workaround for price estimation

### Price Calculation Formula
```solidity
durationInYears = (duration_in_seconds * 100) / 31536000
price = (TESTNET_PRICE_PER_YEAR * durationInYears) / 100
if (price < 0.01 RIF) price = 0.01 RIF // Minimum
```

## Benefits

✅ **Makes registration possible** on testnet for any duration
✅ **Reasonable prices** (0.1 RIF/year instead of millions)
✅ **Backward compatible** - can be disabled for mainnet
✅ **Safe fallback** - detects and handles registrar bugs

## Usage

### For Users
- Registration now works normally on testnet
- Prices are reasonable and predictable
- No special configuration needed

### For Developers
- Workaround is enabled by default on deployment
- Can be disabled via `useTestnetPriceWorkaround = false` if registrar is fixed
- Price calculation is transparent and auditable

## Future Considerations

When the FIFS registrar bug is fixed:
1. Set `useTestnetPriceWorkaround = false`
2. Contract will automatically use registrar prices
3. Fixed price remains as fallback for safety

## Testing

Test the workaround:
```bash
# Calculate cost for 1 year registration
npx hardhat run scripts/debug-registration.ts --network rskTestnet
```

Expected: ~0.1 RIF instead of 31.5M RIF

