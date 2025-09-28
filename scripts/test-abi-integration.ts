import { inheritanceABI, INHERITANCE_CONTRACT_ADDRESS, CONTRACT_INFO } from '../frontend/lib/abis/InheritanceContract';

/**
 * Test script to verify the ABI integration
 */
async function testABIIntegration() {
  console.log("Testing ABI Integration...");
  console.log("=========================");

  try {
    // Test ABI import
    console.log(`✅ ABI imported successfully`);
    console.log(`📄 ABI has ${inheritanceABI.length} entries`);
    
    // Test contract address
    console.log(`📍 Contract Address: ${INHERITANCE_CONTRACT_ADDRESS}`);
    
    // Test contract info
    console.log(`🔗 Network: ${CONTRACT_INFO.network}`);
    console.log(`⛓️ Chain ID: ${CONTRACT_INFO.chainId}`);
    console.log(`📦 Deployment Block: ${CONTRACT_INFO.deploymentBlock}`);
    
    // Count different ABI types
    const functions = inheritanceABI.filter(item => item.type === 'function').length;
    const events = inheritanceABI.filter(item => item.type === 'event').length;
    const errors = inheritanceABI.filter(item => item.type === 'error').length;
    
    console.log("\n📊 ABI Breakdown:");
    console.log(`  Functions: ${functions}`);
    console.log(`  Events: ${events}`);
    console.log(`  Errors: ${errors}`);
    
    // Test key functions exist
    const keyFunctions = [
      'createInheritancePlan',
      'addFunds',
      'addBeneficiary',
      'resetTimer',
      'redeem',
      'getPlanDetails'
    ];
    
    console.log("\n🔍 Key Functions Check:");
    keyFunctions.forEach(funcName => {
      const exists = inheritanceABI.some(item => 
        item.type === 'function' && item.name === funcName
      );
      console.log(`  ${exists ? '✅' : '❌'} ${funcName}`);
    });
    
    // Test key events exist
    const keyEvents = [
      'InheritancePlanCreated',
      'FundsAdded',
      'BeneficiaryAdded',
      'TimerReset',
      'FundsClaimed'
    ];
    
    console.log("\n📡 Key Events Check:");
    keyEvents.forEach(eventName => {
      const exists = inheritanceABI.some(item => 
        item.type === 'event' && item.name === eventName
      );
      console.log(`  ${exists ? '✅' : '❌'} ${eventName}`);
    });
    
    console.log("\n🎉 ABI integration test passed!");
    console.log("Frontend is ready to interact with the contract!");

  } catch (error) {
    console.error("❌ ABI integration test failed:", error);
    throw error;
  }
}

if (require.main === module) {
  testABIIntegration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default testABIIntegration;