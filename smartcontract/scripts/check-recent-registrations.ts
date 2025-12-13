import { config } from "dotenv";
import hre from "hardhat";
import { decodeEventLog, namehash } from "viem";

config();

async function main() {
  console.log("🔍 Checking Recent Registration Transactions\n");

  const network = await hre.network;
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  if (!deployer) {
    throw new Error("No wallet found");
  }

  const deployerAddress = deployer.account.address;
  const RNS_BULK_MANAGER = "0xdd190753dd92104de84555892344c05b9c009577";
  const RNS_REGISTRY = "0x7d284aaac6e925aad802a53c0c69efe3764597b8";

  console.log("👤 Your Wallet:", deployerAddress);
  console.log("📋 Bulk Manager:", RNS_BULK_MANAGER);
  console.log("");

  // Get recent transactions from the Bulk Manager contract
  console.log("📊 Checking Recent Transactions...\n");

  // Get the latest block
  const latestBlock = await publicClient.getBlockNumber();
  console.log("Latest Block:", latestBlock.toString());

  // Check last 100 blocks for transactions
  const fromBlock = latestBlock - BigInt(100);
  
  // Get BulkRegistration events
  const bulkRegistrationEvents = await publicClient.getLogs({
    address: RNS_BULK_MANAGER as `0x${string}`,
    event: {
      type: "event",
      name: "BulkRegistration",
      inputs: [
        { indexed: true, name: "user", type: "address" },
        { indexed: false, name: "count", type: "uint256" },
        { indexed: false, name: "totalCost", type: "uint256" },
      ],
    } as const,
    fromBlock,
    toBlock: latestBlock,
  });

  console.log(`\n📋 Found ${bulkRegistrationEvents.length} BulkRegistration event(s):\n`);

  if (bulkRegistrationEvents.length === 0) {
    console.log("❌ No registration events found in recent blocks");
    console.log("💡 This means either:");
    console.log("   1. No registrations have occurred yet");
    console.log("   2. Registration transactions failed");
    console.log("   3. Events are in older blocks");
  } else {
    for (const event of bulkRegistrationEvents) {
      const decoded = decodeEventLog({
        abi: [{
          anonymous: false,
          inputs: [
            { indexed: true, name: "user", type: "address" },
            { indexed: false, name: "count", type: "uint256" },
            { indexed: false, name: "totalCost", type: "uint256" },
          ],
          name: "BulkRegistration",
          type: "event",
        }] as const,
        data: event.data,
        topics: event.topics,
      });

      console.log("📦 Event Details:");
      console.log("  Block:", event.blockNumber.toString());
      console.log("  Transaction:", event.transactionHash);
      console.log("  User:", decoded.args.user);
      console.log("  Domains Registered:", decoded.args.count.toString());
      console.log("  Total Cost:", decoded.args.totalCost.toString(), "wei");
      console.log("  Explorer:", `https://explorer.testnet.rootstock.io/tx/${event.transactionHash}`);
      console.log("");

      // Get transaction receipt to check for OperationFailed events
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: event.transactionHash });
        
        // Check for OperationFailed events
        const operationFailedEvents = receipt.logs
          .filter(log => log.address.toLowerCase() === RNS_BULK_MANAGER.toLowerCase())
          .map(log => {
            try {
              return decodeEventLog({
                abi: [{
                  anonymous: false,
                  inputs: [
                    { indexed: true, name: "index", type: "uint256" },
                    { indexed: false, name: "reason", type: "string" },
                  ],
                  name: "OperationFailed",
                  type: "event",
                }] as const,
                data: log.data,
                topics: log.topics,
              });
            } catch {
              return null;
            }
          })
          .filter(e => e !== null && e.eventName === "OperationFailed");

        if (operationFailedEvents.length > 0) {
          console.log("  ⚠️  Operation Failed Events:");
          operationFailedEvents.forEach((failed: any) => {
            console.log(`    Index ${failed.args.index}: ${failed.args.reason}`);
          });
        } else {
          console.log("  ✅ No operation failures detected");
        }
      } catch (error) {
        console.log("  ⚠️  Could not get transaction receipt");
      }
    }
  }

  // Also check for any transactions from the user's address to the Bulk Manager
  console.log("\n📤 Checking Your Recent Transactions to Bulk Manager...\n");
  
  // Get recent transactions from user's address
  try {
    // Note: This is a simplified check - in practice, you'd query the blockchain for transactions
    console.log("💡 To check your specific transaction:");
    console.log("   1. Go to: https://explorer.testnet.rootstock.io/address/" + deployerAddress);
    console.log("   2. Look for transactions to:", RNS_BULK_MANAGER);
    console.log("   3. Check the transaction receipt for events");
  } catch (error) {
    console.error("Error:", error);
  }

  console.log("\n✅ Check completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

