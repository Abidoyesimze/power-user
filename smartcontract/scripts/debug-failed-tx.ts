import { config } from "dotenv";
import hre from "hardhat";
import { formatUnits, decodeFunctionData } from "viem";

config();

async function main() {
  console.log("🔍 Debugging Failed Transaction\n");

  const network = await hre.network;
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  if (!deployer) {
    throw new Error("No wallet found");
  }

  const deployerAddress = deployer.account.address;
  console.log("👤 Deployer Address:", deployerAddress);

  // Transaction hash from the failed transaction
  const txHash = "0x6d6054b4068bd6a34f9aa75c3dc2e51233b9267549e1b965e15c9de52a010c76";
  
  console.log("\n📋 Transaction Details:");
  console.log("  Hash:", txHash);
  console.log("  Explorer:", `https://explorer.testnet.rootstock.io/tx/${txHash}`);

  // Get transaction details
  try {
    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
    console.log("\n📤 Transaction Input Data:");
    console.log("  To:", tx.to);
    console.log("  From:", tx.from);
    console.log("  Value:", tx.value.toString());
    
    // Decode the function call
    const bulkManagerAbi = [
      {
        inputs: [{
          components: [
            { name: "name", type: "string" },
            { name: "owner", type: "address" },
            { name: "secret", type: "bytes32" },
            { name: "duration", type: "uint256" },
            { name: "addr", type: "address" }
          ],
          name: "requests",
          type: "tuple[]"
        }],
        name: "bulkRegister",
        outputs: [{
          components: [
            { name: "success", type: "bool" },
            { name: "index", type: "uint256" },
            { name: "errorMessage", type: "string" }
          ],
          name: "",
          type: "tuple[]"
        }],
        stateMutability: "nonpayable",
        type: "function"
      }
    ] as const;

    const decoded = decodeFunctionData({
      abi: bulkManagerAbi,
      data: tx.input
    });

    console.log("\n📝 Decoded Function Call:");
    console.log("  Function:", decoded.functionName);
    if (decoded.args && decoded.args[0]) {
      const requests = decoded.args[0] as any[];
      requests.forEach((req, i) => {
        console.log(`\n  Request ${i + 1}:`);
        console.log("    Name:", req.name);
        console.log("    Owner:", req.owner);
        console.log("    Duration:", req.duration.toString(), "seconds");
        console.log("    Addr:", req.addr);
      });
    }

    // Get transaction receipt to see revert reason
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
      console.log("\n📦 Transaction Receipt:");
      console.log("  Status:", receipt.status);
      console.log("  Block Number:", receipt.blockNumber.toString());
      console.log("  Gas Used:", receipt.gasUsed.toString());
    } catch (e) {
      console.log("\n⚠️  Could not get receipt (transaction may have failed before being mined)");
    }

  } catch (error: any) {
    console.error("❌ Error getting transaction:", error.message);
  }

  // Now simulate the call to see what fails
  console.log("\n🧪 Simulating the Registration Call...\n");
  
  const RNS_BULK_MANAGER = "0xdd190753dd92104de84555892344c05b9c009577";
  const RIF_TOKEN = "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe";
  const testDomain = "simze";
  const testDuration = BigInt(31536000); // 1 year
  const emptySecret = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

  // Step 1: Check RIF balance
  console.log("📊 Step 1: Checking RIF Token Balance...");
  try {
    const balance = await publicClient.readContract({
      address: RIF_TOKEN as `0x${string}`,
      abi: [{
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
      }] as const,
      functionName: "balanceOf",
      args: [deployerAddress]
    });
    console.log("  ✅ Balance:", formatUnits(balance as bigint, 18), "RIF");
  } catch (error) {
    console.error("  ❌ Error:", error);
  }

  // Step 2: Check allowance
  console.log("\n🔐 Step 2: Checking Token Allowance...");
  try {
    const allowance = await publicClient.readContract({
      address: RIF_TOKEN as `0x${string}`,
      abi: [{
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" }
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
      }] as const,
      functionName: "allowance",
      args: [deployerAddress, RNS_BULK_MANAGER as `0x${string}`]
    });
    console.log("  ✅ Allowance:", formatUnits(allowance as bigint, 18), "RIF");
    
    // Calculate required cost
    const cost = await publicClient.readContract({
      address: RNS_BULK_MANAGER as `0x${string}`,
      abi: [{
        inputs: [
          { name: "names", type: "string[]" },
          { name: "durations", type: "uint256[]" }
        ],
        name: "calculateRegistrationCost",
        outputs: [{ name: "totalCost", type: "uint256" }],
        stateMutability: "pure",
        type: "function"
      }] as const,
      functionName: "calculateRegistrationCost",
      args: [[testDomain], [testDuration]]
    });
    
    console.log("  💰 Required Cost:", formatUnits(cost as bigint, 18), "RIF");
    
    if (allowance < (cost as bigint)) {
      console.log("  ❌ ERROR: Insufficient allowance!");
      console.log("  💡 Need to approve tokens first");
    } else {
      console.log("  ✅ Allowance is sufficient");
    }
  } catch (error) {
    console.error("  ❌ Error:", error);
  }

  // Step 3: Try to simulate the call (static call)
  console.log("\n🔬 Step 3: Simulating Registration Call (Static Call)...");
  try {
    const request = {
      name: testDomain,
      owner: deployerAddress as `0x${string}`,
      secret: emptySecret,
      duration: testDuration,
      addr: deployerAddress as `0x${string}`
    };

    // Try a static call to see what would happen
    const result = await publicClient.simulateContract({
      account: deployerAddress,
      address: RNS_BULK_MANAGER as `0x${string}`,
      abi: [{
        inputs: [{
          components: [
            { name: "name", type: "string" },
            { name: "owner", type: "address" },
            { name: "secret", type: "bytes32" },
            { name: "duration", type: "uint256" },
            { name: "addr", type: "address" }
          ],
          name: "requests",
          type: "tuple[]"
        }],
        name: "bulkRegister",
        outputs: [{
          components: [
            { name: "success", type: "bool" },
            { name: "index", type: "uint256" },
            { name: "errorMessage", type: "string" }
          ],
          name: "",
          type: "tuple[]"
        }],
        stateMutability: "nonpayable",
        type: "function"
      }] as const,
      functionName: "bulkRegister",
      args: [[request]]
    });

    console.log("  ✅ Simulation successful!");
    console.log("  Results:", result.result);
  } catch (error: any) {
    console.error("  ❌ Simulation failed:");
    console.error("  Message:", error.message);
    if (error.cause) {
      console.error("  Cause:", error.cause);
    }
    if (error.data) {
      console.error("  Data:", error.data);
    }
    if (error.shortMessage) {
      console.error("  Short Message:", error.shortMessage);
    }
  }

  console.log("\n✅ Debug completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });






