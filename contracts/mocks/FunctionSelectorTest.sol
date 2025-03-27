// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract FunctionSelectorTest {
    bytes4 public constant GET_RESERVE_TOKENS = bytes4(keccak256("getReserveTokensAddresses(address)"));

    function getSelector() public pure returns (bytes4) {
        return GET_RESERVE_TOKENS;
    }
}
