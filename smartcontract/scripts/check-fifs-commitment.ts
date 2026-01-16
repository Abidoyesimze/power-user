import { config } from "dotenv";
import hre from "hardhat";
import { keccak256, toBytes } from "viem";

config();

async function main() {
  console.log("🔍 Checking FIFS Registrar Commit-Reveal Requirements\n");

  const network = await hre.network;
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  if (!deployer) {
    throw new Error("No wallet found");
  }

  const deployerAddress = deployer.account.address;
  const FIFS_REGISTRAR = "0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d";

  console.log("👤 Your Wallet:", deployerAddress);
  console.log("📋 FIFS Registrar:", FIFS_REGISTRAR);
  console.log("");

  const fifsAbi = [
    {
      inputs: [],
      name: "minCommitmentAge",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { name: "label", type: "bytes32" },
        { name: "nameOwner", type: "address" },
        { name: "secret", type: "bytes32" },
      ],
      name: "makeCommitment",
      outputs: [{ name: "", type: "bytes32" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ name: "commitment", type: "bytes32" }],
      name: "canReveal",
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  // Check minCommitmentAge
  console.log("📊 Step 1: Checking minCommitmentAge...");
  try {
    const minAge = await publicClient.readContract({
      address: FIFS_REGISTRAR as `0x${string}`,
      abi: fifsAbi,
      functionName: "minCommitmentAge",
    });
    console.log("  ✅ minCommitmentAge:", minAge.toString(), "seconds");
    console.log("  ✅ minCommitmentAge:", (Number(minAge) / 60).toFixed(2), "minutes");
    
    if (minAge === BigInt(0)) {
      console.log("  ✅ Can commit and register in the same transaction!");
    } else {
      console.log("  ⚠️  Need to wait", minAge.toString(), "seconds between commit and register");
      console.log("  ⚠️  Cannot commit and register in the same transaction");
    }
  } catch (error) {
    console.error("  ❌ Error:", error);
  }

  // Test making a commitment
  console.log("\n📝 Step 2: Testing Commitment Creation...");
  const testDomain = "simze";
  const testSecret = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
  
  try {
    const label = keccak256(toBytes(testDomain));
    const commitment = await publicClient.readContract({
      address: FIFS_REGISTRAR as `0x${string}`,
      abi: fifsAbi,
      functionName: "makeCommitment",
      args: [label, deployerAddress as `0x${string}`, testSecret],
    });
    
    console.log("  ✅ Commitment created:", commitment);
    console.log("  ✅ Label (keccak256 of domain):", label);
    
    // Check if we can reveal
    const canReveal = await publicClient.readContract({
      address: FIFS_REGISTRAR as `0x${string}`,
      abi: fifsAbi,
      functionName: "canReveal",
      args: [commitment],
    });
    
    console.log("  ✅ Can reveal now:", canReveal);
    
    if (!canReveal) {
      console.log("  ⚠️  Commitment exists but cannot reveal yet (need to wait)");
    }
  } catch (error) {
    console.error("  ❌ Error:", error);
  }

  console.log("\n✅ Check completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });






