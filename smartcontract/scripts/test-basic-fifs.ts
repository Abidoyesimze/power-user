import { config } from "dotenv";
import hre from "hardhat";

config();

async function main() {
  const BASIC_FIFS = "0x36ffda909f941950a552011f2c50569fda14a169" as `0x${string}`;
  
  const network = await hre.network;
  const { viem } = await network.connect();
  
  // Check if Basic FIFS Registrar supports direct register() calls
  // by checking its ABI on the blockchain
  
  console.log("Testing Basic FIFS Registrar:", BASIC_FIFS);
  console.log("\nTrying to call makeCommitment...");
  
  try {
    const labelHash = await viem.keccak256("0x" + Buffer.from("test").toString("hex"));
    const commitment = await viem.readContract({
      address: BASIC_FIFS,
      abi: [{
        inputs: [
          { name: 'label', type: 'bytes32' },
          { name: 'nameOwner', type: 'address' },
          { name: 'secret', type: 'bytes32' },
        ],
        name: 'makeCommitment',
        outputs: [{ name: '', type: 'bytes32' }],
        stateMutability: 'pure',
        type: 'function',
      }],
      functionName: 'makeCommitment',
      args: [labelHash, "0x34C775FB2fe2b8383B5659B3f7Fc1E721Ca04A3a", "0x0000000000000000000000000000000000000000000000000000000000000000"],
    });
    
    console.log("✅ makeCommitment works, commitment:", commitment);
    console.log("\nBasic FIFS Registrar seems to support direct calls.");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
