import fs from 'fs';
import path from 'path';

/**
 * Script to extract ABI from compiled contract and update frontend ABI file
 */
async function updateABI() {
  console.log("Updating InheritanceContract ABI...");
  console.log("=====================================");

  // Paths
  const artifactPath = path.join(__dirname, '../artifacts/contracts/Inheritance.sol/InheritanceContract.json');
  const abiPath = path.join(__dirname, '../frontend/lib/abis/InheritanceContract.ts');

  try {
    // Read the compiled artifact
    const artifactContent = fs.readFileSync(artifactPath, 'utf8');
    const artifact = JSON.parse(artifactContent);
    const abi = artifact.abi;

    console.log(`📄 Read artifact from: ${artifactPath}`);
    console.log(`🔍 Found ${abi.length} ABI entries`);

    // Create the TypeScript ABI file content
    const abiFileContent = `// Auto-generated ABI for InheritanceContract
// Contract Address (Rootstock Testnet): 0x10F36d94Fb5E7Cd964E277e9475b0f139E475A34
// Generated on: ${new Date().toISOString()}

export const INHERITANCE_CONTRACT_ADDRESS = "0x10F36d94Fb5E7Cd964E277e9475b0f139E475A34";

export const inheritanceABI = ${JSON.stringify(abi, null, 2)} as const;

export type InheritanceABI = typeof inheritanceABI;

// Contract deployment info
export const CONTRACT_INFO = {
  address: INHERITANCE_CONTRACT_ADDRESS,
  network: "Rootstock Testnet",
  chainId: 31,
  deploymentBlock: 6870270,
  deploymentTx: "0x18a4a6a201f64a0bc3943831870b0b1cde067fc8af21502501212ca505075efc",
  explorerUrl: "https://explorer.testnet.rootstock.io/address/0x10F36d94Fb5E7Cd964E277e9475b0f139E475A34"
} as const;
`;

    // Write to the frontend ABI file
    fs.writeFileSync(abiPath, abiFileContent, 'utf8');

    console.log(`✅ ABI successfully updated at: ${abiPath}`);
    console.log(`📍 Contract address included: ${INHERITANCE_CONTRACT_ADDRESS}`);
    console.log(`🔗 Network: Rootstock Testnet (Chain ID: 31)`);
    
    // Show some key ABI functions
    const functions = abi.filter((item: any) => item.type === 'function').map((item: any) => item.name);
    const events = abi.filter((item: any) => item.type === 'event').map((item: any) => item.name);
    
    console.log("\n📋 Contract Functions:");
    functions.forEach((func: string) => console.log(`  - ${func}`));
    
    console.log("\n📋 Contract Events:");
    events.forEach((event: string) => console.log(`  - ${event}`));

    console.log("\n🎉 ABI update completed successfully!");

  } catch (error) {
    console.error("❌ Error updating ABI:", error);
    throw error;
  }
}

// Add the constant here for the script to reference
const INHERITANCE_CONTRACT_ADDRESS = "0x10F36d94Fb5E7Cd964E277e9475b0f139E475A34";

if (require.main === module) {
  updateABI()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default updateABI;