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
  
  // Get public client for read operations
  const publicClient = await viem.getPublicClient();
  
  console.log("📋 Configuration:");
  console.log("  Network:", network.name);
  console.log("  Deployer:", deployerAddress);
  console.log("  RNS Bulk Manager:", RNS_BULK_MANAGER);
  console.log("  RNS Registry:", RNS_REGISTRY);
  console.log("  FIFS Registrar:", FIFS_REGISTRAR);
  console.log("  RIF Token:", RIF_TOKEN);
  console.log("");

  // Test domain name (use a simple, short name to avoid FIFS registrar validation issues)
  // Short names are more likely to work with the FIFS registrar
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits for uniqueness
  const testDomainName = `test${timestamp}`; // Short name: test + 6 digits
  const testDomainFull = `${testDomainName}.rsk`;
  const testDuration = BigInt(365 * 24 * 60 * 60); // 1 year in seconds
  
  console.log("🧪 Test Registration:");
  console.log("  Domain:", testDomainFull);
  console.log("  Duration: 1 year");
  console.log("  Owner:", deployerAddress);
  console.log("");

  // Step 1: Check if domain is available
  console.log("Step 1: Checking domain availability...");
  let isAvailable = false;
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

    isAvailable = await publicClient.readContract({
      address: FIFS_REGISTRAR as `0x${string}`,
      abi: fifsRegistrarAbi,
      functionName: "available",
      args: [testDomainName],
    });

    if (!isAvailable) {
      console.log("  ⚠️  Domain is not available according to FIFS registrar");
      console.log("  🔄 Will proceed anyway to test registration flow");
    } else {
      console.log("  ✅ Domain is available");
    }
  } catch (error) {
    console.log("  ⚠️  Could not check availability (FIFS registrar may revert for some names)");
    console.log("  💡 This is a known testnet issue - proceeding with registration test");
    console.log("  📝 Error:", error instanceof Error ? error.message : String(error));
    // Continue anyway - the registration will fail if domain is not available
  }

  // Step 2: Get registration price
  console.log("\nStep 2: Getting registration price...");
  let price: bigint | null = null;
  try {
    const fifsRegistrarAbi = [
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

    // For new registrations, expires = 0
    price = await publicClient.readContract({
      address: FIFS_REGISTRAR as `0x${string}`,
      abi: fifsRegistrarAbi,
      functionName: "price",
      args: [testDomainName, 0n, testDuration],
    });

    console.log("  💰 Registration price:", price.toString(), "RIF (wei)");
    console.log("  💰 Registration price:", (Number(price) / 1e18).toFixed(4), "RIF");
  } catch (error) {
    console.log("  ⚠️  Could not get price (FIFS registrar may revert)");
    console.log("  💡 This is a known testnet issue - will try to get price from BulkManager instead");
    
    // Try to get price from BulkManager's calculateRegistrationCost
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

      price = await publicClient.readContract({
        address: RNS_BULK_MANAGER as `0x${string}`,
        abi: bulkManagerAbi,
        functionName: "calculateRegistrationCost",
        args: [[testDomainName], [testDuration]],
      });

      console.log("  💰 Price from BulkManager:", price.toString(), "RIF (wei)");
      console.log("  💰 Price from BulkManager:", (Number(price) / 1e18).toFixed(4), "RIF");
    } catch (bulkError) {
      console.log("  ⚠️  Could not get price from BulkManager");
      console.log("  💡 Will attempt registration anyway - the contract will handle price calculation");
      console.log("  📝 If registration fails, we'll see the error in the transaction");
      price = null; // Set to null so we proceed
    }
  }
  
  // If we still don't have a price, estimate or proceed anyway
  if (!price) {
    console.log("  ⚠️  Price unknown - proceeding with registration attempt");
    console.log("  💡 The BulkManager contract will calculate price internally");
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

    const balance = await publicClient.readContract({
      address: RIF_TOKEN as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [deployerAddress],
    });

    const allowance = await publicClient.readContract({
      address: RIF_TOKEN as `0x${string}`,
      abi: erc20Abi,
      functionName: "allowance",
      args: [deployerAddress, RNS_BULK_MANAGER as `0x${string}`],
    });

    console.log("  💵 RIF Balance:", (Number(balance) / 1e18).toFixed(4), "RIF");
    console.log("  🔐 Allowance:", (Number(allowance) / 1e18).toFixed(4), "RIF");

    if (price && balance < price) {
      console.log("  ❌ Insufficient RIF balance for registration");
      console.log("  💡 Get testnet RIF tokens from: https://faucet.rootstock.io/");
      console.log("  ⚠️  Will still attempt registration to see what error we get");
    } else if (!price) {
      console.log("  ⚠️  Price unknown - will attempt registration anyway");
      console.log("  💡 The contract will calculate price and fail if insufficient balance");
    } else {
      console.log("  ✅ Sufficient balance for registration");
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
    const walletClient = deployer;
    const hash = await walletClient.writeContract({
      address: RNS_BULK_MANAGER as `0x${string}`,
      abi: bulkManagerAbi,
      functionName: "bulkRegister",
      args: [[registrationRequest]],
    });

    console.log("  📤 Transaction hash:", hash);
    console.log("  ⏳ Waiting for confirmation...");

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
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
      const bulkManagerLogs = receipt.logs.filter(log => 
        log.address.toLowerCase() === RNS_BULK_MANAGER.toLowerCase()
      );

      console.log("  📋 Found", bulkManagerLogs.length, "logs from BulkManager contract");
      console.log("  📋 Total logs in transaction:", receipt.logs.length);

      // Also check for RIF token transfer events (which should happen if registration succeeds)
      const rifTokenLogs = receipt.logs.filter(log => 
        log.address.toLowerCase() === RIF_TOKEN.toLowerCase()
      );
      console.log("  📋 Found", rifTokenLogs.length, "logs from RIF Token contract");

      let bulkRegistrationFound = false;
      let operationFailedCount = 0;
      const allDecodedEvents: Array<{ name: string; args: unknown }> = [];

      for (const log of bulkManagerLogs) {
        try {
          // Try to decode as BulkRegistration
          const decoded = await publicClient.decodeEventLog({
            abi: bulkManagerAbi,
            data: log.data,
            topics: log.topics,
          });

          allDecodedEvents.push({ name: decoded.eventName, args: decoded.args });

          if (decoded.eventName === "BulkRegistration") {
            bulkRegistrationFound = true;
            console.log("  ✅ BulkRegistration event found:");
            console.log("     - User:", decoded.args.user);
            console.log("     - Count:", decoded.args.count.toString());
            console.log("     - Total Cost:", decoded.args.totalCost.toString(), "RIF (wei)");
            console.log("     - Total Cost:", (Number(decoded.args.totalCost) / 1e18).toFixed(4), "RIF");
            
            if (Number(decoded.args.count) > 0) {
              console.log("  ✅ Registration succeeded according to event!");
              console.log("  ✅", decoded.args.count.toString(), "domain(s) registered successfully");
            } else {
              console.log("  ⚠️  Registration count is 0 - registration failed");
            }
          } else if (decoded.eventName === "OperationFailed") {
            operationFailedCount++;
            console.log("  ❌ OperationFailed event found:");
            console.log("     - Index:", decoded.args.index.toString());
            console.log("     - Reason:", decoded.args.reason);
          } else {
            console.log("  ℹ️  Other event found:", decoded.eventName);
          }
        } catch (decodeError) {
          // Try to decode with full ABI to see what event it is
          console.log("  ⚠️  Could not decode log with BulkManager ABI");
          console.log("     - Log topics:", log.topics.length);
          console.log("     - First topic (event signature):", log.topics[0]);
        }
      }

      // Show all decoded events
      if (allDecodedEvents.length > 0) {
        console.log("\n  📊 All decoded events from BulkManager:");
        allDecodedEvents.forEach((event, idx) => {
          console.log(`     ${idx + 1}. ${event.name}`);
        });
      }

      if (!bulkRegistrationFound) {
        console.log("  ⚠️  No BulkRegistration event found in transaction");
        console.log("  💡 This might indicate the registration failed silently");
      }

      if (operationFailedCount > 0) {
        console.log("  ⚠️  Found", operationFailedCount, "OperationFailed event(s)");
      }
    } catch (error) {
      console.log("  ⚠️  Could not analyze events:", error instanceof Error ? error.message : String(error));
    }

    // Step 6: Verify domain in RNS registry (with retries)
    console.log("\nStep 6: Verifying domain in RNS registry...");
    
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

    // Retry checking registry owner (testnet may have delays)
    const maxRetries = 5;
    const retryDelay = 5000; // 5 seconds between retries
    let registryOwner: string | null = null;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      if (retryCount > 0) {
        console.log(`  ⏳ Retry ${retryCount}/${maxRetries - 1} - Waiting ${retryDelay / 1000}s for registry update...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      try {
        registryOwner = await publicClient.readContract({
          address: RNS_REGISTRY as `0x${string}`,
          abi: registryAbi,
          functionName: "owner",
          args: [domainNode],
        }) as string;

        console.log(`  👤 Registry owner (attempt ${retryCount + 1}):`, registryOwner);

        if (registryOwner.toLowerCase() === deployerAddress.toLowerCase()) {
          console.log("  ✅ SUCCESS: Domain is registered in RNS registry!");
          console.log("  ✅ Owner matches deployer address");
          console.log("  ✅ Domain should appear in official RIF app");
          break; // Success, exit retry loop
        } else if (registryOwner === "0x0000000000000000000000000000000000000000") {
          if (retryCount < maxRetries - 1) {
            console.log("  ⏳ Registry owner is still zero - will retry...");
          } else {
            console.log("  ⚠️  WARNING: Domain owner is still zero address after all retries");
            console.log("  ⚠️  This might indicate:");
            console.log("     - Registration succeeded but registry not updated yet (testnet delay)");
            console.log("     - FIFS registrar didn't update the registry");
            console.log("     - Testnet FIFS registrar issue");
            console.log("  💡 Check the transaction on explorer to see if BulkRegistration event was emitted");
          }
        } else {
          console.log("  ❌ ERROR: Domain owner doesn't match!");
          console.log("  ❌ Expected:", deployerAddress);
          console.log("  ❌ Got:", registryOwner);
          break; // Different owner, exit retry loop
        }
      } catch (error) {
        console.log(`  ⚠️  Error checking registry (attempt ${retryCount + 1}):`, error instanceof Error ? error.message : String(error));
      }

      retryCount++;
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

      const stillAvailable = await publicClient.readContract({
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

