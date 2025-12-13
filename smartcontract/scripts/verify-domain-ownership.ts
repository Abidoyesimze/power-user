import { config } from "dotenv";
import hre from "hardhat";
import { namehash } from "viem";

config();

async function main() {
  console.log("🔍 Verifying Domain Ownership\n");

  const network = await hre.network;
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  if (!deployer) {
    throw new Error("No wallet found");
  }

  const deployerAddress = deployer.account.address;
  console.log("👤 Your Wallet Address:", deployerAddress);

  // Contract addresses
  const RNS_REGISTRY = "0x7d284aaac6e925aad802a53c0c69efe3764597b8";
  const RNS_BULK_MANAGER = "0xdd190753dd92104de84555892344c05b9c009577";

  // Test domain (change this to a domain you registered)
  const testDomain = "simze"; // Domain name without .rsk
  const testDomainFull = `${testDomain}.rsk`;
  const node = namehash(testDomainFull);

  console.log("\n📋 Domain Information:");
  console.log("  Domain:", testDomainFull);
  console.log("  Node (namehash):", node);

  // Check RNS Registry Owner
  console.log("\n🔐 Step 1: Checking RNS Registry Owner...");
  try {
    const owner = await publicClient.readContract({
      address: RNS_REGISTRY as `0x${string}`,
      abi: [
        {
          inputs: [{ name: "node", type: "bytes32" }],
          name: "owner",
          outputs: [{ name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ] as const,
      functionName: "owner",
      args: [node],
    });

    console.log("  ✅ Registry Owner:", owner);

    if (owner === "0x0000000000000000000000000000000000000000") {
      console.log("  ❌ Domain is NOT registered (owner is zero address)");
      console.log("  💡 This domain has not been registered yet");
    } else if (owner.toLowerCase() === deployerAddress.toLowerCase()) {
      console.log("  ✅ SUCCESS: Domain is registered and YOU are the owner!");
      console.log("  ✅ Domain is linked to your wallet address");
    } else {
      console.log("  ⚠️  Domain is registered but owned by a different address:");
      console.log("  Owner:", owner);
      console.log("  Your Address:", deployerAddress);
      console.log("  ❌ Domain is NOT linked to your wallet");
    }
  } catch (error) {
    console.error("  ❌ Error checking owner:", error);
  }

  // Check Resolver
  console.log("\n🔗 Step 2: Checking Domain Resolver...");
  try {
    const resolver = await publicClient.readContract({
      address: RNS_REGISTRY as `0x${string}`,
      abi: [
        {
          inputs: [{ name: "node", type: "bytes32" }],
          name: "resolver",
          outputs: [{ name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ] as const,
      functionName: "resolver",
      args: [node],
    });

    console.log("  ✅ Resolver:", resolver);
    if (resolver !== "0x0000000000000000000000000000000000000000") {
      console.log("  ✅ Domain has a resolver set");
    } else {
      console.log("  ⚠️  Domain has no resolver set");
    }
  } catch (error) {
    console.error("  ❌ Error checking resolver:", error);
  }

  // Check Address Record (if resolver is set)
  console.log("\n📍 Step 3: Checking Domain Address Record...");
  try {
    const resolver = await publicClient.readContract({
      address: RNS_REGISTRY as `0x${string}`,
      abi: [
        {
          inputs: [{ name: "node", type: "bytes32" }],
          name: "resolver",
          outputs: [{ name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ] as const,
      functionName: "resolver",
      args: [node],
    });

    if (resolver !== "0x0000000000000000000000000000000000000000") {
      const addr = await publicClient.readContract({
        address: resolver as `0x${string}`,
        abi: [
          {
            inputs: [{ name: "node", type: "bytes32" }],
            name: "addr",
            outputs: [{ name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
          },
        ] as const,
        functionName: "addr",
        args: [node],
      });

      console.log("  ✅ Domain Address:", addr);
      if (addr.toLowerCase() === deployerAddress.toLowerCase()) {
        console.log("  ✅ Domain resolves to your wallet address");
      } else {
        console.log("  ⚠️  Domain resolves to a different address:", addr);
      }
    } else {
      console.log("  ⚠️  Cannot check address - no resolver set");
    }
  } catch (error) {
    console.error("  ❌ Error checking address:", error);
  }

  console.log("\n✅ Verification completed!");
  console.log("\n💡 Summary:");
  console.log("  - If owner = your address: Domain is registered and YOU own it");
  console.log("  - If owner = zero address: Domain is NOT registered");
  console.log("  - If owner = different address: Domain is registered by someone else");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

