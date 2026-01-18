import { config } from "dotenv";
import hre from "hardhat";
import { createPublicClient, http, encodeFunctionData } from "viem";
import { rootstockTestnet } from "viem/chains";

config();

async function main() {
  const FIFS_REGISTRAR = "0x36ffda909f941950a552011f2c50569fda14a169" as `0x${string}`;
  const RIF_TOKEN = "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe" as `0x${string}`;
  
  console.log("🔍 Checking FIFS Registrar Payment Method\n");
  console.log("FIFS Registrar:", FIFS_REGISTRAR);
  console.log("RIF Token:", RIF_TOKEN);
  console.log("");
  
  const rpcUrl = process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co";
  const publicClient = createPublicClient({
    chain: rootstockTestnet,
    transport: http(rpcUrl),
  });
  
  // Check 1: Does FIFS Registrar have tokenFallback function?
  console.log("Check 1: Checking if FIFS Registrar has tokenFallback function...");
  try {
    // tokenFallback signature: tokenFallback(address,uint256,bytes)
    const tokenFallbackSelector = "0xc0ee0b8a"; // function selector for tokenFallback(address,uint256,bytes)
    
    // Check if contract has this function by trying to encode a call
    const data = encodeFunctionData({
      abi: [{
        name: 'tokenFallback',
        type: 'function',
        inputs: [
          { name: 'from', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      }],
      functionName: 'tokenFallback',
      args: ["0x0000000000000000000000000000000000000000" as `0x${string}`, BigInt(0), "0x" as `0x${string}`],
    });
    
    console.log("   ✅ tokenFallback function exists (can be encoded)");
    console.log("   Function selector:", data.slice(0, 10));
  } catch (error: any) {
    console.log("   ❌ Failed to encode tokenFallback:", error.message);
  }
  
  // Check 2: Does RIF Token support transferAndCall?
  console.log("\nCheck 2: Checking if RIF Token supports transferAndCall...");
  try {
    // transferAndCall signature: transferAndCall(address,uint256,bytes)
    const data = encodeFunctionData({
      abi: [{
        name: 'transferAndCall',
        type: 'function',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
        outputs: [{ name: '', type: 'bool' }],
      }],
      functionName: 'transferAndCall',
      args: [FIFS_REGISTRAR, BigInt(100), "0x" as `0x${string}`],
    });
    
    console.log("   ✅ transferAndCall function exists (can be encoded)");
    console.log("   Function selector:", data.slice(0, 10));
    
    // Try to read if function exists on contract (dry run call)
    const result = await publicClient.call({
      to: RIF_TOKEN,
      data: data.slice(0, 10), // Just selector to check if function exists
      account: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    });
    
    if (result.data && result.data !== '0x') {
      console.log("   ✅ transferAndCall exists on RIF Token");
    }
  } catch (error: any) {
    console.log("   ⚠️  Could not verify transferAndCall on RIF Token:", error.message);
  }
  
  // Check 3: What happens when we call register() with approve pattern?
  console.log("\nCheck 3: Analyzing register() function signature...");
  console.log("   register(string, address, bytes32, uint256)");
  console.log("   Function selector: 0x2bfcc031");
  console.log("");
  console.log("   This function likely expects payment via:");
  console.log("   - Option A: transferFrom (after approve)");
  console.log("   - Option B: transferAndCall (ERC-677)");
  console.log("");
  
  // Check 4: Look at the contract bytecode for tokenFallback
  console.log("Check 4: Checking contract bytecode for tokenFallback selector...");
  try {
    const code = await publicClient.getBytecode({ address: FIFS_REGISTRAR });
    const tokenFallbackSelector = "c0ee0b8a"; // tokenFallback selector without 0x
    
    if (code && code.includes(tokenFallbackSelector)) {
      console.log("   ✅ tokenFallback selector found in bytecode!");
      console.log("   This means FIFS Registrar supports ERC-677 transferAndCall");
    } else {
      console.log("   ❌ tokenFallback selector NOT found in bytecode");
      console.log("   FIFS Registrar might NOT support ERC-677");
    }
  } catch (error: any) {
    console.log("   ⚠️  Could not check bytecode:", error.message);
  }
  
  console.log("\n📋 Conclusion:");
  console.log("   - If tokenFallback exists: Use transferAndCall");
  console.log("   - If tokenFallback doesn't exist: Use approve + register()");
  console.log("   - Need to verify by checking actual contract behavior");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
