import { config } from "dotenv";
import hre from "hardhat";
import { encodeFunctionData, createPublicClient, http, decodeFunctionResult } from "viem";
import { rootstockTestnet } from "viem/chains";

config();

async function main() {
  const BASIC_FIFS = "0x36ffda909f941950a552011f2c50569fda14a169" as `0x${string}`;
  
  console.log("🔍 Verifying Basic FIFS Registrar Signature\n");
  console.log("Address:", BASIC_FIFS);
  console.log("Explorer: https://explorer.testnet.rootstock.io/address/" + BASIC_FIFS + "\n");
  
  // Get RPC URL from hardhat config or env
  const rpcUrl = process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co";
  console.log("RPC URL:", rpcUrl);
  const publicClient = createPublicClient({
    chain: rootstockTestnet,
    transport: http(rpcUrl),
  });
  
  // Test 1: Try to read minCommitmentAge (should exist)
  console.log("Test 1: Reading minCommitmentAge...");
  try {
    const data = encodeFunctionData({
      abi: [{
        name: 'minCommitmentAge',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
      }],
      functionName: 'minCommitmentAge',
    });
    
    const result = await publicClient.call({
      to: BASIC_FIFS,
      data,
    });
    
    if (result.data && result.data !== '0x') {
      const decoded = decodeFunctionResult({
        abi: [{
          name: 'minCommitmentAge',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'uint256' }],
        }],
        functionName: 'minCommitmentAge',
        data: result.data,
      });
      console.log("✅ minCommitmentAge exists, value:", decoded.toString());
    } else {
      console.log("❌ No data returned (function might not exist or call reverted)");
    }
  } catch (error: any) {
    console.log("❌ Failed:", error.message);
  }
  
  // Test 2: Try to call makeCommitment (pure function)
  console.log("\nTest 2: Testing makeCommitment (pure function)...");
  try {
    const keccak256Hash = await publicClient.keccak256(
      new TextEncoder().encode("test") as `0x${string}`
    );
    const owner = "0x34C775FB2fe2b8383B5659B3f7Fc1E721Ca04A3a" as `0x${string}`;
    const secret = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
    
    const data = encodeFunctionData({
      abi: [{
        name: 'makeCommitment',
        type: 'function',
        stateMutability: 'pure',
        inputs: [
          { name: 'label', type: 'bytes32' },
          { name: 'nameOwner', type: 'address' },
          { name: 'secret', type: 'bytes32' },
        ],
        outputs: [{ name: '', type: 'bytes32' }],
      }],
      functionName: 'makeCommitment',
      args: [keccak256Hash, owner, secret],
    });
    
    const result = await publicClient.call({
      to: BASIC_FIFS,
      data,
    });
    
    if (result.data && result.data !== '0x') {
      const decoded = decodeFunctionResult({
        abi: [{
          name: 'makeCommitment',
          type: 'function',
          stateMutability: 'pure',
          inputs: [
            { name: 'label', type: 'bytes32' },
            { name: 'nameOwner', type: 'address' },
            { name: 'secret', type: 'bytes32' },
          ],
          outputs: [{ name: '', type: 'bytes32' }],
        }],
        functionName: 'makeCommitment',
        data: result.data,
      });
      console.log("✅ makeCommitment (3 params) works, result:", decoded);
    } else {
      console.log("❌ No data returned");
    }
  } catch (error: any) {
    console.log("❌ Failed:", error.message);
  }
  
  // Test 3: Try to read price function with 2 params (if exists)
  console.log("\nTest 3: Testing price(string, uint256) - 2 params...");
  try {
    const result = await publicClient.call({
      to: BASIC_FIFS,
      data: encodeFunctionData({
        abi: [{
          name: 'price',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'name', type: 'string' },
            { name: 'duration', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'uint256' }],
        }],
        functionName: 'price',
        args: ["test", BigInt(31536000)],
      }),
    });
    console.log("✅ price(string, uint256) exists, result:", result);
  } catch (error: any) {
    console.log("❌ Failed:", error.message);
  }
  
  // Test 4: Try to read price function with 3 params (expires param)
  console.log("\nTest 4: Testing price(string, uint256, uint256) - 3 params...");
  try {
    const result = await publicClient.call({
      to: BASIC_FIFS,
      data: encodeFunctionData({
        abi: [{
          name: 'price',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'name', type: 'string' },
            { name: 'expires', type: 'uint256' },
            { name: 'duration', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'uint256' }],
        }],
        functionName: 'price',
        args: ["test", BigInt(0), BigInt(31536000)],
      }),
    });
    console.log("✅ price(string, uint256, uint256) exists, result:", result);
  } catch (error: any) {
    console.log("❌ Failed:", error.message);
  }
  
  // Test 5: Check which register function exists by testing calls
  console.log("\nTest 5: Testing if register() with 4 params exists (dry run)...");
  try {
    const data4 = encodeFunctionData({
      abi: [{
        name: 'register',
        type: 'function',
        inputs: [
          { name: 'name', type: 'string' },
          { name: 'nameOwner', type: 'address' },
          { name: 'secret', type: 'bytes32' },
          { name: 'duration', type: 'uint256' },
        ],
      }],
      functionName: 'register',
      args: ["test", "0x34C775FB2fe2b8383B5659B3f7Fc1E721Ca04A3a" as `0x${string}`, "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`, BigInt(31536000)],
    });
    console.log("   Function selector (4 params):", data4.slice(0, 10));
    
    // Try to call it (will fail but might tell us if function exists)
    const result4 = await publicClient.call({
      to: BASIC_FIFS,
      data: data4,
    });
    
    if (result4.errorName === 'FunctionDoesNotExistError' || result4.errorName) {
      console.log("   ❌ Function with 4 params might not exist or call failed:", result4.errorName);
    } else {
      console.log("   ✅ Function exists (call might revert due to commitment/payment, but function signature is correct)");
      if (result4.revert?.reason) {
        console.log("   ⚠️  Revert reason:", result4.revert.reason);
      }
    }
  } catch (error: any) {
    console.log("   ❌ Failed:", error.message);
  }
  
  // Test 6: Check if register exists with 5 params
  console.log("\nTest 6: Testing if register() with 5 params exists (dry run)...");
  try {
    const data5 = encodeFunctionData({
      abi: [{
        name: 'register',
        type: 'function',
        inputs: [
          { name: 'name', type: 'string' },
          { name: 'nameOwner', type: 'address' },
          { name: 'secret', type: 'bytes32' },
          { name: 'duration', type: 'uint256' },
          { name: 'addr', type: 'address' },
        ],
      }],
      functionName: 'register',
      args: ["test", "0x34C775FB2fe2b8383B5659B3f7Fc1E721Ca04A3a" as `0x${string}`, "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`, BigInt(31536000), "0x34C775FB2fe2b8383B5659B3f7Fc1E721Ca04A3a" as `0x${string}`],
    });
    console.log("   Function selector (5 params):", data5.slice(0, 10));
    
    // Try to call it (will fail but might tell us if function exists)
    const result5 = await publicClient.call({
      to: BASIC_FIFS,
      data: data5,
    });
    
    if (result5.errorName === 'FunctionDoesNotExistError' || result5.errorName) {
      console.log("   ❌ Function with 5 params might not exist or call failed:", result5.errorName);
    } else {
      console.log("   ✅ Function exists (call might revert due to commitment/payment, but function signature is correct)");
      if (result5.revert?.reason) {
        console.log("   ⚠️  Revert reason:", result5.revert.reason);
      }
    }
  } catch (error: any) {
    console.log("   ❌ Failed:", error.message);
  }
  
  console.log("\n📋 Summary:");
  console.log("   - 4-param register selector: 0x2bfcc031");
  console.log("   - 5-param register selector: 0x57226363");
  console.log("   Check the explorer to see which selector the contract actually has.");
  console.log("   If a call reverts with 'No commitment found' or similar, the function exists!");
  console.log("   If it reverts with 'Function not found', the function doesn't exist.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
