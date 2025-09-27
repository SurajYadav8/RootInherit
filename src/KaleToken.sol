// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title KaleToken
 * @dev ERC20 token for the Kale Shield insurance platform
 * @notice This replaces the Stellar asset issuance model
 */
contract KaleToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ReentrancyGuard {
    uint256 public constant INITIAL_SUPPLY = 1000000000 * 10 ** 18; // 1 billion tokens
    uint256 public constant MAX_SUPPLY = 10000000000 * 10 ** 18; // 10 billion max supply

    // Minting control
    bool public mintingEnabled = true;
    uint256 public mintingCap = 5000000000 * 10 ** 18; // 5 billion minting cap

    // Treasury and insurance contract addresses
    address public treasury;
    address public insuranceContract;

    // Events
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event InsuranceContractUpdated(address indexed oldContract, address indexed newContract);
    event MintingEnabledUpdated(bool enabled);
    event MintingCapUpdated(uint256 oldCap, uint256 newCap);
    event TokensMinted(address indexed to, uint256 amount, string reason);

    constructor(string memory name, string memory symbol, address _treasury) ERC20(name, symbol) {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;

        // Mint initial supply to treasury
        _mint(treasury, INITIAL_SUPPLY);
    }

    // ============ Modifiers ============
    modifier onlyInsuranceContract() {
        require(msg.sender == insuranceContract, "Only insurance contract can call this");
        _;
    }

    modifier whenMintingEnabled() {
        require(mintingEnabled, "Minting is disabled");
        _;
    }

    // ============ Owner Functions ============

    /**
     * @dev Set the treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @dev Set the insurance contract address
     */
    function setInsuranceContract(address _insuranceContract) external onlyOwner {
        require(_insuranceContract != address(0), "Invalid insurance contract address");
        address oldContract = insuranceContract;
        insuranceContract = _insuranceContract;
        emit InsuranceContractUpdated(oldContract, _insuranceContract);
    }

    /**
     * @dev Enable or disable minting
     */
    function setMintingEnabled(bool _enabled) external onlyOwner {
        mintingEnabled = _enabled;
        emit MintingEnabledUpdated(_enabled);
    }

    /**
     * @dev Set the minting cap
     */
    function setMintingCap(uint256 _cap) external onlyOwner {
        require(_cap <= MAX_SUPPLY, "Cap exceeds max supply");
        uint256 oldCap = mintingCap;
        mintingCap = _cap;
        emit MintingCapUpdated(oldCap, _cap);
    }

    /**
     * @dev Pause token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Insurance Contract Functions ============

    /**
     * @dev Mint tokens for insurance payouts
     */
    function mintForPayout(address to, uint256 amount, string memory reason)
        external
        onlyInsuranceContract
        whenMintingEnabled
        nonReentrant
    {
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(totalSupply() + amount <= mintingCap, "Minting would exceed cap");

        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    /**
     * @dev Mint tokens for liquidity rewards
     */
    function mintForLiquidity(address to, uint256 amount)
        external
        onlyInsuranceContract
        whenMintingEnabled
        nonReentrant
    {
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(totalSupply() + amount <= mintingCap, "Minting would exceed cap");

        _mint(to, amount);
        emit TokensMinted(to, amount, "Liquidity Reward");
    }

    // ============ Treasury Functions ============

    /**
     * @dev Mint tokens to treasury (for protocol fees, etc.)
     */
    function mintToTreasury(uint256 amount, string memory reason) external onlyOwner whenMintingEnabled nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(totalSupply() + amount <= mintingCap, "Minting would exceed cap");

        _mint(treasury, amount);
        emit TokensMinted(treasury, amount, reason);
    }

    // ============ Override Functions ============

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }

    // ============ View Functions ============

    /**
     * @dev Get the remaining mintable supply
     */
    function remainingMintableSupply() external view returns (uint256) {
        return mintingCap - totalSupply();
    }

    /**
     * @dev Check if an amount can be minted
     */
    function canMint(uint256 amount) external view returns (bool) {
        return mintingEnabled && totalSupply() + amount <= mintingCap;
    }
}
