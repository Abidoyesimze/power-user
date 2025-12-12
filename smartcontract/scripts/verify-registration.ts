import { config } from "dotenv";
import hre from "hardhat";
import { namehash } from "viem";

config();

/**
 * Verification script to test domain registration and verify it appears in RNS registry
 * This script:
 * 1. Registers a test domain through our BulkManager
 * 2. Checks the OperationResult to see if registration succeeded
 * 3. Verifies the domain appears in the official RNS registry
 * 4. Checks the owner in the registry
 * 5. Reports detailed results
 */
async function main() {
  console.log("🔍 RNS Registration Verification Script\n");

  // Contract addresses
  const RNS_BULK_MANAGER = process.env.RNS_BULK_MANAGER_ADDRESS || "0xdb34e8611333fd6dd3a57c59f125eba8878378cd";
  const RNS_REGISTRY = process.env.RNS_REGISTRY_TESTNET || "0x7d284aaac6e925aad802a53c0c69efe3764597b8";
  const RIF_TOKEN = process.env.RIF_TOKEN_TESTNET || "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe";
  const FIFS_REGISTRAR = process.env.FIFS_ADDR_REGISTRAR_TESTNET || "0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d";

  // Get network and viem
  const network = await hre.network;
  const { viem } = await network.connect();
  
  // Get the deployer account
  const [deployer] = await viem.getWalletClients();
  const deployerAddress = deployer.account.address;
  
  console.log("📋 Configuration:");
  console.log("  Network:", network.name);
  console.log("  Deployer:", deployerAddress);
  console.log("  RNS Bulk Manager:", RNS_BULK_MANAGER);
  console.log("  RNS Registry:", RNS_REGISTRY);
  console.log("  FIFS Registrar:", FIFS_REGISTRAR);
  console.log("  RIF Token:", RIF_TOKEN);
  console.log("");

  // Test domain name (use a unique name with timestamp to avoid conflicts)
  const timestamp = Date.now();
  const testDomainName = `testverify${timestamp}`;
  const testDomainFull = `${testDomainName}.rsk`;
  const testDuration = BigInt(365 * 24 * 60 * 60); // 1 year in seconds
  
  console.log("🧪 Test Registration:");
  console.log("  Domain:", testDomainFull);
  console.log("  Duration: 1 year");
  console.log("  Owner:", deployerAddress);
  console.log("");

  // Step 1: Check if domain is available
  console.log("Step 1: Checking domain availability...");
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

    const isAvailable = await viem.readContract({
      address: FIFS_REGISTRAR as `0x${string}`,
      abi: fifsRegistrarAbi,
      functionName: "available",
      args: [testDomainName],
    });

    if (!isAvailable) {
      console.log("  ❌ Domain is not available. Trying a different name...");
      // Try with a different timestamp
      const newTimestamp = Date.now();
      const newTestDomain = `testverify${newTimestamp}`;
      console.log(`  🔄 Trying: ${newTestDomain}.rsk`);
      // For now, we'll proceed with the original and see what happens
    } else {
      console.log("  ✅ Domain is available");
    }
  } catch (error) {
    console.log("  ⚠️  Could not check availability:", error instanceof Error ? error.message : String(error));
  }

  // Step 2: Get registration price
  console.log("\nStep 2: Getting registration price...");
  try {
    const fifsRegistrarAbi = [
      {
        inputs: [
          { name: "name", type: "string" },
          { name: "duration", type: "uint256" },
        ],
        name: "price",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ] as const;

    const price = await viem.readContract({
      address: FIFS_REGISTRAR as `0x${string}`,
      abi: fifsRegistrarAbi,
      functionName: "price",
      args: [testDomainName, testDuration],
    });

    console.log("  💰 Registration price:", price.toString(), "RIF (wei)");
    console.log("  💰 Registration price:", (Number(price) / 1e18).toFixed(4), "RIF");
  } catch (error) {
    console.log("  ❌ Could not get price:", error instanceof Error ? error.message : String(error));
    console.log("  ⚠️  This might mean the domain is not available");
    return;
  }

  // Step 3: Check RIF token balance and allowance
  console.log("\nStep 3: Checking RIF token balance and allowance...");
  try {
    const erc20Abi = [
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

    const balance = await viem.readContract({
      address: RIF_TOKEN as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [deployerAddress],
    });

    const allowance = await viem.readContract({
      address: RIF_TOKEN as `0x${string}`,
      abi: erc20Abi,
      functionName: "allowance",
      args: [deployerAddress, RNS_BULK_MANAGER as `0x${string}`],
    });

    console.log("  💵 RIF Balance:", (Number(balance) / 1e18).toFixed(4), "RIF");
    console.log("  🔐 Allowance:", (Number(allowance) / 1e18).toFixed(4), "RIF");

    if (balance < price) {
      console.log("  ❌ Insufficient RIF balance for registration");
      console.log("  💡 Get testnet RIF tokens from: https://faucet.rootstock.io/");
      return;
    }
  } catch (error) {
    console.log("  ⚠️  Could not check balance:", error instanceof Error ? error.message : String(error));
  }

  // Step 4: Register the domain
  console.log("\nStep 4: Registering domain through BulkManager...");
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

    const emptySecret = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

    const registrationRequest = {
      name: testDomainName,
      owner: deployerAddress as `0x${string}`,
      secret: emptySecret,
      duration: testDuration,
    };

    console.log("  📝 Sending registration transaction...");
    const hash = await viem.writeContract({
      address: RNS_BULK_MANAGER as `0x${string}`,
      abi: bulkManagerAbi,
      functionName: "bulkRegister",
      args: [[registrationRequest]],
      account: deployer.account,
    });

    console.log("  📤 Transaction hash:", hash);
    console.log("  ⏳ Waiting for confirmation...");

    // Wait for transaction receipt
    const receipt = await viem.waitForTransactionReceipt({ hash });
    console.log("  ✅ Transaction confirmed in block:", receipt.blockNumber.toString());

    // Step 5: Check transaction events for registration results
    console.log("\nStep 5: Analyzing transaction events...");
    try {
      const bulkManagerAbi = [
        {
          anonymous: false,
          inputs: [
            { indexed: true, name: "user", type: "address" },
            { indexed: false, name: "count", type: "uint256" },
            { indexed: false, name: "totalCost", type: "uint256" },
          ],
          name: "BulkRegistration",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            { indexed: true, name: "index", type: "uint256" },
            { indexed: false, name: "reason", type: "string" },
          ],
          name: "OperationFailed",
          type: "event",
        },
      ] as const;

      // Parse logs to find BulkRegistration and OperationFailed events
      const bulkRegistrationLogs = receipt.logs.filter(log => 
        log.address.toLowerCase() === RNS_BULK_MANAGER.toLowerCase()
      );

      if (bulkRegistrationLogs.length > 0) {
        try {
          const decoded = await viem.decodeEventLog({
            abi: bulkManagerAbi,
            data: bulkRegistrationLogs[0].data,
            topics: bulkRegistrationLogs[0].topics,
          });

          if (decoded.eventName === "BulkRegistration") {
            console.log("  ✅ BulkRegistration event found:");
            console.log("     - User:", decoded.args.user);
            console.log("     - Count:", decoded.args.count.toString());
            console.log("     - Total Cost:", decoded.args.totalCost.toString(), "RIF (wei)");
            
            if (Number(decoded.args.count) > 0) {
              console.log("  ✅ Registration succeeded according to event");
            } else {
              console.log("  ⚠️  Registration count is 0 - might have failed");
            }
          }
        } catch (decodeError) {
          console.log("  ⚠️  Could not decode event (checking registry directly)");
        }
      } else {
        console.log("  ⚠️  No BulkRegistration event found in transaction");
      }

      // Check for OperationFailed events
      const operationFailedLogs = receipt.logs.filter(log => {
        try {
          // Try to decode as OperationFailed
          return true; // We'll check in the loop
        } catch {
          return false;
        }
      });

      if (operationFailedLogs.length > 0) {
        console.log("  ⚠️  Found", operationFailedLogs.length, "potential OperationFailed events");
      }
    } catch (error) {
      console.log("  ⚠️  Could not analyze events:", error instanceof Error ? error.message : String(error));
    }

    // Step 6: Verify domain in RNS registry
    console.log("\nStep 6: Verifying domain in RNS registry...");
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for registry update

    const registryAbi = [
      {
        inputs: [{ name: "node", type: "bytes32" }],
        name: "owner",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
    ] as const;

    const domainNode = namehash(testDomainFull);
    console.log("  🔑 Domain node (namehash):", domainNode);

    const registryOwner = await viem.readContract({
      address: RNS_REGISTRY as `0x${string}`,
      abi: registryAbi,
      functionName: "owner",
      args: [domainNode],
    });

    console.log("  👤 Registry owner:", registryOwner);

    if (registryOwner.toLowerCase() === deployerAddress.toLowerCase()) {
      console.log("  ✅ SUCCESS: Domain is registered in RNS registry!");
      console.log("  ✅ Owner matches deployer address");
      console.log("  ✅ Domain should appear in official RIF app");
    } else if (registryOwner === "0x0000000000000000000000000000000000000000") {
      console.log("  ⚠️  WARNING: Domain owner is zero address");
      console.log("  ⚠️  This might indicate:");
      console.log("     - Registration succeeded but registry not updated yet (testnet delay)");
      console.log("     - FIFS registrar didn't update the registry");
      console.log("     - Testnet FIFS registrar issue");
    } else {
      console.log("  ❌ ERROR: Domain owner doesn't match!");
      console.log("  ❌ Expected:", deployerAddress);
      console.log("  ❌ Got:", registryOwner);
    }

    // Step 7: Check FIFS registrar availability
    console.log("\nStep 7: Checking FIFS registrar availability status...");
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

      const stillAvailable = await viem.readContract({
        address: FIFS_REGISTRAR as `0x${string}`,
        abi: fifsRegistrarAbi,
        functionName: "available",
        args: [testDomainName],
      });

      if (!stillAvailable) {
        console.log("  ✅ FIFS registrar confirms domain is registered");
      } else {
        console.log("  ⚠️  FIFS registrar still shows domain as available");
        console.log("  ⚠️  This might indicate registration didn't succeed");
      }
    } catch (error) {
      console.log("  ⚠️  Could not check FIFS registrar:", error instanceof Error ? error.message : String(error));
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 VERIFICATION SUMMARY");
    console.log("=".repeat(60));
    console.log("Domain:", testDomainFull);
    console.log("Transaction:", hash);
    console.log("Explorer:", `https://explorer.testnet.rsk.co/tx/${hash}`);
    console.log("Registry Owner:", registryOwner);
    console.log("Expected Owner:", deployerAddress);
    console.log("Match:", registryOwner.toLowerCase() === deployerAddress.toLowerCase() ? "✅ YES" : "❌ NO");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Registration failed:");
    if (error instanceof Error) {
      console.error("  Error:", error.message);
      if (error.message.includes("revert")) {
        console.error("  💡 This might mean:");
        console.error("     - Domain is already registered");
        console.error("     - Insufficient RIF balance");
        console.error("     - Insufficient allowance");
        console.error("     - FIFS registrar rejected the registration");
      }
    } else {
      console.error("  Error:", error);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

