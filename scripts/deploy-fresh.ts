import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";

/**
 * Fresh deployment script with nonce handling
 * This script ensures a clean deployment by managing transaction nonces
 */
async function main() {
  console.log("Fresh InheritanceContract deployment...");
  console.log("=====================================");

  const [deployer] = await ethers.getSigners();
  console.log(`🔑 Deploying with account: ${deployer.address}`);
  
  // Get current nonce to avoid conflicts
  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  console.log(`🔢 Current nonce: ${nonce}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} tRBTC`);

  if (balance === 0n) {
    console.log("❌ No balance! Please get testnet tokens from https://faucet.rootstock.io/");
    process.exit(1);
  }

  console.log("🚀 Deploying InheritanceContract with fresh nonce...");

  try {
    // Get contract factory
    const InheritanceContract = await ethers.getContractFactory("InheritanceContract");
    
    // Deploy with explicit nonce
    const inheritanceContract = await InheritanceContract.deploy({
      nonce: nonce
    });
    
    console.log("⏳ Waiting for deployment transaction...");
    
    // Wait for deployment
    await inheritanceContract.waitForDeployment();
    
    const contractAddress = await inheritanceContract.getAddress();
    
    console.log("=====================================");
    console.log("✅ InheritanceContract deployed successfully!");
    console.log(`📍 Contract Address: ${contractAddress}`);
    
    // Get deployment transaction info
    const deployTx = inheritanceContract.deploymentTransaction();
    if (deployTx) {
      console.log(`📝 Transaction Hash: ${deployTx.hash}`);
      console.log(`🔢 Nonce Used: ${deployTx.nonce}`);
      
      const receipt = await deployTx.wait();
      if (receipt) {
        console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`💸 Cost: ${ethers.formatEther((receipt.gasUsed * (receipt.gasPrice || 0n)).toString())} tRBTC`);
        console.log(`📦 Block Number: ${receipt.blockNumber}`);
      }
    }

    // Verify contract works
    const contractWithMethods = inheritanceContract as any;
    const ownerCount = await contractWithMethods.ownerCount();
    const owner = await contractWithMethods.owner();
    
    console.log("=====================================");
    console.log("🔍 Contract Verification:");
    console.log(`📊 Owner Count: ${ownerCount.toString()}`);
    console.log(`👤 Contract Owner: ${owner}`);
    console.log("✅ Deployment verified!");
    
    // Final summary
    const deploymentInfo = {
      contractAddress,
      transactionHash: deployTx?.hash,
      blockNumber: (await deployTx?.wait())?.blockNumber,
      deployerAddress: deployer.address,
      network: "Rootstock Testnet",
      chainId: 31,
      deploymentTime: new Date().toISOString()
    };

    console.log("=====================================");
    console.log("📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    return deploymentInfo;

  } catch (error: any) {
    console.error("❌ Deployment failed:");
    
    if (error.message.includes("pending transaction")) {
      console.error("🔄 There's a pending transaction. Wait a few minutes and try again.");
      console.error("💡 Or try increasing the gas price in your transaction.");
    } else if (error.message.includes("insufficient funds")) {
      console.error("💰 Insufficient funds. Get more tRBTC from https://faucet.rootstock.io/");
    } else {
      console.error(error.message);
    }
    
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      process.exit(1);
    });
}