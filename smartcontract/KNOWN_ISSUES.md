# Known Issues

## FIFS Registrar Price Bug on RSK Testnet

### Issue
The FIFS Registrar contract on RSK Testnet has a critical bug in its `price` function that makes domain registration impossible.

### Details
- **Contract**: `0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d`
- **Function**: `price(string name, uint256 expires, uint256 duration)`
- **Bug**: Returns `duration + 2` RIF instead of actual price
- **Impact**: Makes registration impossible (e.g., 1 year = 31.5 million RIF)

### Example
```solidity
price("simze", 0, 31536000) // 1 year
// Returns: 31,536,002 RIF (should be ~0.01-1 RIF)
```

### Workaround
Our contract (`RNSBulkManager`) includes:
- Price validation with 10 RIF maximum cap
- Clear error messages when price exceeds cap
- Prevents users from attempting impossible transactions

### Status
- ✅ Documented
- ✅ Workaround implemented
- ⏳ Awaiting fix from Rootstock team

### Related Files
- `smartcontract/FIFS_REGISTRAR_PRICE_ISSUE.md` - Detailed analysis
- `smartcontract/contracts/RNSBulkManager.sol` - Workaround implementation

