// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniswapV2Router02 {
    address public immutable factory;
    address public immutable WETH;

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'UniswapV2Router: EXPIRED');
        _;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = IUniswapV2Factory(factory).createPair(tokenA, tokenB);
        }
        IERC20(tokenA).transferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pair, amountB);
        liquidity = IUniswapV2Pair(pair).mint(to);
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) internal view returns (uint amountA, uint amountB) {
        // Simple implementation - just return desired amounts for testing
        amountA = amountADesired;
        amountB = amountBDesired;
        require(amountA >= amountAMin, 'UniswapV2Router: INSUFFICIENT_A_AMOUNT');
        require(amountB >= amountBMin, 'UniswapV2Router: INSUFFICIENT_B_AMOUNT');
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint[] memory amounts) {
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        // Simple implementation for testing - assume 1:1 swap
        for (uint i = 1; i < path.length; i++) {
            amounts[i] = amounts[i-1]; // 1:1 ratio for simplicity
        }
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');

        IERC20(path[0]).transferFrom(msg.sender, address(this), amounts[0]);
        IERC20(path[path.length - 1]).transfer(to, amounts[amounts.length - 1]);
    }

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable ensure(deadline) returns (uint amountToken, uint amountETH, uint liquidity) {
        (amountToken, amountETH) = _addLiquidity(
            token,
            WETH,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountETHMin
        );
        address pair = IUniswapV2Factory(factory).getPair(token, WETH);
        if (pair == address(0)) {
            pair = IUniswapV2Factory(factory).createPair(token, WETH);
        }
        IERC20(token).transferFrom(msg.sender, pair, amountToken);
        // Convert ETH to WETH
        (bool success,) = WETH.call{value: amountETH}("");
        require(success, "ETH transfer failed");
        IERC20(WETH).transfer(pair, amountETH);
        liquidity = IUniswapV2Pair(pair).mint(to);
        // Refund excess ETH
        if (msg.value > amountETH) {
            payable(msg.sender).transfer(msg.value - amountETH);
        }
    }

    function getAmountsOut(uint amountIn, address[] calldata path)
        public
        view
        returns (uint[] memory amounts)
    {
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        // Simple 1:1 ratio for testing
        for (uint i = 1; i < path.length; i++) {
            amounts[i] = amounts[i-1];
        }
    }

    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[0] == WETH, 'UniswapV2Router: INVALID_PATH');
        amounts = getAmountsOut(msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');

        // Convert ETH to WETH
        (bool success,) = WETH.call{value: amounts[0]}("");
        require(success, "ETH transfer failed");

        // For testing purposes, simulate token swap by minting tokens
        // In a real implementation, this would come from liquidity pools
        address outputToken = path[path.length - 1];
        uint256 outputAmount = amounts[amounts.length - 1];

        // Try to mint tokens directly (for MockUSDC)
        (bool mintSuccess,) = outputToken.call(
            abi.encodeWithSignature("mint(address,uint256)", to, outputAmount)
        );

        // If minting fails, try to transfer from our balance
        if (!mintSuccess && IERC20(outputToken).balanceOf(address(this)) >= outputAmount) {
            IERC20(outputToken).transfer(to, outputAmount);
        }
    }
}
