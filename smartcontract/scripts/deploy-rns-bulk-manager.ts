import { config } from "dotenv";
import hre from "hardhat";

config();

async function main() {
  console.log("Deploying RNSBulkManager (ACTUALLY FIXED)...");
  console.log("✅ Using the correct fix: Basic FIFS Registrar + separate setResolver/setAddr");

  // RNS Contract Addresses from environment or default to testnet addresses
  const RNS_REGISTRY = process.env.RNS_REGISTRY_TESTNET || "0x7d284aaac6e925aad802a53c0c69efe3764597b8";
  const RSK_OWNER = process.env.RSK_OWNER_TESTNET || "0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71";
  const ADDR_RESOLVER = process.env.ADDR_RESOLVER_TESTNET || "0x1e7ae43e3503efb886104ace36051ea72b301cdf";
  
  // FIFS Registrars
  const FIFS_REGISTRAR = process.env.FIFS_REGISTRAR_TESTNET || "0x36ffda909f941950a552011f2c50569fda14a169"; // For commits
  const FIFS_ADDR_REGISTRAR = process.env.FIFS_ADDR_REGISTRAR_TESTNET || "0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d"; // For registrations with resolver+addr
  
  const RENEWER = process.env.RENEWER_TESTNET || "0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b";
  const RIF_TOKEN = process.env.RIF_TOKEN_TESTNET || "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe";

  console.log("Contract addresses:");
  console.log("  RNS Registry:", RNS_REGISTRY);
  console.log("  RSK Owner:", RSK_OWNER);
  console.log("  Addr Resolver:", ADDR_RESOLVER);
  console.log("  FIFS Registrar (for commits):", FIFS_REGISTRAR);
  console.log("  FIFS Addr Registrar (for registrations):", FIFS_ADDR_REGISTRAR);
  console.log("  Renewer:", RENEWER);
  console.log("  RIF Token:", RIF_TOKEN);
  console.log("\nNOTE: Using 7 constructor parameters (with FIFS Addr Registrar)");
  console.log("✅ FIFS Addr Registrar sets ownership + resolver + address automatically!");

  // Get network and viem
  const network = await hre.network;
  const { viem } = await network.connect();

  // Deploy the ACTUALLY FIXED contract (uses FIFS Addr Registrar for registrations)
  const RNSBulkManager = await viem.deployContract("contracts/RNSBulkManager_ACTUALLY_FIXED.sol:RNSBulkManager", [
    RNS_REGISTRY,
    RSK_OWNER,
    ADDR_RESOLVER,
    FIFS_REGISTRAR,        // Basic FIFS for commits
    FIFS_ADDR_REGISTRAR,   // FIFS Addr Registrar for registrations (sets resolver+addr)
    RENEWER,
    RIF_TOKEN,
  ] as `0x${string}`[]);

  console.log("\n✅ RNSBulkManager deployed successfully!");
  console.log("📍 Contract Address:", RNSBulkManager.address);
  console.log("\n📋 Next steps:");
  console.log("1. Save the deployment address above");
  console.log("2. View on explorer: https://explorer.testnet.rsk.co/address/" + RNSBulkManager.address);
  console.log("3. Update your frontend with the new address");
  console.log("4. Add to .env: RNS_BULK_MANAGER_ADDRESS=" + RNSBulkManager.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

