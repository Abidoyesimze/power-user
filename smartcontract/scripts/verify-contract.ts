import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

config();

async function main() {
  const contractAddress = process.env.RNS_BULK_MANAGER_ADDRESS || "0xbf1b2ca2cc17bd98679d584575d549c62b3214eb";
  
  console.log("📄 Preparing contract verification for RNSBulkManager");
  console.log("📍 Contract Address:", contractAddress);
  
  // Get the directory name
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Read the build info file
  const buildInfoPath = path.join(__dirname, "../artifacts/build-info/solc-0_8_20-7811cac0320dcbc8d66d4cb323db6d9e593d7c5f.output.json");
  
  if (!fs.existsSync(buildInfoPath)) {
    console.error("❌ Build info file not found!");
    console.log("Please run: npm run compile");
    process.exit(1);
  }
  
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf-8"));
  
  console.log("✅ Build info found");
  console.log("\n📋 To verify this contract on Rootstock Explorer:");
  console.log("1. Go to: https://explorer.testnet.rootstock.io/address/" + contractAddress);
  console.log("2. Click on 'Contract' tab");
  console.log("3. Click on 'Verify and Publish'");
  console.log("4. Select 'Via JSON file' and upload the build info file");
  console.log("\n📁 Build info file location:");
  console.log(buildInfoPath);
  console.log("\n🔧 Alternatively, you can use the Rootstock Explorer API directly.");
  console.log("\nContract constructor arguments:");
  console.log("RNS_REGISTRY: 0x7d284aaac6e925aad802a53c0c69efe3764597b8");
  console.log("RSK_OWNER: 0xca0a477e19bac7e0e172ccfd2e3c28a7200bdb71");
  console.log("ADDR_RESOLVER: 0x99a12be4c89c3786f16bfd7b5f4a8c6c8c4c4c4c");
  console.log("FIFS_REGISTRAR: 0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d");
  console.log("RENEWER: 0xe48ad1d5fbf61394b5a7d81ab2f36736a046657b");
  console.log("RIF_TOKEN: 0x19f64674d8a5b4e652319f5e239efd3bc969a1fe");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

