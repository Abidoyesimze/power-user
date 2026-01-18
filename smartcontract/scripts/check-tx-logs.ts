import { config } from "dotenv";
import hre from "hardhat";
import { createPublicClient, http, decodeEventLog } from "viem";
import { rootstockTestnet } from "viem/chains";

config();

async function main() {
  const TX_HASH = "0xd517c7d63f87ccbea5fe269f1b4c2733c70d816578d8dbc79cb8b03645d7f3d9" as `0x${string}`;
  const CONTRACT_ADDRESS = "0x0f1d9f35bc1631d8c3eb6a2b35a2972bf5061e53" as `0x${string}`;
  
  console.log("🔍 Checking Transaction Logs\n");
  console.log("Transaction Hash:", TX_HASH);
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("Explorer: https://explorer.testnet.rootstock.io/tx/" + TX_HASH + "\n");
  
  const rpcUrl = process.env.ROOTSTOCK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co";
  const publicClient = createPublicClient({
    chain: rootstockTestnet,
    transport: http(rpcUrl),
  });
  
  // Get transaction receipt
  console.log("Fetching transaction receipt...");
  const receipt = await publicClient.getTransactionReceipt({ hash: TX_HASH });
  
  console.log("\n✅ Transaction Receipt:");
  console.log("   Status:", receipt.status === "success" ? "✅ Success" : "❌ Failed");
  console.log("   Block Number:", receipt.blockNumber.toString());
  console.log("   Gas Used:", receipt.gasUsed.toString());
  console.log("   Number of Logs:", receipt.logs.length);
  console.log("");
  
  // Load contract ABI (use fully qualified name)
  const { abi } = await hre.artifacts.readArtifact("contracts/RNSBulkManager_ACTUALLY_FIXED.sol:RNSBulkManager");
  
  console.log("📋 Decoding Events:\n");
  
  let bulkRegistrationCount = 0;
  let operationFailedCount = 0;
  let addressSetFailedCount = 0;
  let otherEvents = 0;
  
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    
    // Only check logs from our contract
    if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
      continue;
    }
    
    try {
      const decoded = decodeEventLog({
        abi: abi,
        data: log.data,
        topics: log.topics,
      });
      
      console.log(`Event ${i + 1}: ${decoded.eventName}`);
      
      if (decoded.eventName === "BulkRegistration") {
        bulkRegistrationCount++;
        const args = decoded.args as { user: string; count: bigint; totalCost: bigint };
        console.log("   User:", args.user);
        console.log("   Count:", args.count.toString());
        console.log("   Total Cost:", args.totalCost.toString(), "wei");
      } else if (decoded.eventName === "OperationFailed") {
        operationFailedCount++;
        const args = decoded.args as { index: bigint; reason: string };
        console.log("   ❌ Index:", args.index.toString());
        console.log("   ❌ Reason:", args.reason);
      } else if (decoded.eventName === "AddressSetFailed") {
        addressSetFailedCount++;
        const args = decoded.args as { name: string; reason: string };
        console.log("   ⚠️  Domain:", args.name);
        console.log("   ⚠️  Reason:", args.reason);
      } else {
        otherEvents++;
        console.log("   Args:", JSON.stringify(decoded.args, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
      }
      
      console.log("");
    } catch (error: any) {
      // Not our event, skip
    }
  }
  
  console.log("\n📊 Summary:");
  console.log("   BulkRegistration events:", bulkRegistrationCount);
  console.log("   OperationFailed events:", operationFailedCount);
  console.log("   AddressSetFailed events:", addressSetFailedCount);
  console.log("   Other events from our contract:", otherEvents);
  
  if (operationFailedCount > 0) {
    console.log("\n⚠️  REGISTRATIONS FAILED!");
    console.log("   Check the OperationFailed events above for details.");
  } else if (bulkRegistrationCount > 0 && operationFailedCount === 0) {
    console.log("\n✅ No OperationFailed events - all registrations succeeded according to contract!");
    console.log("   But domain owner is still 0x0000...0000, so there might be another issue.");
  }
  
  // Also check logs from FIFS Registrar (if any)
  const FIFS_REGISTRAR = "0x36ffda909f941950a552011f2c50569fda14a169" as `0x${string}`;
  console.log("\n🔍 Checking for FIFS Registrar events:");
  
  let fifsEvents = 0;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === FIFS_REGISTRAR.toLowerCase()) {
      fifsEvents++;
      console.log(`   Event from FIFS Registrar (log ${receipt.logs.indexOf(log) + 1}):`);
      console.log("   Topics:", log.topics.map(t => t.slice(0, 10) + "..."));
      console.log("   Data:", log.data.slice(0, 66) + "...");
    }
  }
  
  if (fifsEvents === 0) {
    console.log("   ❌ No events from FIFS Registrar!");
    console.log("   This suggests register() was NOT called successfully on FIFS Registrar.");
    console.log("   Possible reasons:");
    console.log("     1. Function call failed silently (caught in try-catch)");
    console.log("     2. Payment method issue (needs transferAndCall?)");
    console.log("     3. Commitment not found");
  } else {
    console.log(`   ✅ Found ${fifsEvents} event(s) from FIFS Registrar`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
