import { expect } from "chai";
import { ethers } from "hardhat";
import { parseUnits } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AaveLendingAdapter, IERC20 } from "../typechain-types";
import { networks } from "../config/addresses";

describe("Aave Lending Adapter (Base Mainnet Fork)", function() {
    // Get addresses from network config
    const { USDC_ADDRESS, AAVE_V3_POOL, AAVE_DATA_PROVIDER, USDC_WHALE } = networks.mainnet;

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
        usdc = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", USDC_ADDRESS) as unknown as IERC20;

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

        console.log("\nAave Adapter Test Setup");
        console.log("======================");
        console.log("\nAddresses:");
        console.log("----------");
        console.log("USDC Token:", USDC_ADDRESS);
        console.log("Aave Pool:", AAVE_V3_POOL);
        console.log("Aave Data Provider:", AAVE_DATA_PROVIDER);
        console.log("Whale Address:", USDC_WHALE);
        console.log("Adapter Address:", await aaveAdapter.getAddress());

        const whaleBalance = await usdc.balanceOf(USDC_WHALE);
        console.log("\nInitial Balances:");
        console.log("----------------");
        console.log("Whale USDC Balance:", ethers.formatUnits(whaleBalance, 6), "USDC");
        console.log("======================\n");

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
        console.log("\nDeposit Test");
        console.log("------------");
        const initialBalance = await aaveAdapter.getBalance(USDC_ADDRESS);
        console.log("Initial Aave balance:", ethers.formatUnits(initialBalance, 6), "USDC");

        await expect(
            aaveAdapter.connect(whale).deposit(USDC_ADDRESS, TEST_AMOUNT)
        ).to.emit(aaveAdapter, "DepositSuccessful")
         .withArgs(USDC_ADDRESS, TEST_AMOUNT);

        const finalBalance = await aaveAdapter.getBalance(USDC_ADDRESS);
        console.log("Final Aave balance:", ethers.formatUnits(finalBalance, 6), "USDC");
        console.log("------------\n");
        expect(finalBalance).to.equal(initialBalance + TEST_AMOUNT);
    });

    it("should return correct balance", async function() {
        const balance = await aaveAdapter.getBalance(USDC_ADDRESS);
        expect(balance).to.equal(TEST_AMOUNT);
    });

    it("should withdraw USDC from Aave", async function() {
        console.log("\nWithdrawal Test");
        console.log("---------------");

        const initialWhaleBalance = await usdc.balanceOf(USDC_WHALE);
        const initialAdapterBalance = await aaveAdapter.getBalance(USDC_ADDRESS);
        console.log("Initial whale balance:", ethers.formatUnits(initialWhaleBalance, 6), "USDC");
        console.log("Initial Aave balance:", ethers.formatUnits(initialAdapterBalance, 6), "USDC");

        await expect(
            aaveAdapter.connect(whale).withdraw(USDC_ADDRESS, TEST_AMOUNT)
        ).to.emit(aaveAdapter, "WithdrawSuccessful")
         .withArgs(USDC_ADDRESS, TEST_AMOUNT);

        const finalWhaleBalance = await usdc.balanceOf(USDC_WHALE);
        const finalAdapterBalance = await aaveAdapter.getBalance(USDC_ADDRESS);

        console.log("Final whale balance:", ethers.formatUnits(finalWhaleBalance, 6), "USDC");
        console.log("Final Aave balance:", ethers.formatUnits(finalAdapterBalance, 6), "USDC");
        console.log("---------------\n");

        expect(finalWhaleBalance).to.equal(initialWhaleBalance + TEST_AMOUNT);
        expect(finalAdapterBalance).to.equal(0);
    });

    after(async function() {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
    });
});
