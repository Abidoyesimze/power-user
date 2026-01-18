import { keccak256, toBytes, concat } from "viem";

// Basic FIFS register signature: register(string,address,bytes32,uint256)
const sig = keccak256(toBytes("register(string,address,bytes32,uint256)"));
console.log("register(string,address,bytes32,uint256) selector:", sig.slice(0, 10));

// This should be 0x2bfcc031 (what we verified earlier)
// When calling via transferAndCall, the tokenFallback receives this selector
// as the first 4 bytes of the data parameter

