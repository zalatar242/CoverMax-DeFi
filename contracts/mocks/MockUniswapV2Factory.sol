// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/IMockUniswapV2Factory.sol";
import "./MockUniswapV2Pair.sol";

contract MockUniswapV2Factory is IMockUniswapV2Factory {
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'Mock UniswapV2: IDENTICAL_ADDRESSES');
        require(tokenA != address(0) && tokenB != address(0), 'Mock UniswapV2: ZERO_ADDRESS');
        require(getPair[tokenA][tokenB] == address(0), 'Mock UniswapV2: PAIR_EXISTS');

        // Sort tokens to ensure unique pair addresses
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        bytes memory bytecode = type(MockUniswapV2Pair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        MockUniswapV2Pair(pair).initialize(token0, token1);

        // Store pair mappings
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'Mock UniswapV2: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'Mock UniswapV2: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }
}
