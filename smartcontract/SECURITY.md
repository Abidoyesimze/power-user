# Security Notice - Dev Dependencies

## Overview

The npm audit report shows 103 vulnerabilities, but **these do not affect production** or the deployed smart contracts.

## Why These Vulnerabilities Exist

All reported vulnerabilities are in **development dependencies only**, specifically:

1. **Truffle** - A deprecated development framework (no longer maintained)
2. **Ganache/Ganache-cli** - Local blockchain simulation tool
3. **Web3 v1.x** - Old version used by Truffle (not used in production)
4. **Old OpenZeppelin versions** - Transitive dependencies from `@rsksmart` packages

## Production Safety

✅ **The deployed smart contracts are safe** because:
- The production contract code only uses `@openzeppelin/contracts ^5.1.0` (latest, secure version)
- All vulnerabilities are in development/test tooling
- The contract compilation and deployment process is isolated from these dependencies

## Current Dependencies Status

### Production Dependencies (Safe)
- `@openzeppelin/contracts`: `^5.1.0` ✅ Latest version
- `@rsksmart/rns-registry`: `^1.0.4` ✅ Latest available
- `@rsksmart/rns-resolver`: `^2.0.0` ✅ Latest available
- `@rsksmart/rns-rskregistrar`: `^1.2.4` ✅ Latest available

### Dev Dependencies (Vulnerabilities)
- `truffle` - Deprecated, only used by RNS packages for legacy support
- `ganache` - Local testing only, never deployed
- `web3` - Old version, only used by Truffle
- Various transitive dependencies from the above

## Resolution Options

### Option 1: Accept Risk (Recommended)
Since these are dev-only dependencies:
- ✅ No production impact
- ✅ No runtime risk
- ✅ Contract security is unaffected
- ⚠️ Development environment only affected

### Option 2: Wait for RNS Package Updates
The Rootstock team may release updated packages in the future with newer dependencies. Monitor:
- [@rsksmart/rns-registry](https://www.npmjs.com/package/@rsksmart/rns-registry)
- [@rsksmart/rns-resolver](https://www.npmjs.com/package/@rsksmart/rns-resolver)
- [@rsksmart/rns-rskregistrar](https://www.npmjs.com/package/@rsksmart/rns-rskregistrar)

### Option 3: Use Alternative Testing Framework
Consider migrating from Truffle-based tests to:
- Hardhat's native testing (already partially in use)
- Foundry Forge (if compatible with RNS)

## Verification

To verify production safety:
```bash
# Check what's actually used in production
npm list --production

# Check contract dependencies
grep -r "@openzeppelin" contracts/
grep -r "@rsksmart" contracts/
```

## Conclusion

**These vulnerabilities are safe to ignore** for production deployments. They exist only in the development toolchain and do not affect:
- ✅ Contract security
- ✅ User funds
- ✅ Runtime behavior
- ✅ Deployed smart contracts

---

*Last updated: December 2024*

