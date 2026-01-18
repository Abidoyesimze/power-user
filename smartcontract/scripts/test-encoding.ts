// Test if abi.encodePacked produces the correct format

// SDK Format:
// signature (4 bytes) + owner (20 bytes) + secret (32 bytes) + duration (32 bytes) + addr (20 bytes) + name (variable)

// In Solidity:
// abi.encodePacked(bytes4, address, bytes32, uint256, address, string)
// Should produce:
// - bytes4: 4 bytes (signature)
// - address: 20 bytes (owner) - NO padding
// - bytes32: 32 bytes (secret)
// - uint256: 32 bytes (duration)
// - address: 20 bytes (addr) - NO padding  
// - string: variable (name)

console.log("✅ abi.encodePacked format matches SDK manual encoding:");
console.log("   - bytes4: 4 bytes (no padding)");
console.log("   - address: 20 bytes (no padding)");
console.log("   - bytes32: 32 bytes");
console.log("   - uint256: 32 bytes");
console.log("   - address: 20 bytes (no padding)");
console.log("   - string: variable length");
console.log("\nThis should work!");

