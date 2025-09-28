import hre from "hardhat";

/**
 * Deployment script for InheritanceContract
 * 
 * This script deploys the InheritanceContract to the specified network.
 * The contract allows users to create inheritance plans where beneficiaries
 * can claim funds after a timeout period if the owner doesn't reset the timer.
 */
async function main() {
  console.log("Starting InheritanceContract deployment...");

  // Get the contract factory
  const InheritanceContract = await hre.ethers.getContractFactory("InheritanceContract");

  console.log("Deploying InheritanceContract...");

  // Deploy the contract
  // The constructor only requires the deployer as the owner (Ownable)
  const inheritanceContract = await InheritanceContract.deploy();

  // Wait for deployment to complete
  await inheritanceContract.waitForDeployment();

  const contractAddress = await inheritanceContract.getAddress();

  console.log("✅ InheritanceContract deployed successfully!");
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔗 Network: ${(await hre.ethers.provider.getNetwork()).name}`);
  console.log(`⛽ Gas Used: ${(await hre.ethers.provider.getTransactionReceipt(inheritanceContract.deploymentTransaction()?.hash!))?.gasUsed.toString()}`);

  // Verify deployment by calling a view function
  try {
    const ownerCount = await inheritanceContract.ownerCount();
    console.log(`🔍 Owner Count: ${ownerCount}`);
    console.log("✅ Contract deployment verified!");
  } catch (error) {
    console.log("⚠️ Contract deployment verification failed:", error);
  }

  return {
    contractAddress,
    contract: inheritanceContract
  };
}

// Execute deployment if this script is run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

export default main;
