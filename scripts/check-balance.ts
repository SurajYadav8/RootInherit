import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";

async function main() {
  console.log("Checking Rootstock Testnet Balance...");
  console.log("=====================================");

  const [deployer] = await ethers.getSigners();
  console.log(`🔍 Checking balance for: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInEth = ethers.formatEther(balance);
  
  console.log(`💰 Balance: ${balanceInEth} tRBTC`);
  
  if (parseFloat(balanceInEth) === 0) {
    console.log("❌ No balance found!");
    console.log("🚰 Please get testnet tokens from:");
    console.log("   - https://faucet.rootstock.io/");
    console.log("   - https://faucet.testnet.rsk.co/");
    console.log(`   - Your address: ${deployer.address}`);
  } else {
    console.log("✅ Balance sufficient for deployment!");
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log(`🔗 Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Get latest block
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`📦 Latest Block: ${blockNumber}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });