# Testing via Frontend

Since the test script requires a private key, here's how to test using the frontend:

## Option 1: Modify Contract Temporarily

1. Deploy `RNSBulkManager_TEST_AMOUNTS.sol` which allows setting test amounts
2. Use frontend to register with different amounts
3. Observe which amounts work

## Option 2: Test Directly in Browser Console

You can test `transferAndCall` directly from the browser console:

```javascript
// Connect your wallet first, then run this in console:

// Test parameters
const testName = 'test12345'; // 5+ characters
const testOwner = '0xYourAddress';
const testSecret = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
const testDuration = BigInt(31536000); // 1 year
const testAddr = testOwner;

// Test amounts to try
const testAmounts = [
  BigInt('100000000000000000'), // 0.1 RIF
  BigInt('1000000000000000000'), // 1 RIF
  BigInt('10000000000000000000'), // 10 RIF
];

// For each amount, try registration
for (const amount of testAmounts) {
  console.log(`Testing with ${(Number(amount) / 1e18).toFixed(4)} RIF...`);
  
  // First, commit
  // Then wait 60 seconds
  // Then try transferAndCall with this amount
  
  // This requires implementing the full flow in console
}
```

## Option 3: Use Existing Contract with Different Amounts

Actually, we can't easily change the amount our contract sends without redeploying.

## Recommended: Manual Testing via Frontend

1. **Commit a test domain** (e.g., `test12345.rsk`)
2. **Wait 60+ seconds**
3. **Try to register** - it will use 0.1 RIF
4. **If it fails**, we know 0.1 RIF doesn't work
5. **Then we need to test with higher amounts**

But our contract is hardcoded to use 0.1 RIF. We'd need to:
- Deploy a test version that accepts amount as parameter
- Or modify the contract to use a configurable amount
- Or test directly via RIF token's transferAndCall

## Quick Test: Check if Error Changes

Actually, the easiest test is to see if the error message changes when we try different scenarios. The current error is "Not enough tokens" - but is it really about the amount?

Let's check if it's actually about:
1. Commitment not ready
2. Name format
3. Something else
