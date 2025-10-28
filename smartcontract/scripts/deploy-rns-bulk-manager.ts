import { config } from "dotenv";
import hre from "hardhat";

config();

async function main() {
  console.log("Deploying RNSBulkManager...");

  // RNS Contract Addresses from environment or default to testnet addresses
  const RNS_REGISTRY = process.env.RNS_REGISTRY_TESTNET || "0x7d284aaac6e925aad802a53c0c69efe3764597b8";
  const RSK_OWNER = process.env.RSK_OWNER_TESTNET || "0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71";
  const ADDR_RESOLVER = process.env.ADDR_RESOLVER_TESTNET || "0x99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c";
  const FIFS_REGISTRAR = process.env.FIFS_ADDR_REGISTRAR_TESTNET || "0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d";
  const RENEWER = process.env.RENEWER_TESTNET || "0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b";
  const RIF_TOKEN = process.env.RIF_TOKEN_TESTNET || "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe";

  console.log("Contract addresses:");
  console.log("  RNS Registry:", RNS_REGISTRY);
  console.log("  RSK Owner:", RSK_OWNER);
  console.log("  Addr Resolver:", ADDR_RESOLVER);
  console.log("  FIFS Registrar:", FIFS_REGISTRAR);
  console.log("  Renewer:", RENEWER);
  console.log("  RIF Token:", RIF_TOKEN);

  // Get the contract factory
  const RNSBulkManager = await hre.viem.getContractAt(
    "RNSBulkManager",
    (await hre.viem.deployContract("RNSBulkManager", [
      RNS_REGISTRY,
      RSK_OWNER,
      ADDR_RESOLVER,
      FIFS_REGISTRAR,
      RENEWER,
      RIF_TOKEN,
    ])) as `0x${string}`
  );

  console.log("RNSBulkManager deployed to:", await RNSBulkManager.address);
  console.log("\nDeployment complete!");
  console.log("\nNext steps:");
  console.log("1. Save the deployment address");
  console.log("2. Update your frontend with the new address");
  console.log("3. Update your .env file with the deployment address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

