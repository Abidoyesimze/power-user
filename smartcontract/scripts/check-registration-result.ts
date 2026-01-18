import { config } from "dotenv";
import hre from "hardhat";

config();

async function main() {
  const contractAddress = "0x0f1d9f35bc1631d8c3eb6a2b35a2972bf5061e53" as `0x${string}`;
  const txHash = "0xd517c7d63f87ccbea5fe269f1b4c2733c70d816578d8dbc79cb8b03645d7f3d9" as `0x${string}`;
  
  const network = await hre.network;
  const { viem } = await network.connect();
  
  // Get transaction receipt
  const receipt = await viem.getTransactionReceipt({ hash: txHash });
  
  console.log("Transaction Receipt:");
  console.log("Status:", receipt.status);
  console.log("Logs:", receipt.logs.length);
  
  // Decode logs to see OperationFailed events
  const contract = await viem.getContractAt("RNSBulkManager", contractAddress);
  
  for (const log of receipt.logs) {
    try {
      const decoded = contract.abi.parseLog({ topics: log.topics as any, data: log.data });
      console.log("\nEvent:", decoded.eventName);
      console.log("Args:", decoded.args);
    } catch (e) {
      // Ignore logs we can't decode
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
