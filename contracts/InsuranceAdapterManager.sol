// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ILendingAdapter.sol";

/// @title Insurance Adapter Manager - Manages lending protocol interactions
contract InsuranceAdapterManager {
    address public owner;
    address public insuranceCore;
    address public usdc;
    ILendingAdapter[] public lendingAdapters;

    event AdapterAdded(address adapter);
    event AdapterRemoved(address adapter);
    event LendingError(
        address indexed adapter,
        address asset,
        uint256 amount,
        uint256 errorCode
    );

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyInsuranceCore() {
        require(msg.sender == insuranceCore, "Only insurance core");
        _;
    }

    function initialize(
        address _insuranceCore,
        address _usdc
    ) external onlyOwner {
        require(insuranceCore == address(0), "Already initialized");
        insuranceCore = _insuranceCore;
        usdc = _usdc;
    }

    function addLendingAdapter(address adapter) external onlyOwner {
        require(adapter != address(0), "Adapter address cannot be zero");
        lendingAdapters.push(ILendingAdapter(adapter));
        emit AdapterAdded(adapter);
    }

    function removeLendingAdapter(uint256 index) external onlyOwner {
        require(index < lendingAdapters.length, "Invalid index");

        emit AdapterRemoved(address(lendingAdapters[index]));
        lendingAdapters[index] = lendingAdapters[lendingAdapters.length - 1];
        lendingAdapters.pop();
    }

    function depositFunds(
        uint256 amount
    ) external onlyInsuranceCore returns (uint256 totalDeposited) {
        require(amount > 0, "Amount must be greater than 0");
        require(lendingAdapters.length > 0, "No adapters");

        IERC20 usdcToken = IERC20(usdc);
        require(
            usdcToken.transferFrom(insuranceCore, address(this), amount),
            "Transfer failed"
        );

        uint256 amountPerAdapter = amount / lendingAdapters.length;
        uint256 remainder = amount % lendingAdapters.length;

        for (uint256 i = 0; i < lendingAdapters.length; ) {
            uint256 depositAmount = amountPerAdapter;
            if (i < remainder) {
                depositAmount++;
            }

            if (_depositToAdapter(lendingAdapters[i], depositAmount)) {
                totalDeposited += depositAmount;
            }

            unchecked {
                ++i;
            }
        }
    }

    function withdrawFunds(
        uint256 amount
    ) external onlyInsuranceCore returns (uint256 totalWithdrawn) {
        require(amount > 0, "Amount must be greater than 0");
        require(lendingAdapters.length > 0, "No adapters");

        uint256 amountPerAdapter = amount / lendingAdapters.length;
        uint256 remainder = amount % lendingAdapters.length;

        for (uint256 i = 0; i < lendingAdapters.length; ) {
            uint256 withdrawAmount = amountPerAdapter;
            if (i < remainder) {
                withdrawAmount++;
            }

            uint256 withdrawn = _withdrawFromAdapter(
                lendingAdapters[i],
                withdrawAmount,
                amount
            );
            totalWithdrawn += withdrawn;

            unchecked {
                ++i;
            }
        }

        if (totalWithdrawn > 0) {
            IERC20(usdc).transfer(insuranceCore, totalWithdrawn);
        }
    }

    function _depositToAdapter(
        ILendingAdapter adapter,
        uint256 amount
    ) internal returns (bool) {
        if (amount == 0) return true;

        IERC20 usdcToken = IERC20(usdc);
        if (!usdcToken.approve(address(adapter), amount)) {
            return false;
        }

        try adapter.deposit(usdc, amount) returns (uint256) {
            return true;
        } catch {
            emit LendingError(address(adapter), usdc, amount, 1);
            usdcToken.approve(address(adapter), 0);
            return false;
        }
    }

    function _withdrawFromAdapter(
        ILendingAdapter adapter,
        uint256 primaryAmount,
        uint256 remainingAmount
    ) internal returns (uint256 amountReceived) {
        if (primaryAmount == 0) return 0;

        try adapter.withdraw(usdc, primaryAmount) returns (uint256 amount) {
            amountReceived = amount;
        } catch {
            if (remainingAmount > 0 && remainingAmount != primaryAmount) {
                try adapter.withdraw(usdc, remainingAmount) returns (
                    uint256 amount
                ) {
                    amountReceived = amount;
                } catch {
                    emit LendingError(
                        address(adapter),
                        usdc,
                        remainingAmount,
                        2
                    );
                }
            } else {
                emit LendingError(address(adapter), usdc, primaryAmount, 2);
            }
        }
    }

    function getAdapterCount() external view returns (uint256) {
        return lendingAdapters.length;
    }

    function getAdapter(uint256 index) external view returns (address) {
        require(index < lendingAdapters.length, "Invalid index");
        return address(lendingAdapters[index]);
    }

    function getAllAdapters() external view returns (address[] memory) {
        address[] memory adapters = new address[](lendingAdapters.length);
        for (uint256 i = 0; i < lendingAdapters.length; i++) {
            adapters[i] = address(lendingAdapters[i]);
        }
        return adapters;
    }
}
