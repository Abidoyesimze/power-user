import { config } from "dotenv";
import hre from "hardhat";
import { formatUnits } from "viem";

config();

async function main() {
  console.log("🧪 Testing FIFS Registrar Price Function\n");

  const network = await hre.network;
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  const FIFS_REGISTRAR = "0x90734bd6bf96250a7b262e2bc34284b0d47c1e8d";
  const testDomain = "simze";

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

  console.log("Testing different durations to identify the pattern:\n");

  const testCases = [
    { label: "1 second", duration: BigInt(1) },
    { label: "1 minute", duration: BigInt(60) },
    { label: "1 hour", duration: BigInt(3600) },
    { label: "1 day", duration: BigInt(86400) },
    { label: "1 year", duration: BigInt(31536000) },
    { label: "2 years", duration: BigInt(63072000) },
  ];

  for (const testCase of testCases) {
    try {
      const price = await publicClient.readContract({
        address: FIFS_REGISTRAR as `0x${string}`,
        abi: fifsPriceAbi,
        functionName: "price",
        args: [testDomain, BigInt(0), testCase.duration],
      });

      const priceInRIF = formatUnits(price as bigint, 18);
      const durationNum = Number(testCase.duration);
      const ratio = Number(price) / durationNum;

      console.log(`${testCase.label.padEnd(12)} | Duration: ${durationNum.toString().padStart(10)} | Price: ${priceInRIF.padStart(20)} RIF | Ratio: ${ratio.toFixed(2)}`);
    } catch (error: any) {
      console.log(`${testCase.label.padEnd(12)} | ERROR: ${error.message}`);
    }
  }

  console.log("\n📊 Analysis:");
  console.log("If the ratio is close to 1.0, the registrar is using duration directly as price.");
  console.log("If the ratio is constant, there's a fixed multiplier.");
  console.log("Expected: Price should be much lower (0.01-1 RIF range).\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

