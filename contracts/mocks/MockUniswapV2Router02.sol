// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IMockUniswapV2Factory.sol";
import "./interfaces/IMockUniswapV2Router02.sol";
import "./interfaces/IMockUniswapV2Pair.sol";
import "./libraries/MockUniswapV2Library.sol";

contract MockUniswapV2Router02 is IMockUniswapV2Router02 {
    address public immutable factoryAddress;
    address public immutable wethAddress;
    address public immutable USDC;

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'Mock UniswapV2Router: EXPIRED');
        _;
    }

    constructor(address _factory, address _WETH, address _USDC) {
        factoryAddress = _factory;
        wethAddress = _WETH;
        USDC = _USDC;
    }

    function factory() external view returns (address) {
        return factoryAddress;
    }

    function WETH() external view returns (address) {
        return wethAddress;
    }

    function quote(uint amountA, uint reserveA, uint reserveB) public pure virtual override returns (uint amountB) {
        return MockUniswapV2Library.quote(amountA, reserveA, reserveB);
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public pure virtual override returns (uint amountOut) {
        return MockUniswapV2Library.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) public pure virtual override returns (uint amountIn) {
        return MockUniswapV2Library.getAmountIn(amountOut, reserveIn, reserveOut);
    }

    function getAmountsOut(uint amountIn, address[] calldata path) public view virtual override returns (uint[] memory amounts) {
        return MockUniswapV2Library.getAmountsOut(factoryAddress, amountIn, path);
    }

    function getAmountsIn(uint amountOut, address[] calldata path) public view virtual override returns (uint[] memory amounts) {
        return MockUniswapV2Library.getAmountsIn(factoryAddress, amountOut, path);
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) internal virtual returns (uint amountA, uint amountB) {
        // Create the pair if it doesn't exist yet
        if (IMockUniswapV2Factory(factoryAddress).getPair(tokenA, tokenB) == address(0)) {
            IMockUniswapV2Factory(factoryAddress).createPair(tokenA, tokenB);
        }
        (uint reserveA, uint reserveB) = MockUniswapV2Library.getReserves(factoryAddress, tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint amountBOptimal = MockUniswapV2Library.quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, 'Mock UniswapV2Router: INSUFFICIENT_B_AMOUNT');
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint amountAOptimal = MockUniswapV2Library.quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, 'Mock UniswapV2Router: INSUFFICIENT_A_AMOUNT');
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = MockUniswapV2Library.sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? MockUniswapV2Library.pairFor(factoryAddress, output, path[i + 2]) : _to;
            IMockUniswapV2Pair(MockUniswapV2Library.pairFor(factoryAddress, input, output)).swap(
                amount0Out, amount1Out, to, new bytes(0)
            );
        }
    }

    function _safeTransferFrom(address token, address from, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'Mock UniswapV2Router: TRANSFER_FROM_FAILED');
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
    ) public virtual override ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = MockUniswapV2Library.pairFor(factoryAddress, tokenA, tokenB);
        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = IMockUniswapV2Pair(pair).mint(to);
    }

    function addLiquidityWithUSDC(
        address token,
        uint amountTokenDesired,
        uint amountUSDCDesired,
        uint amountTokenMin,
        uint amountUSDCMin,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint amountToken, uint amountUSDC, uint liquidity) {
        return addLiquidity(
            token,
            USDC,
            amountTokenDesired,
            amountUSDCDesired,
            amountTokenMin,
            amountUSDCMin,
            to,
            deadline
        );
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint amountA, uint amountB) {
        address pair = MockUniswapV2Library.pairFor(factoryAddress, tokenA, tokenB);
        IERC20(pair).transferFrom(msg.sender, pair, liquidity);
        (amountA, amountB) = IMockUniswapV2Pair(pair).burn(to);
        require(amountA >= amountAMin, 'Mock UniswapV2Router: INSUFFICIENT_A_AMOUNT');
        require(amountB >= amountBMin, 'Mock UniswapV2Router: INSUFFICIENT_B_AMOUNT');
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint[] memory amounts) {
        amounts = MockUniswapV2Library.getAmountsOut(factoryAddress, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'Mock UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        _safeTransferFrom(
            path[0], msg.sender, MockUniswapV2Library.pairFor(factoryAddress, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, to);
    }

    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint[] memory amounts) {
        amounts = MockUniswapV2Library.getAmountsIn(factoryAddress, amountOut, path);
        require(amounts[0] <= amountInMax, 'Mock UniswapV2Router: EXCESSIVE_INPUT_AMOUNT');
        _safeTransferFrom(
            path[0], msg.sender, MockUniswapV2Library.pairFor(factoryAddress, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, to);
    }

    function swapExactUSDCForTokens(
        uint amountUSDCIn,
        uint amountTokenMin,
        address token,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint[] memory amounts) {
        address[] memory path = new address[](2);
        path[0] = USDC;
        path[1] = token;
        amounts = MockUniswapV2Library.getAmountsOut(factoryAddress, amountUSDCIn, path);
        require(amounts[1] >= amountTokenMin, 'Mock UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        _safeTransferFrom(
            USDC, msg.sender, MockUniswapV2Library.pairFor(factoryAddress, USDC, token), amounts[0]
        );
        _swap(amounts, path, to);
    }

    function swapExactTokensForUSDC(
        uint amountTokenIn,
        uint amountUSDCMin,
        address token,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint[] memory amounts) {
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = USDC;
        amounts = MockUniswapV2Library.getAmountsOut(factoryAddress, amountTokenIn, path);
        require(amounts[1] >= amountUSDCMin, 'Mock UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');
        _safeTransferFrom(
            token, msg.sender, MockUniswapV2Library.pairFor(factoryAddress, token, USDC), amounts[0]
        );
        _swap(amounts, path, to);
    }
}
