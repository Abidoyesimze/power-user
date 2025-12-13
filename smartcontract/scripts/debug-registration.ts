import { config } from "dotenv";
import hre from "hardhat";
import { parseUnits, formatUnits, getAddress } from "viem";

config();

async function main() {
  console.log("🔍 RNS Registration Debug Script\n");

  // Get network and viem
  const network = await hre.network;
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  if (!deployer) {
    throw new Error("No wallet found");
  }

  const deployerAddress = deployer.account.address;
  console.log("👤 Deployer Address:", deployerAddress);

  // Contract addresses - Use new deployment
  const RNS_BULK_MANAGER = "0xbf1b2ca2cc17bd98679d584575d549c62b3214eb";
  const RNS_REGISTRY = "0x7d284aaac6e925aad802a53c0c69efe3764597b8";
  const FIFS_REGISTRAR = "0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d";
  const RIF_TOKEN = "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe";

  console.log("\n📋 Contract Addresses:");
  console.log("  RNS Bulk Manager:", RNS_BULK_MANAGER);
  console.log("  RNS Registry:", RNS_REGISTRY);
  console.log("  FIFS Registrar:", FIFS_REGISTRAR);
  console.log("  RIF Token:", RIF_TOKEN);

  // Test domain
  const testDomain = "simze"; // Domain name without .rsk
  const testDuration = BigInt(365 * 24 * 60 * 60); // 1 year in seconds
  const emptySecret = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

  console.log("\n🧪 Test Parameters:");
  console.log("  Domain:", testDomain);
  console.log("  Duration:", testDuration.toString(), "seconds (1 year)");
  console.log("  Owner:", deployerAddress);

  // Step 1: Check RIF token balance
  console.log("\n📊 Step 1: Checking RIF Token Balance...");
  try {
    const rifTokenAbi = [
      {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ] as const;

    const balance = await publicClient.readContract({
      address: RIF_TOKEN as `0x${string}`,
      abi: rifTokenAbi,
      functionName: "balanceOf",
      args: [deployerAddress],
    });

    const balanceFormatted = formatUnits(balance as bigint, 18);
    console.log("  ✅ RIF Balance:", balanceFormatted, "RIF");

    if (balance === BigInt(0)) {
      console.log("  ❌ ERROR: No RIF tokens! You need RIF tokens to register domains.");
      return;
    }

    // Check allowance
    const allowance = await publicClient.readContract({
      address: RIF_TOKEN as `0x${string}`,
      abi: rifTokenAbi,
      functionName: "allowance",
      args: [deployerAddress, RNS_BULK_MANAGER as `0x${string}`],
    });

    const allowanceFormatted = formatUnits(allowance as bigint, 18);
    console.log("  ✅ Allowance for Bulk Manager:", allowanceFormatted, "RIF");
  } catch (error) {
    console.error("  ❌ Error checking RIF balance:", error);
    return;
  }

  // Step 2: Check domain availability
  console.log("\n📋 Step 2: Checking Domain Availability...");
  try {
    const fifsRegistrarAbi = [
      {
        inputs: [{ name: "name", type: "string" }],
        name: "available",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
    ] as const;

    try {
      const available = await publicClient.readContract({
        address: FIFS_REGISTRAR as `0x${string}`,
        abi: fifsRegistrarAbi,
        functionName: "available",
        args: [testDomain],
      });
      console.log("  ✅ FIFS Registrar - Available:", available);
      if (!available) {
        console.log("  ❌ ERROR: Domain is not available in FIFS registrar!");
        return;
      }
    } catch (fifsError: any) {
      console.log("  ⚠️  FIFS registrar 'available' function not found or reverted");
      console.log("  Error:", fifsError.message);
    }

    // Check registry owner
    const registryAbi = [
      {
        inputs: [{ name: "node", type: "bytes32" }],
        name: "owner",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
    ] as const;

    const { namehash } = await import("viem");
    const node = namehash(`${testDomain}.rsk`);

    const owner = await publicClient.readContract({
      address: RNS_REGISTRY as `0x${string}`,
      abi: registryAbi,
      functionName: "owner",
      args: [node],
    });

    console.log("  ✅ Registry Owner:", owner);
    if (owner !== "0x0000000000000000000000000000000000000000") {
      console.log("  ❌ ERROR: Domain is already registered in registry!");
      return;
    }
  } catch (error) {
    console.error("  ❌ Error checking availability:", error);
    return;
  }

  // Step 3: Calculate registration cost
  console.log("\n💰 Step 3: Calculating Registration Cost...");
  try {
    const bulkManagerAbi = [
      {
        inputs: [
          { name: "names", type: "string[]" },
          { name: "durations", type: "uint256[]" },
        ],
        name: "calculateRegistrationCost",
        outputs: [{ name: "totalCost", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ] as const;

    const totalCost = await publicClient.readContract({
      address: RNS_BULK_MANAGER as `0x${string}`,
      abi: bulkManagerAbi,
      functionName: "calculateRegistrationCost",
      args: [[testDomain], [testDuration]],
    });

    const costFormatted = formatUnits(totalCost as bigint, 18);
    console.log("  ✅ Total Cost:", costFormatted, "RIF");
    console.log("  ✅ Total Cost (wei):", totalCost.toString());

    // Check if balance is sufficient
    const balance = await publicClient.readContract({
      address: RIF_TOKEN as `0x${string}`,
      abi: [
        {
          inputs: [{ name: "account", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ] as const,
      functionName: "balanceOf",
      args: [deployerAddress],
    });

    if (balance < (totalCost as bigint)) {
      console.log("  ⚠️  WARNING: Insufficient RIF balance!");
      console.log("  Required:", costFormatted, "RIF");
      console.log("  Available:", formatUnits(balance as bigint, 18), "RIF");
      console.log("  💡 Continuing to check other potential issues...");
      // Don't return - continue to check other things
    }
  } catch (error: any) {
    console.error("  ❌ Error calculating cost:", error);
    console.error("  Error details:", error.message);
    if (error.cause) {
      console.error("  Cause:", error.cause);
    }
    return;
  }

  // Step 4: Check FIFS registrar price directly
  console.log("\n💵 Step 4: Checking FIFS Registrar Price Directly...");
  try {
    const fifsPriceAbi = [
      {
        inputs: [
          { name: "name", type: "string" },
          { name: "expires", type: "uint256" },
          { name: "duration", type: "uint256" },
        ],
        name: "price",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ] as const;

    const price = await publicClient.readContract({
      address: FIFS_REGISTRAR as `0x${string}`,
      abi: fifsPriceAbi,
      functionName: "price",
      args: [testDomain, BigInt(0), testDuration], // expires = 0 for new registration
    });

    const priceFormatted = formatUnits(price as bigint, 18);
    console.log("  ✅ FIFS Registrar Price:", priceFormatted, "RIF");
    console.log("  ✅ FIFS Registrar Price (wei):", price.toString());
  } catch (error: any) {
    console.error("  ❌ Error getting FIFS price:", error);
    console.error("  Error message:", error.message);
    if (error.cause) {
      console.error("  Cause:", error.cause);
    }
  }

  // Step 5: Check if approval is needed
  console.log("\n🔐 Step 5: Checking Token Approval...");
  try {
    const allowance = await publicClient.readContract({
      address: RIF_TOKEN as `0x${string}`,
      abi: [
        {
          inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
          ],
          name: "allowance",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ] as const,
      functionName: "allowance",
      args: [deployerAddress, RNS_BULK_MANAGER as `0x${string}`],
    });

    const totalCost = await publicClient.readContract({
      address: RNS_BULK_MANAGER as `0x${string}`,
      abi: [
        {
          inputs: [
            { name: "names", type: "string[]" },
            { name: "durations", type: "uint256[]" },
          ],
          name: "calculateRegistrationCost",
          outputs: [{ name: "totalCost", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ] as const,
      functionName: "calculateRegistrationCost",
      args: [[testDomain], [testDuration]],
    });

    console.log("  ✅ Current Allowance:", formatUnits(allowance as bigint, 18), "RIF");
    console.log("  ✅ Required Amount:", formatUnits(totalCost as bigint, 18), "RIF");

    if (allowance < (totalCost as bigint)) {
      console.log("  ⚠️  WARNING: Insufficient allowance! Approval needed.");
      console.log("  💡 The contract will try to transfer tokens, but approval might be required first.");
    } else {
      console.log("  ✅ Allowance is sufficient");
    }
  } catch (error) {
    console.error("  ❌ Error checking approval:", error);
  }

  // Step 6: Attempt registration with detailed error handling
  console.log("\n🚀 Step 6: Attempting Registration...");
  try {
    const bulkManagerAbi = [
      {
        inputs: [
          {
            components: [
              { name: "name", type: "string" },
              { name: "owner", type: "address" },
              { name: "secret", type: "bytes32" },
              { name: "duration", type: "uint256" },
              { name: "addr", type: "address" },
            ],
            name: "requests",
            type: "tuple[]",
          },
        ],
        name: "bulkRegister",
        outputs: [
          {
            components: [
              { name: "success", type: "bool" },
              { name: "index", type: "uint256" },
              { name: "errorMessage", type: "string" },
            ],
            name: "",
            type: "tuple[]",
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
      },
    ] as const;

    const request = {
      name: testDomain,
      owner: deployerAddress as `0x${string}`,
      secret: emptySecret,
      duration: testDuration,
      addr: deployerAddress as `0x${string}`,
    };

    console.log("  📝 Registration Request:", {
      name: request.name,
      owner: request.owner,
      duration: request.duration.toString(),
      addr: request.addr,
    });

    // First, ensure we have approval
    console.log("  🔐 Ensuring token approval...");
    const totalCost = await publicClient.readContract({
      address: RNS_BULK_MANAGER as `0x${string}`,
      abi: [
        {
          inputs: [
            { name: "names", type: "string[]" },
            { name: "durations", type: "uint256[]" },
          ],
          name: "calculateRegistrationCost",
          outputs: [{ name: "totalCost", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ] as const,
      functionName: "calculateRegistrationCost",
      args: [[testDomain], [testDuration]],
    });

    const allowance = await publicClient.readContract({
      address: RIF_TOKEN as `0x${string}`,
      abi: [
        {
          inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
          ],
          name: "allowance",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ] as const,
      functionName: "allowance",
      args: [deployerAddress, RNS_BULK_MANAGER as `0x${string}`],
    });

    if (allowance < (totalCost as bigint)) {
      console.log("  📝 Approving RIF tokens...");
      const approveHash = await deployer.writeContract({
        address: RIF_TOKEN as `0x${string}`,
        abi: [
          {
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            name: "approve",
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ] as const,
        functionName: "approve",
        args: [RNS_BULK_MANAGER as `0x${string}`, totalCost as bigint],
      });

      console.log("  ⏳ Waiting for approval transaction...");
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log("  ✅ Approval confirmed!");
    }

    console.log("  📤 Sending registration transaction...");
    const hash = await deployer.writeContract({
      address: RNS_BULK_MANAGER as `0x${string}`,
      abi: bulkManagerAbi,
      functionName: "bulkRegister",
      args: [[request]],
    });

    console.log("  📤 Transaction Hash:", hash);
    console.log("  ⏳ Waiting for confirmation...");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log("  ✅ Registration successful!");
      console.log("  📦 Block Number:", receipt.blockNumber.toString());
      
      // Decode events if any
      if (receipt.logs && receipt.logs.length > 0) {
        console.log("  📋 Events:", receipt.logs.length);
      }
    } else {
      console.log("  ❌ Transaction failed!");
    }
  } catch (error: any) {
    console.error("\n  ❌ Registration Error:");
    console.error("  Message:", error.message);
    
    if (error.cause) {
      console.error("  Cause:", error.cause);
    }
    
    if (error.data) {
      console.error("  Data:", error.data);
    }
    
    if (error.shortMessage) {
      console.error("  Short Message:", error.shortMessage);
    }

    // Try to decode revert reason if available
    if (error.data && typeof error.data === 'string' && error.data.startsWith('0x')) {
      console.error("  Revert Data:", error.data);
    }
  }

  console.log("\n✅ Debug script completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

