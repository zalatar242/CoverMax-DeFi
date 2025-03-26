import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MoonwellLendingAdapter, IERC20 } from "../typechain-types";
import { networks } from "../config/addresses";

describe("Moonwell Lending Adapter (Base Mainnet Fork)", function() {
    // Note: This test requires the following environment variables:
    // - MAINNET_USDC_WHALE: Address of a wallet with sufficient USDC on Base
    // - BASE_MAINNET_RPC_URL: Base mainnet RPC URL
    // - FORK_ENABLED=true: Enable forking in hardhat config

    const network = networks.mainnet;
    const USDC_ADDRESS = network.USDC_ADDRESS;
    const MOONWELL_MUSDC = network.MOONWELL_USDC;
    const USDC_WHALE = network.USDC_WHALE;

    let owner: SignerWithAddress;
    let usdc: IERC20;
    let moonwellAdapter: MoonwellLendingAdapter;
    let whale: SignerWithAddress;

    const TEST_AMOUNT = parseUnits("100", 6); // 100 USDC

    before(async function() {
        // Configure fork
        await ethers.provider.send("hardhat_reset", [{
            forking: {
                jsonRpcUrl: network.defaultRpcUrl,
                blockNumber: undefined // Uses latest block
            }
        }]);

        [owner] = await ethers.getSigners();

        // Get USDC contract
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

        // Deploy Moonwell adapter
        const MoonwellAdapter = await ethers.getContractFactory("MoonwellLendingAdapter");
        moonwellAdapter = await MoonwellAdapter.deploy(MOONWELL_MUSDC);
        await moonwellAdapter.waitForDeployment();
        console.log("Moonwell Adapter deployed to:", await moonwellAdapter.getAddress());

        // Fund whale with ETH for gas
        await ethers.provider.send("hardhat_setBalance", [
            USDC_WHALE,
            "0x" + (10n ** 18n * 1000n).toString(16) // 1000 ETH
        ]);

        // Impersonate whale account
        await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
        whale = await ethers.getSigner(USDC_WHALE);

        // Log initial balances and important addresses
        const whaleBalance = await usdc.balanceOf(USDC_WHALE);
        console.log("Whale USDC Balance:", ethers.formatUnits(whaleBalance, 6));
        console.log("USDC Address:", USDC_ADDRESS);
        console.log("Moonwell mUSDC:", MOONWELL_MUSDC);
        console.log("Whale Address:", USDC_WHALE);
        console.log("Adapter Address:", await moonwellAdapter.getAddress());
    });

    it("should deploy with correct address", async function() {
        expect(await moonwellAdapter.mToken()).to.equal(MOONWELL_MUSDC);
    });

    it("should revert on zero amount deposit", async function() {
        await expect(
            moonwellAdapter.connect(whale).deposit(USDC_ADDRESS, 0)
        ).to.be.revertedWithCustomError(moonwellAdapter, "AmountTooLow");
    });

    it("should revert on zero amount withdraw", async function() {
        await expect(
            moonwellAdapter.connect(whale).withdraw(USDC_ADDRESS, 0)
        ).to.be.revertedWithCustomError(moonwellAdapter, "AmountTooLow");
    });

    it("should approve USDC spending", async function() {
        const approveTx = await usdc.connect(whale).approve(
            await moonwellAdapter.getAddress(),
            TEST_AMOUNT
        );
        await approveTx.wait();

        const allowance = await usdc.allowance(
            USDC_WHALE,
            await moonwellAdapter.getAddress()
        );
        expect(allowance).to.equal(TEST_AMOUNT);
    });

    it("should deposit USDC into Moonwell", async function() {
        // Check whale's USDC balance
        const whaleBalance = await usdc.balanceOf(USDC_WHALE);
        console.log("Whale USDC balance before deposit:", ethers.formatUnits(whaleBalance, 6));

        // Ensure whale has approved the adapter
        await usdc.connect(whale).approve(await moonwellAdapter.getAddress(), TEST_AMOUNT);

        // Check allowance
        const allowance = await usdc.allowance(USDC_WHALE, await moonwellAdapter.getAddress());
        console.log("Adapter allowance:", ethers.formatUnits(allowance, 6));

        const initialBalance = await moonwellAdapter.getBalance(USDC_ADDRESS);
        console.log("Initial adapter balance (in USDC):", ethers.formatUnits(initialBalance, 6));

        // Get mToken contract for checking actual balances
        const mToken = await ethers.getContractAt("IMToken", MOONWELL_MUSDC);
        const initialMTokenBalance = await mToken.balanceOf(await moonwellAdapter.getAddress());
        const exchangeRate = await mToken.exchangeRateStored();
        console.log("Exchange rate:", ethers.formatUnits(exchangeRate, 18));
        console.log("Initial mToken balance:", ethers.formatUnits(initialMTokenBalance, 18));

        // Attempt deposit
        await expect(moonwellAdapter.connect(whale).deposit(USDC_ADDRESS, TEST_AMOUNT))
            .to.emit(moonwellAdapter, "DepositSuccessful")
            .withArgs(USDC_ADDRESS, TEST_AMOUNT);

        const finalBalance = await moonwellAdapter.getBalance(USDC_ADDRESS);
        const finalMTokenBalance = await mToken.balanceOf(await moonwellAdapter.getAddress());
        console.log("Final mToken balance:", ethers.formatUnits(finalMTokenBalance, 18));
        console.log("Final adapter balance (in USDC):", ethers.formatUnits(finalBalance, 6));

        // Check that the converted balance is approximately equal to the deposited amount
        expect(finalBalance).to.be.closeTo(TEST_AMOUNT, ethers.parseUnits("1", 6)); // Allow for some rounding
    });

    it("should return approximately the deposited amount", async function() {
        const balance = await moonwellAdapter.getBalance(USDC_ADDRESS);
        expect(balance).to.be.closeTo(
            TEST_AMOUNT,
            ethers.parseUnits("1", 6) // Allow for 1 USDC of rounding error
        );
    });

    it("should withdraw USDC from Moonwell", async function() {
        const initialWhaleBalance = await usdc.balanceOf(USDC_WHALE);
        const initialAdapterBalance = await moonwellAdapter.getBalance(USDC_ADDRESS);
        console.log("Initial adapter balance before withdraw:", ethers.formatUnits(initialAdapterBalance, 6));

        await expect(moonwellAdapter.connect(whale).withdraw(USDC_ADDRESS, TEST_AMOUNT))
            .to.emit(moonwellAdapter, "WithdrawSuccessful")
            .withArgs(USDC_ADDRESS, TEST_AMOUNT);

        const finalWhaleBalance = await usdc.balanceOf(USDC_WHALE);
        expect(finalWhaleBalance).to.be.gt(initialWhaleBalance);

        const finalAdapterBalance = await moonwellAdapter.getBalance(USDC_ADDRESS);
        console.log("Final adapter balance after withdraw:", ethers.formatUnits(finalAdapterBalance, 6));
        expect(finalAdapterBalance).to.be.lt(initialAdapterBalance);
    });

    after(async function() {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
        await ethers.provider.send("hardhat_reset", []); // Reset the fork
    });
});
