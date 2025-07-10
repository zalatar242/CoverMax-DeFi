// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ITranche {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

interface IAdapterManager {
    function depositFunds(uint256 amount) external returns (uint256);
}

interface ITimeManager {
    function canSplitRisk() external view returns (bool);
    function checkAndResetTime() external returns (bool);
    function getTimePeriods() external view returns (uint256, uint256, uint256, uint256);
}

interface IClaimManager {
    function processClaim(address user, uint256 amountAAA, uint256 amountAA, uint256 totalTranches, uint256 totalInvested) external returns (uint256, uint256);
    function getUserBalances(address user) external view returns (uint256, uint256);
}

/// @title Insurance Core - Main insurance contract with modular architecture
contract InsuranceCore {
    address public owner;
    address public AAA;
    address public AA;
    address public usdc;
    address public adapterManager;
    address public timeManager;
    address public claimManager;

    uint256 public totalTranches;
    uint256 public totalInvested;

    event RiskSplit(address indexed splitter, uint256 amountUsdc);
    event Initialized(address usdc, address owner);

    bool private initialized;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Insurance: not owner");
        _;
    }

    function initialize(
        address usdcAddress,
        address _adapterManager,
        address _timeManager,
        address _claimManager
    ) external onlyOwner {
        require(!initialized, "Insurance: already initialized");
        initialized = true;
        usdc = usdcAddress;
        adapterManager = _adapterManager;
        timeManager = _timeManager;
        claimManager = _claimManager;
        emit Initialized(usdcAddress, owner);
    }

    function setTranches(address _AAA, address _AA) external onlyOwner {
        require(AAA == address(0) && AA == address(0), "Insurance: tranches already set");
        AAA = _AAA;
        AA = _AA;

        // Keep ownership with InsuranceCore for minting/burning operations
        // ClaimManager will call back to InsuranceCore for burning
    }

    function splitRisk(uint256 amountUsdc) external {
        // Reset time if needed
        ITimeManager(timeManager).checkAndResetTime();

        // Check amount validations first
        require(amountUsdc >= 2000000, "Insurance: amount too low");
        require(amountUsdc % 2 == 0, "Insurance: Amount must be divisible by 2");
        require(ITimeManager(timeManager).canSplitRisk(), "Insurance: issuance ended");

        IERC20(usdc).transferFrom(msg.sender, address(this), amountUsdc);
        IERC20(usdc).approve(adapterManager, amountUsdc);

        uint256 deposited = IAdapterManager(adapterManager).depositFunds(amountUsdc);
        totalInvested += deposited;

        uint256 trancheAmount = amountUsdc / 2;
        ITranche(AAA).mint(msg.sender, trancheAmount);
        ITranche(AA).mint(msg.sender, trancheAmount);
        totalTranches += amountUsdc;

        emit RiskSplit(msg.sender, amountUsdc);
    }

    function claim(uint256 amountAAA, uint256 amountAA) external {
        (uint256 totalWithdrawn, uint256 totalTokens) = IClaimManager(claimManager).processClaim(
            msg.sender,
            amountAAA,
            amountAA,
            totalTranches,
            totalInvested
        );

        // Update state
        totalInvested -= totalWithdrawn;
        totalTranches -= totalTokens;

        // Transfer USDC to user (AdapterManager sends USDC to InsuranceCore)
        if (totalWithdrawn > 0) {
            IERC20(usdc).transfer(msg.sender, totalWithdrawn);
        }
    }

    function claimAll() external {
        (uint256 balanceAAA, uint256 balanceAA) = IClaimManager(claimManager).getUserBalances(msg.sender);
        require(balanceAAA > 0 || balanceAA > 0, "Insurance: No AAA or AA tokens to claim");

        (uint256 totalWithdrawn, uint256 totalTokens) = IClaimManager(claimManager).processClaim(
            msg.sender,
            balanceAAA,
            balanceAA,
            totalTranches,
            totalInvested
        );

        // Update state
        totalInvested -= totalWithdrawn;
        totalTranches -= totalTokens;

        // Transfer USDC to user (AdapterManager sends USDC to InsuranceCore)
        if (totalWithdrawn > 0) {
            IERC20(usdc).transfer(msg.sender, totalWithdrawn);
        }
    }

    function getInfo() external view returns (address, address, bool, uint256, uint256, uint256, uint256, uint256, uint256) {
        if (timeManager == address(0)) {
            // If time manager not set, return default values
            return (owner, usdc, initialized, 0, 0, 0, 0, totalTranches, totalInvested);
        }

        try ITimeManager(timeManager).getTimePeriods() returns (uint256 S, uint256 T1, uint256 T2, uint256 T3) {
            return (owner, usdc, initialized, S, T1, T2, T3, totalTranches, totalInvested);
        } catch {
            // If time manager call fails, return default time periods
            return (owner, usdc, initialized, 0, 0, 0, 0, totalTranches, totalInvested);
        }
    }

    function getUserDeposit(address user) external view returns (uint256) {
        return ITranche(AAA).balanceOf(user) + ITranche(AA).balanceOf(user);
    }

    /// @notice Burn tranche tokens - only callable by ClaimManager
    function burnTokens(address user, uint256 amountAAA, uint256 amountAA) external {
        require(msg.sender == claimManager, "Insurance: only claim manager");

        if (amountAAA > 0) {
            ITranche(AAA).burn(user, amountAAA);
        }
        if (amountAA > 0) {
            ITranche(AA).burn(user, amountAA);
        }
    }
}
