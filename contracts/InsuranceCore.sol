// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ITranche.sol";

/// @title Insurance Core - Main insurance contract with full functionality
contract InsuranceCore {
    /* Contract addresses */
    address public owner;
    address public AAA; // Tranche AAA token contract
    address public AA; // Tranche AA token contract
    address public usdc; // USDC token
    address public adapterManager; // Adapter manager contract
    address public calculator; // Calculator contract

    /* Math helper for decimal numbers */
    uint256 private constant RAY = 1e27; // Used for floating point math
    uint256 private constant MINIMUM_AMOUNT = 2; // Minimum split amount

    /* Time periods */
    uint256 public S; // Start/split end
    uint256 public T1; // Insurance end
    uint256 public T2; // AAA tokens claim start
    uint256 public T3; // Final claim end (AAA and AA)

    /* State tracking */
    uint256 public totalTranches; // Total AAA + AA tokens
    uint256 public totalInvested; // Total amount invested across adapters

    /* Events */
    event RiskSplit(address indexed splitter, uint256 amountUsdc);
    event Claim(address indexed claimant, uint256 amountAAA, uint256 amountAA, uint256 amountUsdc);
    event Initialized(address usdc, address owner);

    bool private initialized;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function initialize(
        address usdcAddress,
        uint256 _S,
        uint256 _T1,
        uint256 _T2,
        uint256 _T3,
        address _adapterManager,
        address _calculator
    ) external onlyOwner {
        require(!initialized, "Already initialized");
        require(usdcAddress != address(0), "Insurance: USDC address cannot be zero");

        initialized = true;
        usdc = usdcAddress;
        adapterManager = _adapterManager;
        calculator = _calculator;

        // Set time periods
        S = _S;
        T1 = _T1;
        T2 = _T2;
        T3 = _T3;

        emit Initialized(usdcAddress, owner);
    }

    function setTranches(address _AAA, address _AA) external onlyOwner {
        require(AAA == address(0) && AA == address(0), "Tranches already set");
        AAA = _AAA;
        AA = _AA;
    }

    function _resetTimePeriods() internal {
        S = block.timestamp + 2 days;
        T1 = S + 5 days;
        T2 = T1 + 1 days;
        T3 = T2 + 1 days;
    }

    function _mintTranches(address recipient, uint256 amount) internal {
        uint256 trancheAmount = amount / 2;
        ITranche(AAA).mint(recipient, trancheAmount);
        ITranche(AA).mint(recipient, trancheAmount);
        totalTranches += amount;
    }

    function _burnTranches(address account, uint256 amountAAA, uint256 amountAA) internal {
        require(amountAAA > 0 || amountAA > 0, "Insurance: AmountAAA and AmountAA cannot both be zero");

        if (amountAAA > 0) {
            require(ITranche(AAA).balanceOf(account) >= amountAAA, "Insurance: insufficient AAA balance");
            ITranche(AAA).burn(account, amountAAA);
        }
        if (amountAA > 0) {
            require(ITranche(AA).balanceOf(account) >= amountAA, "Insurance: insufficient AA balance");
            ITranche(AA).burn(account, amountAA);
        }

        totalTranches -= (amountAAA + amountAA);
    }

    function splitRisk(uint256 amountUsdc) external {
        if (block.timestamp > T3) {
            _resetTimePeriods();
        }
        require(block.timestamp < S, "Insurance: issuance ended");
        require(amountUsdc > MINIMUM_AMOUNT, "Insurance: amount too low");
        require(amountUsdc % 2 == 0, "Insurance: Amount must be divisible by 2");

        IERC20 usdcToken = IERC20(usdc);
        require(usdcToken.transferFrom(msg.sender, address(this), amountUsdc), "Insurance: USDC transfer failed");

        // Approve adapter manager to spend USDC
        require(usdcToken.approve(adapterManager, amountUsdc), "Approval failed");

        // Call adapter manager to deposit funds
        (bool success, bytes memory data) = adapterManager.call(
            abi.encodeWithSignature("depositFunds(uint256)", amountUsdc)
        );
        require(success, "Deposit failed");

        uint256 deposited = abi.decode(data, (uint256));
        totalInvested += deposited;

        _mintTranches(msg.sender, amountUsdc);
        emit RiskSplit(msg.sender, amountUsdc);
    }

    function claim(uint256 amountAAA, uint256 amountAA) external {
        _claim(amountAAA, amountAA);
    }

    function claimAll() external {
        uint256 balanceAAA = ITranche(AAA).balanceOf(msg.sender);
        uint256 balanceAA = ITranche(AA).balanceOf(msg.sender);

        require(balanceAAA > 0 || balanceAA > 0, "Insurance: No AAA or AA tokens to claim");

        _claim(balanceAAA, balanceAA);
    }

    function _claim(uint256 amountAAA, uint256 amountAA) internal {
        if (block.timestamp > T3) {
            _resetTimePeriods();
        }
        require(
            block.timestamp <= S || block.timestamp > T1,
            "Insurance: Claims can only be made before the insurance phase starts or after it ends"
        );

        uint256 totalTokens = amountAAA + amountAA;

        // Call calculator to get withdrawal amount
        (bool success, bytes memory data) = calculator.call(
            abi.encodeWithSignature("calculateWithdrawal(uint256,uint256,uint256)", totalTokens, totalTranches, totalInvested)
        );
        require(success, "Calculation failed");

        uint256 totalToWithdraw = abi.decode(data, (uint256));

        // Call adapter manager to withdraw funds
        (success, data) = adapterManager.call(
            abi.encodeWithSignature("withdrawFunds(uint256)", totalToWithdraw)
        );
        require(success, "Withdrawal failed");

        uint256 totalWithdrawn = abi.decode(data, (uint256));
        require(totalWithdrawn > 0, "Insurance: no funds withdrawn");

        totalInvested -= totalToWithdraw;
        _burnTranches(msg.sender, amountAAA, amountAA);

        require(IERC20(usdc).transfer(msg.sender, totalWithdrawn), "Insurance: USDC transfer failed");

        emit Claim(msg.sender, amountAAA, amountAA, totalWithdrawn);
    }

    function getInfo() external view returns (address, address, bool, uint256, uint256, uint256, uint256, uint256, uint256) {
        return (owner, usdc, initialized, S, T1, T2, T3, totalTranches, totalInvested);
    }
}
