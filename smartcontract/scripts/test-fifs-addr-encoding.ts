import { keccak256, toBytes, encodePacked, encodeFunctionData } from "viem";

// Test encoding for FIFS Addr Registrar
const owner = "0x34C775FB2fe2b8383B5659B3f7Fc1E721Ca04A3a";
const secret = "0x0000000000000000000000000000000000000000000000000000000000000000";
const duration = BigInt(31536000);
const addr = "0x34C775FB2fe2b8383B5659B3f7Fc1E721Ca04A3a";
const name = "test";

// According to OFFICIAL_SDK_ANALYSIS.md:
// signature (4 bytes): 0x5f7b99d5
// owner (20 bytes)
// secret (32 bytes)
// duration (32 bytes)
// addr (20 bytes)
// name (variable size)

console.log("Testing FIFS Addr Registrar encoding...\n");
console.log("Signature: 0x5f7b99d5");
console.log("Owner:", owner);
console.log("Secret:", secret);
console.log("Duration:", duration.toString());
console.log("Addr:", addr);
console.log("Name:", name);

// Try encoding with abi.encodeWithSelector
// But wait - this won't work because it expects function signature format
// We need manual encoding like the SDK does

// The SDK does manual encoding:
// const data = `${_signature}${_owner}${_secret}${_duration}${_addr}${_name}`

// In Solidity, we need to manually encode:
// bytes4(0x5f7b99d5) + abi.encode(owner, secret, duration, addr, name)

console.log("\n⚠️  Note: FIFS Addr Registrar encoding is MANUAL (not standard ABI encoding)");
console.log("   Need to manually encode: signature + owner + secret + duration + addr + name");

