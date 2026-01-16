import { config } from "dotenv";
import hre from "hardhat";
import { formatUnits } from "viem";

config();

async function main() {
  console.log("🧪 Testing New Contract with Fixed Price\n");

  const network = await hre.network;
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  const RNS_BULK_MANAGER = "0xdd190753dd92104de84555892344c05b9c009577";

  console.log("Contract Address:", RNS_BULK_MANAGER);
  console.log("\n📊 Testing Price Calculation:\n");

  const bulkManagerAbi = [
    {
      inputs: [
        { name: "names", type: "string[]" },
        { name: "durations", type: "uint256[]" },
      ],
      name: "calculateRegistrationCost",
      outputs: [{ name: "totalCost", type: "uint256" }],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [],
      name: "PRICE_PER_YEAR",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  // Test 1: Check PRICE_PER_YEAR constant
  try {
    const pricePerYear = await publicClient.readContract({
      address: RNS_BULK_MANAGER as `0x${string}`,
      abi: bulkManagerAbi,
      functionName: "PRICE_PER_YEAR",
    });
    console.log("✅ PRICE_PER_YEAR:", formatUnits(pricePerYear as bigint, 18), "RIF");
  } catch (error) {
    console.log("⚠️  Could not read PRICE_PER_YEAR:", error);
  }

  // Test 2: Calculate cost for different durations
  const testCases = [
    { label: "1 second", duration: BigInt(1) },
    { label: "1 minute", duration: BigInt(60) },
    { label: "1 hour", duration: BigInt(3600) },
    { label: "1 day", duration: BigInt(86400) },
    { label: "1 year", duration: BigInt(31536000) },
    { label: "2 years", duration: BigInt(63072000) },
    { label: "5 years", duration: BigInt(157680000) },
  ];

  console.log("\n💰 Registration Costs:\n");
  console.log("Duration".padEnd(12) + " | " + "Cost (RIF)".padStart(15) + " | " + "Status");
  console.log("-".repeat(50));

  for (const testCase of testCases) {
    try {
      const cost = await publicClient.readContract({
        address: RNS_BULK_MANAGER as `0x${string}`,
        abi: bulkManagerAbi,
        functionName: "calculateRegistrationCost",
        args: [["test"], [testCase.duration]],
      });

      const costInRIF = formatUnits(cost as bigint, 18);
      const status = Number(cost) < 10 * 10**18 ? "✅ Reasonable" : "❌ Too High";

      console.log(
        testCase.label.padEnd(12) + " | " + 
        costInRIF.padStart(15) + " | " + 
        status
      );
    } catch (error: any) {
      console.log(
        testCase.label.padEnd(12) + " | " + 
        "ERROR".padStart(15) + " | " + 
        error.message.substring(0, 20)
      );
    }
  }

  console.log("\n✅ Test completed!");
  console.log("\n💡 Expected: 1 year should cost ~0.1 RIF (not 31.5M RIF)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });






