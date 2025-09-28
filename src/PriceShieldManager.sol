// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PriceFeedManager
 * @dev Centralized price feed management for multiple assets
 * @notice Replaces Stellar's Reflector oracle system
 */
contract PriceFeedManager is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // ============ Structs ============
    struct PriceFeed {
        address feedAddress;
        uint8 decimals;
        bool isActive;
        uint256 maxStaleness; // Maximum staleness in seconds
    }

    struct PriceData {
        uint256 price;
        uint256 timestamp;
        bool isValid;
    }

    // ============ State Variables ============
    mapping(string => PriceFeed) public priceFeeds;
    mapping(string => PriceData) public lastPrices;

    string[] public supportedAssets;
    uint256 public defaultMaxStaleness = 3600; // 1 hour default
    uint256 public constant MAX_STALENESS = 86400; // 24 hours max

    // ============ Events ============
    event PriceFeedAdded(string indexed asset, address indexed feedAddress, uint8 decimals);
    event PriceFeedUpdated(string indexed asset, address indexed oldFeed, address indexed newFeed);
    event PriceFeedRemoved(string indexed asset);
    event PriceUpdated(string indexed asset, uint256 price, uint256 timestamp);
    event MaxStalenessUpdated(uint256 oldStaleness, uint256 newStaleness);

    // ============ Modifiers ============
    modifier onlyValidAsset(string memory asset) {
        require(priceFeeds[asset].isActive, "Asset not supported");
        _;
    }

    modifier onlyValidPriceFeed(address feedAddress) {
        require(feedAddress != address(0), "Invalid price feed address");
        _;
    }

    // ============ Constructor ============
    constructor() {
        // Initialize with common price feeds
        // These addresses are for Ethereum mainnet - adjust for your target network
        _addPriceFeed("BTC", 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599, 8);
        _addPriceFeed("ETH", 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419, 8);
        _addPriceFeed("USDC", 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6, 8);
        _addPriceFeed("USDT", 0x3E7d1EaB13aDbe4c4b69B68d24099E4c9A9B39F4, 8);
        _addPriceFeed("LINK", 0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c, 8);
        _addPriceFeed("UNI", 0x553303d460EE0afB37EdFf9bE42922D8FF63220e, 8);
    }

    // ============ Owner Functions ============

    /**
     * @dev Add a new price feed for an asset
     */
    function addPriceFeed(string memory asset, address feedAddress, uint8 decimals)
        external
        onlyOwner
        onlyValidPriceFeed(feedAddress)
    {
        require(!priceFeeds[asset].isActive, "Asset already has price feed");

        _addPriceFeed(asset, feedAddress, decimals);
    }

    /**
     * @dev Update an existing price feed
     */
    function updatePriceFeed(string memory asset, address newFeedAddress)
        external
        onlyOwner
        onlyValidAsset(asset)
        onlyValidPriceFeed(newFeedAddress)
    {
        address oldFeed = priceFeeds[asset].feedAddress;
        priceFeeds[asset].feedAddress = newFeedAddress;

        emit PriceFeedUpdated(asset, oldFeed, newFeedAddress);
    }

    /**
     * @dev Remove a price feed
     */
    function removePriceFeed(string memory asset) external onlyOwner onlyValidAsset(asset) {
        priceFeeds[asset].isActive = false;

        // Remove from supported assets array
        for (uint256 i = 0; i < supportedAssets.length; i++) {
            if (keccak256(bytes(supportedAssets[i])) == keccak256(bytes(asset))) {
                supportedAssets[i] = supportedAssets[supportedAssets.length - 1];
                supportedAssets.pop();
                break;
            }
        }

        emit PriceFeedRemoved(asset);
    }

    /**
     * @dev Set custom staleness threshold for an asset
     */
    function setAssetMaxStaleness(string memory asset, uint256 maxStaleness) external onlyOwner onlyValidAsset(asset) {
        require(maxStaleness <= MAX_STALENESS, "Staleness too high");
        priceFeeds[asset].maxStaleness = maxStaleness;
    }

    /**
     * @dev Set default max staleness for all assets
     */
    function setDefaultMaxStaleness(uint256 maxStaleness) external onlyOwner {
        require(maxStaleness <= MAX_STALENESS, "Staleness too high");
        uint256 oldStaleness = defaultMaxStaleness;
        defaultMaxStaleness = maxStaleness;
        emit MaxStalenessUpdated(oldStaleness, maxStaleness);
    }

    // ============ Public Functions ============

    /**
     * @dev Get current price for an asset
     */
    function getCurrentPrice(string memory asset) external view onlyValidAsset(asset) returns (uint256) {
        PriceFeed memory feed = priceFeeds[asset];
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed.feedAddress);

        (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
            priceFeed.latestRoundData();

        require(price > 0, "Invalid price");
        require(updatedAt > 0, "Round not complete");
        require(block.timestamp - updatedAt <= feed.maxStaleness, "Price too stale");

        return uint256(price);
    }

    /**
     * @dev Get price with validation
     */
    function getValidatedPrice(string memory asset) external view onlyValidAsset(asset) returns (PriceData memory) {
        PriceFeed memory feed = priceFeeds[asset];
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed.feedAddress);

        (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
            priceFeed.latestRoundData();

        bool isValid = price > 0 && updatedAt > 0 && block.timestamp - updatedAt <= feed.maxStaleness;

        return PriceData({price: uint256(price), timestamp: updatedAt, isValid: isValid});
    }

    /**
     * @dev Get historical price at a specific timestamp
     */
    function getHistoricalPrice(string memory asset, uint256 timestamp)
        external
        view
        onlyValidAsset(asset)
        returns (uint256)
    {
        PriceFeed memory feed = priceFeeds[asset];
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed.feedAddress);

        // Get the round ID for the given timestamp
        uint80 roundId = priceFeed.getRoundIdAtTimestamp(timestamp);
        require(roundId > 0, "No data for timestamp");

        (uint80 id, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
            priceFeed.getRoundData(roundId);

        require(price > 0, "Invalid historical price");
        return uint256(price);
    }

    /**
     * @dev Update and cache the latest price
     */
    function updatePrice(string memory asset) external onlyValidAsset(asset) nonReentrant returns (uint256) {
        uint256 price = this.getCurrentPrice(asset);
        uint256 timestamp = block.timestamp;

        lastPrices[asset] = PriceData({price: price, timestamp: timestamp, isValid: true});

        emit PriceUpdated(asset, price, timestamp);
        return price;
    }

    /**
     * @dev Get cached price if still valid
     */
    function getCachedPrice(string memory asset) external view onlyValidAsset(asset) returns (PriceData memory) {
        PriceData memory cachedPrice = lastPrices[asset];
        PriceFeed memory feed = priceFeeds[asset];

        if (cachedPrice.isValid && block.timestamp - cachedPrice.timestamp <= feed.maxStaleness) {
            return cachedPrice;
        }

        return PriceData({price: 0, timestamp: 0, isValid: false});
    }

    // ============ View Functions ============

    /**
     * @dev Get all supported assets
     */
    function getSupportedAssets() external view returns (string[] memory) {
        return supportedAssets;
    }

    /**
     * @dev Check if an asset is supported
     */
    function isAssetSupported(string memory asset) external view returns (bool) {
        return priceFeeds[asset].isActive;
    }

    /**
     * @dev Get price feed info for an asset
     */
    function getPriceFeedInfo(string memory asset) external view returns (PriceFeed memory) {
        return priceFeeds[asset];
    }

    /**
     * @dev Get price feed decimals for an asset
     */
    function getPriceFeedDecimals(string memory asset) external view onlyValidAsset(asset) returns (uint8) {
        return priceFeeds[asset].decimals;
    }

    // ============ Internal Functions ============

    function _addPriceFeed(string memory asset, address feedAddress, uint8 decimals) internal {
        priceFeeds[asset] =
            PriceFeed({feedAddress: feedAddress, decimals: decimals, isActive: true, maxStaleness: defaultMaxStaleness});

        supportedAssets.push(asset);
        emit PriceFeedAdded(asset, feedAddress, decimals);
    }
}

// SafeMath library for older Solidity versions
library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "SafeMath: subtraction overflow");
        return a - b;
    }

    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: division by zero");
        return a / b;
    }
}
