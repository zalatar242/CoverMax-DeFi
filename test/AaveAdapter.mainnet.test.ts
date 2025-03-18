import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AaveLendingAdapter, IERC20 } from "../typechain-types";
import { networks } from "../config/networks";

describe("Aave Lending Adapter (Base Mainnet Fork)", function() {
    // Get addresses from network config
    const { USDC_ADDRESS, AAVE_V3_POOL, AAVE_DATA_PROVIDER } = networks.mainnet;
    const USDC_WHALE = process.env.MAINNET_USDC_WHALE!;

    let owner: SignerWithAddress;
    let usdc: IERC20;
    let aaveAdapter: AaveLendingAdapter;
    let whale: SignerWithAddress;

    const TEST_AMOUNT = parseUnits("100", 6); // 100 USDC

    before(async function() {
        if (process.env.FORK_ENABLED !== 'true') {
            console.log("These tests require forking mode. Please set FORK_ENABLED=true");
            this.skip();
        }

        [owner] = await ethers.getSigners();

        // Get USDC contract using ethers getContractAt
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

        // Deploy Aave adapter
        const AaveAdapter = await ethers.getContractFactory("AaveLendingAdapter");
        aaveAdapter = await AaveAdapter.deploy(AAVE_V3_POOL, AAVE_DATA_PROVIDER);
        await aaveAdapter.waitForDeployment();
        console.log("Aave Adapter deployed to:", await aaveAdapter.getAddress());

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
        console.log("Aave Pool:", AAVE_V3_POOL);
        console.log("Aave Data Provider:", AAVE_DATA_PROVIDER);
        console.log("Whale Address:", USDC_WHALE);
        console.log("Adapter Address:", await aaveAdapter.getAddress());

        // Verify the Aave pool contract exists
        const code = await ethers.provider.getCode(AAVE_V3_POOL);
        if (code === "0x") {
            throw new Error("Aave pool contract not found. Make sure you're using the correct address.");
        }
    });

    it("should deploy with correct addresses", async function() {
        expect(await aaveAdapter.aavePool()).to.equal(AAVE_V3_POOL);
        expect(await aaveAdapter.poolDataProvider()).to.equal(AAVE_DATA_PROVIDER);
    });

    it("should approve USDC spending", async function() {
        const approveTx = await usdc.connect(whale).approve(
            await aaveAdapter.getAddress(),
            TEST_AMOUNT
        );
        await approveTx.wait();

        const allowance = await usdc.allowance(
            USDC_WHALE,
            await aaveAdapter.getAddress()
        );
        expect(allowance).to.equal(TEST_AMOUNT);
    });

    it("should deposit USDC into Aave", async function() {
        const initialBalance = await aaveAdapter.getBalance(USDC_ADDRESS);

        await expect(
            aaveAdapter.connect(whale).deposit(USDC_ADDRESS, TEST_AMOUNT)
        ).to.emit(aaveAdapter, "DepositSuccessful")
         .withArgs(USDC_ADDRESS, TEST_AMOUNT);

        const finalBalance = await aaveAdapter.getBalance(USDC_ADDRESS);
        expect(finalBalance).to.equal(initialBalance + TEST_AMOUNT);
    });

    it("should return correct balance", async function() {
        const balance = await aaveAdapter.getBalance(USDC_ADDRESS);
        expect(balance).to.equal(TEST_AMOUNT);
    });

    it("should withdraw USDC from Aave", async function() {
        const initialWhaleBalance = await usdc.balanceOf(USDC_WHALE);

        await expect(
            aaveAdapter.connect(whale).withdraw(USDC_ADDRESS, TEST_AMOUNT)
        ).to.emit(aaveAdapter, "WithdrawSuccessful")
         .withArgs(USDC_ADDRESS, TEST_AMOUNT);

        const finalWhaleBalance = await usdc.balanceOf(USDC_WHALE);
        expect(finalWhaleBalance).to.equal(initialWhaleBalance + TEST_AMOUNT);

        const adapterBalance = await aaveAdapter.getBalance(USDC_ADDRESS);
        expect(adapterBalance).to.equal(0);
    });

    after(async function() {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
    });
});
