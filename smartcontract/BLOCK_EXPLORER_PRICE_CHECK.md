# Check FIFS Registrar Price on Block Explorer

## Contract Address
**FIFS Registrar**: `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`

## Function: `price`
**Function Signature**: `price(string name, uint256 expires, uint256 duration)`
**Function Selector**: `0x50e9a715`

## Arguments to Pass

### For New Registration (expires = 0)
```
name (string): simze
expires (uint256): 0
duration (uint256): 31536000
```

### Step-by-Step on Block Explorer

1. Go to: https://explorer.testnet.rootstock.io/address/0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d
2. Click on "Contract" tab
3. Find the `price` function
4. Enter the following values:

**Field 1 - name (string):**
```
simze
```

**Field 2 - expires (uint256):**
```
0
```

**Field 3 - duration (uint256):**
```
31536000
```
*(This is 1 year in seconds: 365 * 24 * 60 * 60 = 31,536,000)*

5. Click "Query" or "Read"

## Expected Result

The function should return a `uint256` value representing the price in wei (smallest unit of RIF token).

To convert to RIF:
- Divide by 10^18 (1e18)
- Example: If result is `1000000000000000000`, that's `1.0 RIF`

## Common Duration Values

- **1 Year**: `31536000` (365 * 24 * 60 * 60)
- **2 Years**: `63072000` (2 * 31536000)
- **5 Years**: `157680000` (5 * 31536000)

## Troubleshooting

If the function reverts, it might mean:
- The domain name format is incorrect
- The domain is already registered
- The duration is invalid

## Alternative: Check via Contract Read

You can also use the contract's `calculateRegistrationCost` function:

**Contract**: `0xbf1b2ca2cc17bd98679d584575d549c62b3214eb`
**Function**: `calculateRegistrationCost(string[] names, uint256[] durations)`

**Arguments:**
```
names (string[]): ["simze"]
durations (uint256[]): [31536000]
```

This will return the total cost for registering the domain.

