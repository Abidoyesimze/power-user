import { config } from "dotenv";
import hre from "hardhat";
import { createPublicClient, http, keccak256, encodePacked, encodeFunctionData, decodeFunctionResult } from "viem";
import { rootstockTestnet } from "viem/chains";

config();

async function main() {
  const DOMAIN_NAME = "mitch"; // Change to your test domain
  const RNS_REGISTRY = "0x7d284aaac6e925aad802a53c0c69efe3764597b8" as `0x${string}`;
  const BULK_MANAGER = "0x3b142ec3b6b328d1037ffcb37b4bf1c9a1a8dce7" as `0x${string}`;
  const USER_ADDRESS = "0x34C775FB2fe2b8383B5659B3f7Fc1E721Ca04A3a" as `0x${string}`;
  
  console.log("🔍 Checking Domain Ownership and Resolver\n");
  console.log("Domain:", DOMAIN_NAME);
  console.log("RNS Registry:", RNS_REGISTRY);
  console.log("BulkManager:", BULK_MANAGER);
  console.log("User Address:", USER_ADDRESS);
  console.log("");
  
  const rpcUrl = process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co";
  const publicClient = createPublicClient({
    chain: rootstockTestnet,
    transport: http(rpcUrl),
  });
  
  // Calculate node
  const RSK_NODE = keccak256(encodePacked(["bytes32", "bytes32"], [keccak256(new TextEncoder().encode("rsk") as `0x${string}`), "0x0000000000000000000000000000000000000000000000000000000000000000"]));
  const label = keccak256(new TextEncoder().encode(DOMAIN_NAME) as `0x${string}`);
  const node = keccak256(encodePacked(["bytes32", "bytes32"], [RSK_NODE, label]));
  
  console.log("Node:", node);
  console.log("");
  
  // Check owner
  try {
    const ownerData = encodeFunctionData({
      abi: [{ name: 'owner', type: 'function', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' }],
      functionName: 'owner',
      args: [node],
    });
    
    const ownerResult = await publicClient.call({
      to: RNS_REGISTRY,
      data: ownerData,
    });
    
    if (ownerResult.data && ownerResult.data !== '0x') {
      const owner = decodeFunctionResult({
        abi: [{ name: 'owner', type: 'function', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' }],
        functionName: 'owner',
        data: ownerResult.data,
      }) as `0x${string}`;
      
      console.log("✅ Domain Owner:", owner);
      console.log("   Is BulkManager:", owner.toLowerCase() === BULK_MANAGER.toLowerCase());
      console.log("   Is User:", owner.toLowerCase() === USER_ADDRESS.toLowerCase());
    }
  } catch (error: any) {
    console.log("❌ Failed to get owner:", error.message);
  }
  
  // Check resolver
  try {
    const resolverData = encodeFunctionData({
      abi: [{ name: 'resolver', type: 'function', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' }],
      functionName: 'resolver',
      args: [node],
    });
    
    const resolverResult = await publicClient.call({
      to: RNS_REGISTRY,
      data: resolverData,
    });
    
    if (resolverResult.data && resolverResult.data !== '0x') {
      const resolver = decodeFunctionResult({
        abi: [{ name: 'resolver', type: 'function', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' }],
        functionName: 'resolver',
        data: resolverResult.data,
      }) as `0x${string}`;
      
      console.log("✅ Resolver:", resolver);
      console.log("   Is set:", resolver !== "0x0000000000000000000000000000000000000000");
    }
  } catch (error: any) {
    console.log("❌ Failed to get resolver:", error.message);
  }
  
  console.log("\n📋 Conclusion:");
  console.log("   If owner = User AND resolver = 0x0000...0000:");
  console.log("   → BulkManager cannot set resolver (not the owner)");
  console.log("   → Need to fix contract to set resolver as owner");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
