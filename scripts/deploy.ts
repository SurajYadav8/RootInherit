import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";

/**
 * Deployment script for InheritanceContract
 * 
 * This script deploys the InheritanceContract to the specified network.
 * The contract allows users to create inheritance plans where beneficiaries
 * can claim funds after a timeout period if the owner doesn't reset the timer.
 */
async function main() {
  console.log("Starting InheritanceContract deployment...");
  console.log("===========================================");

  // Get the deployer's account
  const [deployer] = await ethers.getSigners();
  console.log(`🔑 Deploying with account: ${deployer.address}`);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);

  // Get the contract factory
  const InheritanceContract = await ethers.getContractFactory("InheritanceContract");
  console.log("📄 Contract factory created");

  console.log("🚀 Deploying InheritanceContract...");

  // Deploy the contract
  const inheritanceContract = await InheritanceContract.deploy();
  console.log("⏳ Waiting for deployment transaction to be mined...");

  // Wait for deployment to complete
  await inheritanceContract.waitForDeployment();

  const contractAddress = await inheritanceContract.getAddress();

  console.log("===========================================");
  console.log("✅ InheritanceContract deployed successfully!");
  console.log(`📍 Contract Address: ${contractAddress}`);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`🔗 Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get deployment transaction details
  const deployTx = inheritanceContract.deploymentTransaction();
  if (deployTx) {
    console.log(`📝 Deployment Transaction: ${deployTx.hash}`);
    
    // Get gas info from receipt
    const receipt = await deployTx.wait();
    if (receipt) {
      console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`💵 Gas Price: ${ethers.formatUnits(receipt.gasPrice || 0n, "gwei")} gwei`);
      console.log(`💸 Deployment Cost: ${ethers.formatEther((receipt.gasUsed * (receipt.gasPrice || 0n)).toString())} ETH`);
    }
  }

  // Verify deployment by calling owner function
  try {
    // Cast to any to bypass TypeScript errors for now
    const contractWithMethods = inheritanceContract as any;
    const ownerCount = await contractWithMethods.ownerCount();
    const owner = await contractWithMethods.owner();
    console.log("===========================================");
    console.log("🔍 Contract verification:");
    console.log(`📊 Initial Owner Count: ${ownerCount.toString()}`);
    console.log(`👤 Contract Owner: ${owner}`);
    console.log("✅ Contract deployment verified!");
  } catch (error) {
    console.log("⚠️ Contract deployment verification failed:", error);
  }

  console.log("===========================================");
  console.log("🎉 Deployment completed!");
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    network: network.name,
    chainId: Number(network.chainId),
    deploymentTime: new Date().toISOString(),
    deployerAddress: deployer.address,
    transactionHash: deployTx?.hash,
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return {
    contractAddress,
    contract: inheritanceContract,
    deploymentInfo
  };
}

// Execute deployment if this script is run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

// Execute deployment if this script is run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

export default main;