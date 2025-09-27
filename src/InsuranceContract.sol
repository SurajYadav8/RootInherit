// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
// import "../lib/chainlink-evm/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title InsuranceContract
 * @dev A subscription-based insurance contract with price feed integration
 * @notice Migrated from Stellar/Rust to EVM/Solidity
 */
contract InsuranceContract is  Ownable {
    using SafeERC20 for IERC20;
    // using SafeMath for uint256;

    // ============ Constants ============
    address public constant KALE_TOKEN = 0x1234567890123456789012345678901234567890; // Replace with actual KALE token address
    address public constant DEFAULT_TREASURY = 0x0987654321098765432109876543210987654321; // Replace with actual treasury

    // Price feed mappings for different assets
    mapping(string => address) public priceFeeds;

    // ============ Structs ============
    struct Policy {
        uint256 id;
        address buyer;
        string assetSymbol;
        uint256 strikePrice;
        uint256 coverageAmount;
        uint256 monthlyPremium;
        uint256 nextPaymentDue;
        uint256 gracePeriodEnd;
        bool active;
        bool canceled;
        uint256 totalPremiumsPaid;
        uint32 monthsActive;
        uint256 lastPaymentTimestamp;
        uint32 monthsSinceClaim;
        uint256 lastClaimTimestamp;
        uint256 loyaltyRewardsClaimed;
    }

    struct PaymentRecord {
        uint256 policyId;
        uint256 amount;
        uint256 timestamp;
        uint32 month;
    }

    struct ClaimProposal {
        uint256 id;
        uint256 policyId;
        address claimant;
        uint32 yesVotes;
        uint32 noVotes;
        uint256 startTimestamp;
        bool executed;
    }

    // ============ State Variables ============
    uint256 public poolBalance;
    uint256 public policyCounter;
    uint256 public claimsPaid;
    uint256 public totalCoverage;
    uint32 public gracePeriodDays = 7;
    uint256 public monthlyRenewalFee;
    uint256 public totalShares;
    uint32 public protocolFeeBps = 100; // 1% default
    address public treasury;
    uint256 public claimCounter;
    uint32 public loyaltyMonthsThreshold = 6;
    uint32 public loyaltyRewardBps = 500; // 5% default
    uint256 public flashClaimThreshold = 1000;

    // ============ Mappings ============
    mapping(uint256 => Policy) public policies;
    mapping(uint256 => mapping(uint32 => PaymentRecord)) public paymentRecords;
    mapping(address => uint256[]) public policiesByBuyer;
    mapping(address => uint256) public lpShares;
    mapping(uint256 => ClaimProposal) public claims;
    mapping(uint256 => mapping(address => bool)) public claimVotes;
    mapping(address => bool) public hasVoted;

    // ============ Events ============
    event MonthlyPolicyCreated(uint256 indexed policyId, address indexed buyer, string assetSymbol);
    event MonthlyPremiumPaid(uint256 indexed policyId, address indexed buyer, uint256 amount);
    event PolicyCanceled(uint256 indexed policyId, address indexed buyer);
    event PolicyExpired(uint256 indexed policyId);
    event ClaimPaid(uint256 indexed policyId, address indexed buyer, uint256 amount);
    event PoolFunded(address indexed funder, uint256 amount, uint256 shares);
    event LPWithdraw(address indexed lp, uint256 shares, uint256 amount);
    event GracePeriodUpdated(uint32 newDays);
    event RenewalFeeUpdated(uint256 newFee);
    event ProtocolFeeUpdated(uint32 newBps);
    event TreasuryUpdated(address newTreasury);
    event LoyaltyRewardClaimed(uint256 indexed policyId, address indexed claimant, uint256 amount);
    event ClaimSubmittedForVote(uint256 indexed claimId, uint256 indexed policyId);
    event ClaimVoteRecorded(uint256 indexed claimId, address indexed voter, bool support);
    event ClaimPaidViaVote(uint256 indexed claimId, uint256 indexed policyId, uint256 amount);
    event PremiumAdjusted(uint256 indexed policyId, uint256 newPremium);
    event FlashClaimPaid(uint256 indexed policyId, address indexed claimant, uint256 amount);

    // ============ Modifiers ============
    modifier onlyPolicyHolder(uint256 policyId) {
        require(policies[policyId].buyer == msg.sender, "Only policy holder can perform this action");
        _;
    }

    modifier policyExists(uint256 policyId) {
        require(policies[policyId].id != 0, "Policy does not exist");
        _;
    }

    modifier validAsset(string memory assetSymbol) {
        require(priceFeeds[assetSymbol] != address(0), "Unsupported asset symbol");
        _;
    }

    // ============ Constructor ============
    constructor() {
        treasury = DEFAULT_TREASURY;

        // Initialize price feeds for common assets
        // These would be set to actual Chainlink price feed addresses
        priceFeeds["BTC"] = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599; // BTC/USD
        priceFeeds["ETH"] = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419; // ETH/USD
        priceFeeds["USDC"] = 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6; // USDC/USD
            // Add more as needed
    }

    // ============ Core Functions ============

    /**
     * @dev Create a new monthly insurance policy
     */
    function createMonthlyPolicy(
        string memory assetSymbol,
        uint256 strikePrice,
        uint256 coverageAmount,
        uint256 monthlyPremium
    ) external  validAsset(assetSymbol) returns (uint256) {
        require(strikePrice > 0, "Invalid strike price");
        require(coverageAmount > 0, "Invalid coverage amount");
        require(monthlyPremium > 0, "Invalid premium");

        policyCounter = policyCounter.add(1);
        uint256 currentTimestamp = block.timestamp;
        uint256 nextPaymentDue = currentTimestamp.add(30 days);
        uint256 gracePeriodEnd = nextPaymentDue.add(gracePeriodDays.mul(1 days));

        Policy memory newPolicy = Policy({
            id: policyCounter,
            buyer: msg.sender,
            assetSymbol: assetSymbol,
            strikePrice: strikePrice,
            coverageAmount: coverageAmount,
            monthlyPremium: monthlyPremium,
            nextPaymentDue: nextPaymentDue,
            gracePeriodEnd: gracePeriodEnd,
            active: true,
            canceled: false,
            totalPremiumsPaid: 0,
            monthsActive: 0,
            lastPaymentTimestamp: 0,
            monthsSinceClaim: 0,
            lastClaimTimestamp: 0,
            loyaltyRewardsClaimed: 0
        });

        // Transfer premium payment
        IERC20(KALE_TOKEN).safeTransferFrom(msg.sender, address(this), monthlyPremium);

        // Apply protocol fee and add to pool
        uint256 netAmount = applyProtocolFee(monthlyPremium);
        poolBalance = poolBalance.add(netAmount);
        totalCoverage = totalCoverage.add(coverageAmount);

        // Update policy after first payment
        newPolicy.totalPremiumsPaid = monthlyPremium;
        newPolicy.monthsActive = 1;
        newPolicy.lastPaymentTimestamp = currentTimestamp;
        policies[policyCounter] = newPolicy;

        // Record payment
        paymentRecords[policyCounter][1] =
            PaymentRecord({policyId: policyCounter, amount: monthlyPremium, timestamp: currentTimestamp, month: 1});

        // Index under buyer
        policiesByBuyer[msg.sender].push(policyCounter);

        emit MonthlyPolicyCreated(policyCounter, msg.sender, assetSymbol);
        return policyCounter;
    }

    /**
     * @dev Pay monthly premium for an existing policy
     */
    function payMonthlyPremium(uint256 policyId)
        external
        policyExists(policyId)
        onlyPolicyHolder(policyId)
        returns (bool)
    {
        Policy storage policy = policies[policyId];
        require(policy.active && !policy.canceled, "Policy not active");
        require(block.timestamp >= policy.nextPaymentDue, "Payment not due yet");
        require(block.timestamp <= policy.gracePeriodEnd, "Policy expired");

        // Transfer premium payment
        IERC20(KALE_TOKEN).safeTransferFrom(msg.sender, address(this), policy.monthlyPremium);

        // Apply protocol fee and add to pool
        uint256 netAmount = applyProtocolFee(policy.monthlyPremium);
        poolBalance = poolBalance.add(netAmount);

        // Update policy
        policy.totalPremiumsPaid = policy.totalPremiumsPaid.add(policy.monthlyPremium);
        policy.monthsActive = policy.monthsActive.add(1);
        policy.monthsSinceClaim = policy.monthsSinceClaim.add(1);
        policy.lastPaymentTimestamp = block.timestamp;
        policy.nextPaymentDue = block.timestamp.add(30 days);
        policy.gracePeriodEnd = policy.nextPaymentDue.add(gracePeriodDays.mul(1 days));

        // Record payment
        paymentRecords[policyId][policy.monthsActive] = PaymentRecord({
            policyId: policyId,
            amount: policy.monthlyPremium,
            timestamp: block.timestamp,
            month: policy.monthsActive
        });

        emit MonthlyPremiumPaid(policyId, msg.sender, policy.monthlyPremium);
        return true;
    }

    /**
     * @dev Cancel an active policy
     */
    function cancelPolicy(uint256 policyId) external policyExists(policyId) onlyPolicyHolder(policyId) returns (bool) {
        Policy storage policy = policies[policyId];
        require(policy.active && !policy.canceled, "Policy not active");

        policy.active = false;
        policy.canceled = true;
        totalCoverage = totalCoverage.sub(policy.coverageAmount);

        emit PolicyCanceled(policyId, msg.sender);
        return true;
    }

    /**
     * @dev Check if a policy is still active
     */
    function checkPolicyStatus(uint256 policyId) external policyExists(policyId) returns (bool) {
        Policy storage policy = policies[policyId];

        if (!policy.active || policy.canceled) {
            return false;
        }

        if (block.timestamp > policy.gracePeriodEnd) {
            policy.active = false;
            totalCoverage = totalCoverage.sub(policy.coverageAmount);
            emit PolicyExpired(policyId);
            return false;
        }

        return true;
    }

    /**
     * @dev Process monthly renewals and expire overdue policies
     */
    function processMonthlyRennewals() external returns (uint32) {
        uint32 expiredCount = 0;

        for (uint256 i = 1; i <= policyCounter; i++) {
            Policy storage policy = policies[i];
            if (policy.active && !policy.canceled && block.timestamp > policy.gracePeriodEnd) {
                policy.active = false;
                totalCoverage = totalCoverage.sub(policy.coverageAmount);
                expiredCount = expiredCount.add(1);
                emit PolicyExpired(i);
            }
        }

        return expiredCount;
    }

    /**
     * @dev Check if payout conditions are met and execute payout
     */
    function checkAndPayout(uint256 policyId) external  policyExists(policyId) returns (bool) {
        Policy storage policy = policies[policyId];
        require(policy.active && !policy.canceled, "Policy not active");
        require(block.timestamp <= policy.gracePeriodEnd, "Policy expired");

        // Get current price from Chainlink
        uint256 currentPrice = getCurrentPrice(policy.assetSymbol);
        require(currentPrice > 0, "Unable to get current price");

        // Check if strike price is breached
        if (currentPrice < policy.strikePrice) {
            require(poolBalance >= policy.coverageAmount, "Insufficient pool balance");

            // Transfer payout
            IERC20(KALE_TOKEN).safeTransfer(policy.buyer, policy.coverageAmount);
            poolBalance = poolBalance.sub(policy.coverageAmount);

            // Update policy
            policy.active = false;
            policy.monthsSinceClaim = 0;
            policy.lastClaimTimestamp = block.timestamp;

            // Update stats
            claimsPaid = claimsPaid.add(policy.coverageAmount);

            emit ClaimPaid(policyId, policy.buyer, policy.coverageAmount);
            return true;
        }

        return false;
    }

    // ============ Pool Management ============

    /**
     * @dev Add funds to the insurance pool
     */
    function addToPool(uint256 amount) external  {
        require(amount > 0, "Amount must be greater than 0");

        IERC20(KALE_TOKEN).safeTransferFrom(msg.sender, address(this), amount);

        // Calculate shares to mint
        uint256 sharesToMint;
        if (totalShares == 0 || poolBalance == 0) {
            sharesToMint = amount;
        } else {
            sharesToMint = amount.mul(totalShares).div(poolBalance);
        }

        // Update shares
        lpShares[msg.sender] = lpShares[msg.sender].add(sharesToMint);
        totalShares = totalShares.add(sharesToMint);
        poolBalance = poolBalance.add(amount);

        emit PoolFunded(msg.sender, amount, sharesToMint);
    }

    /**
     * @dev Withdraw funds from the insurance pool
     */
    function withdrawFromPool(uint256 shares) external  returns (uint256) {
        require(shares > 0, "Shares must be greater than 0");
        require(lpShares[msg.sender] >= shares, "Insufficient shares");
        require(totalShares > 0, "No shares exist");
        require(poolBalance > 0, "Pool is empty");

        uint256 amountOut = shares.mul(poolBalance).div(totalShares);

        // Update shares and pool
        lpShares[msg.sender] = lpShares[msg.sender].sub(shares);
        totalShares = totalShares.sub(shares);
        poolBalance = poolBalance.sub(amountOut);

        // Transfer tokens
        IERC20(KALE_TOKEN).safeTransfer(msg.sender, amountOut);

        emit LPWithdraw(msg.sender, shares, amountOut);
        return amountOut;
    }

    // ============ Oracle Functions ============

    /**
     * @dev Get current price for an asset from Chainlink
     */
    function getCurrentPrice(string memory assetSymbol) public view returns (uint256) {
        address priceFeedAddress = priceFeeds[assetSymbol];
        require(priceFeedAddress != address(0), "Price feed not found");

        AggregatorV3Interface priceFeed = AggregatorV3Interface(priceFeedAddress);
        (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
            priceFeed.latestRoundData();

        require(price > 0, "Invalid price");
        require(updatedAt > 0, "Round not complete");
        require(block.timestamp - updatedAt <= 3600, "Price too stale"); // 1 hour

        return uint256(price);
    }

    /**
     * @dev Set price feed for an asset
     */
    function setPriceFeed(string memory assetSymbol, address priceFeedAddress) external onlyOwner {
        require(priceFeedAddress != address(0), "Invalid price feed address");
        priceFeeds[assetSymbol] = priceFeedAddress;
    }

    // ============ Admin Functions ============

    function setGracePeriod(uint32 newGracePeriod) external onlyOwner {
        gracePeriodDays = newGracePeriod;
        emit GracePeriodUpdated(newGracePeriod);
    }

    function setMonthlyRenewalFee(uint256 fee) external onlyOwner {
        monthlyRenewalFee = fee;
        emit RenewalFeeUpdated(fee);
    }

    function setProtocolFeeBps(uint32 bps) external onlyOwner {
        require(bps <= 10000, "Fee too high");
        protocolFeeBps = bps;
        emit ProtocolFeeUpdated(bps);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    // ============ Advanced Features ============

    /**
     * @dev Claim loyalty rewards for long-term policyholders
     */
    function claimLoyaltyRewards(uint256 policyId)
        external
        policyExists(policyId)
        onlyPolicyHolder(policyId)
        returns (uint256)
    {
        Policy storage policy = policies[policyId];
        require(policy.active && !policy.canceled, "Policy not active");
        require(policy.monthsSinceClaim >= loyaltyMonthsThreshold, "Not enough claim-free months");

        uint256 reward = policy.totalPremiumsPaid.mul(loyaltyRewardBps).div(10000);
        require(reward > 0 && poolBalance >= reward, "Insufficient pool for loyalty reward");

        // Transfer reward
        IERC20(KALE_TOKEN).safeTransfer(msg.sender, reward);
        poolBalance = poolBalance.sub(reward);

        // Update policy
        policy.loyaltyRewardsClaimed = policy.loyaltyRewardsClaimed.add(reward);
        policy.monthsSinceClaim = 0;

        emit LoyaltyRewardClaimed(policyId, msg.sender, reward);
        return reward;
    }

    /**
     * @dev Submit a claim for community voting
     */
    function submitClaimForVote(uint256 policyId)
        external
        policyExists(policyId)
        onlyPolicyHolder(policyId)
        returns (uint256)
    {
        Policy storage policy = policies[policyId];
        require(policy.active && !policy.canceled, "Policy inactive");

        claimCounter = claimCounter.add(1);
        claims[claimCounter] = ClaimProposal({
            id: claimCounter,
            policyId: policyId,
            claimant: msg.sender,
            yesVotes: 0,
            noVotes: 0,
            startTimestamp: block.timestamp,
            executed: false
        });

        emit ClaimSubmittedForVote(claimCounter, policyId);
        return claimCounter;
    }

    /**
     * @dev Vote on a claim proposal
     */
    function voteOnClaim(uint256 claimId, bool support) external returns (bool) {
        require(claims[claimId].id != 0, "Claim not found");
        require(!claims[claimId].executed, "Already executed");
        require(!hasVoted[msg.sender], "Already voted");

        hasVoted[msg.sender] = true;
        if (support) {
            claims[claimId].yesVotes = claims[claimId].yesVotes.add(1);
        } else {
            claims[claimId].noVotes = claims[claimId].noVotes.add(1);
        }

        emit ClaimVoteRecorded(claimId, msg.sender, support);
        return true;
    }

    /**
     * @dev Finalize a claim vote and execute if approved
     */
    function finalizeClaimVote(uint256 claimId) external returns (bool) {
        ClaimProposal storage proposal = claims[claimId];
        require(proposal.id != 0, "Claim not found");
        require(!proposal.executed, "Already executed");

        uint32 totalVotes = proposal.yesVotes.add(proposal.noVotes);
        require(totalVotes >= 3, "Quorum not met");

        bool approve = proposal.yesVotes > proposal.noVotes;
        if (approve) {
            Policy storage policy = policies[proposal.policyId];
            require(policy.active && !policy.canceled, "Policy inactive");
            require(poolBalance >= policy.coverageAmount, "Insufficient pool balance");

            // Execute payout
            IERC20(KALE_TOKEN).safeTransfer(policy.buyer, policy.coverageAmount);
            poolBalance = poolBalance.sub(policy.coverageAmount);

            // Update policy
            policy.active = false;
            policy.monthsSinceClaim = 0;
            policy.lastClaimTimestamp = block.timestamp;

            // Update stats
            claimsPaid = claimsPaid.add(policy.coverageAmount);

            emit ClaimPaidViaVote(claimId, proposal.policyId, policy.coverageAmount);
        }

        proposal.executed = true;
        return true;
    }

    /**
     * @dev Adjust premium for a policy (admin only)
     */
    function adjustPremium(uint256 policyId, uint256 newPremium) external onlyOwner policyExists(policyId) {
        policies[policyId].monthlyPremium = newPremium;
        emit PremiumAdjusted(policyId, newPremium);
    }

    /**
     * @dev Execute flash claim for small amounts
     */
    function flashClaim(uint256 policyId, uint256 claimAmount)
        external
        policyExists(policyId)
        onlyPolicyHolder(policyId)
        returns (bool)
    {
        Policy storage policy = policies[policyId];
        require(policy.active && !policy.canceled, "Policy not active");
        require(claimAmount <= flashClaimThreshold, "Over flash claim threshold");

        // Check if strike price is breached
        uint256 currentPrice = getCurrentPrice(policy.assetSymbol);
        require(currentPrice < policy.strikePrice, "No trigger");
        require(poolBalance >= claimAmount, "Insufficient pool balance");

        // Execute payout
        IERC20(KALE_TOKEN).safeTransfer(msg.sender, claimAmount);
        poolBalance = poolBalance.sub(claimAmount);

        // Update policy (keep active for small claims)
        policy.monthsSinceClaim = 0;
        policy.lastClaimTimestamp = block.timestamp;
        claimsPaid = claimsPaid.add(claimAmount);

        emit FlashClaimPaid(policyId, msg.sender, claimAmount);
        return true;
    }

    // ============ View Functions ============

    function getPolicy(uint256 policyId) external view policyExists(policyId) returns (Policy memory) {
        return policies[policyId];
    }

    function getPaymentHistory(uint256 policyId)
        external
        view
        policyExists(policyId)
        returns (PaymentRecord[] memory)
    {
        Policy memory policy = policies[policyId];
        PaymentRecord[] memory payments = new PaymentRecord[](policy.monthsActive);

        for (uint32 i = 1; i <= policy.monthsActive; i++) {
            payments[i - 1] = paymentRecords[policyId][i];
        }

        return payments;
    }

    function getPoliciesByBuyer(address buyer) external view returns (uint256[] memory) {
        return policiesByBuyer[buyer];
    }

    function activePolicyCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= policyCounter; i++) {
            if (policies[i].active && !policies[i].canceled) {
                count = count.add(1);
            }
        }
        return count;
    }

    function getPoolRiskScore() external view returns (uint256) {
        if (totalCoverage == 0) return 0;
        return claimsPaid.mul(100000).div(totalCoverage);
    }

    function lpSharesOf(address lp) external view returns (uint256) {
        return lpShares[lp];
    }

    // ============ Internal Functions ============

    function applyProtocolFee(uint256 amount) internal returns (uint256) {
        if (protocolFeeBps == 0) return amount;

        uint256 fee = amount.mul(protocolFeeBps).div(10000);
        if (fee > 0) {
            IERC20(KALE_TOKEN).safeTransfer(treasury, fee);
        }

        return amount.sub(fee);
    }
}
