import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractTransactionResponse, parseUnits } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { CompoundLendingAdapter, IERC20 } from "../typechain-types";
import { networks } from "../config/addresses";

describe("Compound Lending Adapter (Base Mainnet Fork)", function() {
    // Get addresses from network config for Base mainnet
    const { USDC_ADDRESS, COMPOUND_USDC_MARKET } = networks.mainnet;
    const USDC_WHALE = process.env.MAINNET_USDC_WHALE!;

    let owner: SignerWithAddress;
    let usdc: IERC20;
    let compoundAdapter: CompoundLendingAdapter;
    let whale: SignerWithAddress;

    const TEST_AMOUNT = parseUnits("100", 6); // 100 USDC

    const cometABI = [
    "function supply(address asset, uint amount) external",
    "function withdraw(address asset, uint amount) external",
    "function balanceOf(address account) external view returns (uint256)"
    ];

    before(async function() {
        if (process.env.FORK_ENABLED !== 'true') {
            console.log("These tests require forking mode. Please set FORK_ENABLED=true");
            this.skip();
        }

        [owner] = await ethers.getSigners();

        // Get USDC contract
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

        // Deploy Compound adapter with mainnet Comet (cUSDCv3) address
        const CompoundAdapter = await ethers.getContractFactory("CompoundLendingAdapter");
        compoundAdapter = await CompoundAdapter.deploy(COMPOUND_USDC_MARKET);
        await compoundAdapter.waitForDeployment();
        console.log("Compound Adapter deployed to:", await compoundAdapter.getAddress());

        // Only impersonate on forked network
        const isForkedNetwork = process.env.FORK_ENABLED === 'true';

        if (isForkedNetwork) {
            // Fund whale with ETH for gas
            await ethers.provider.send("hardhat_setBalance", [
                USDC_WHALE,
                "0x" + (10n ** 18n * 1000n).toString(16) // 1000 ETH
            ]);

            // Impersonate whale account
            await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
        }

        whale = await ethers.getSigner(USDC_WHALE);

        // Log initial balances and important addresses
        const whaleBalance = await usdc.balanceOf(USDC_WHALE);
        console.log("Whale USDC Balance:", ethers.formatUnits(whaleBalance, 6));
        console.log("USDC Address:", USDC_ADDRESS);
        console.log("Compound Pool (Comet):", COMPOUND_USDC_MARKET);
        console.log("Whale Address:", USDC_WHALE);
        console.log("Adapter Address:", await compoundAdapter.getAddress());

        const cometAddress = await compoundAdapter.comet();
        expect(cometAddress).to.equal(COMPOUND_USDC_MARKET);


        // Verify Compound contract
        const code = await ethers.provider.getCode(COMPOUND_USDC_MARKET);
        if (code === "0x") {
            throw new Error("Compound USDC Market contract not found. Make sure you're using the correct address.");
        }

        // Verify Compound contract with just supply/withdraw functions
        try {

            const comet = await ethers.getContractAt(cometABI, COMPOUND_USDC_MARKET);

            // If we can get the contract instance, that's enough for now
            console.log("Successfully connected to Comet contract");
        } catch (error) {
            console.error("Failed to verify Comet contract:", error);
            throw error;
        }
    });

    it("should deploy with correct addresses", async function() {
        // Verify adapter addresses
        expect(await compoundAdapter.comet()).to.equal(COMPOUND_USDC_MARKET);
        expect(await compoundAdapter.USDC()).to.equal(USDC_ADDRESS);
    });

    it("should reject deposits of non-USDC tokens", async function() {
        const fakeTokenAddress = "0x1111111111111111111111111111111111111111";
        await expect(
            compoundAdapter.connect(whale).deposit(fakeTokenAddress, TEST_AMOUNT)
        ).to.be.revertedWith("Unsupported asset");
    });

    it("should approve USDC spending", async function() {
        const approveTx = await usdc.connect(whale).approve(
            await compoundAdapter.getAddress(),
            TEST_AMOUNT
        );
        await approveTx.wait();

        const allowance = await usdc.allowance(
            USDC_WHALE,
            await compoundAdapter.getAddress()
        );
        expect(allowance).to.equal(TEST_AMOUNT);
    });

    it("should deposit USDC into Compound", async function() {
        const initialBalance = await compoundAdapter.getBalance(USDC_ADDRESS);
        console.log("Initial Compound balance:", initialBalance.toString());

        // Test the returned shares and event
        const depositTx = await compoundAdapter.connect(whale).deposit(USDC_ADDRESS, TEST_AMOUNT);
        const receipt = await depositTx.wait();

        // Find the DepositSuccessful event
        const event = receipt?.logs.find(
            log => log.topics[0] === compoundAdapter.interface.getEvent("DepositSuccessful").topicHash
        );
        expect(event).to.not.be.undefined;

        // Decode and verify the event
        const decodedEvent = compoundAdapter.interface.decodeEventLog(
            "DepositSuccessful",
            event!.data,
            event!.topics
        );

        // Verify all event parameters
        expect(decodedEvent.asset).to.equal(USDC_ADDRESS);
        expect(decodedEvent.amount).to.equal(TEST_AMOUNT);
        expect(decodedEvent.sharesReceived).to.be.gt(0);

        // Get final balance and log it
        const finalBalance = await compoundAdapter.getBalance(USDC_ADDRESS);
        console.log("Final Compound balance:", finalBalance.toString());
        // Allow for potential rounding or fees in Compound V3
        expect(finalBalance).to.be.closeTo(TEST_AMOUNT, 2);
    });

    it("should return correct balance", async function() {
        const balance = await compoundAdapter.getBalance(USDC_ADDRESS);
        const comet = await ethers.getContractAt(cometABI, COMPOUND_USDC_MARKET);
        const cometBalance = await comet.balanceOf(await compoundAdapter.getAddress());


        // Adapter's balance should match what Comet reports
        expect(balance).to.equal(cometBalance);

        // After deposit, balance should equal TEST_AMOUNT
        expect(balance).to.be.closeTo(TEST_AMOUNT, 2);
    });

    it("should withdraw USDC from Compound", async function() {
        const initialWhaleBalance = await usdc.balanceOf(USDC_WHALE);

        // Get the actual balance we have in Compound
        const adapterBalance = await compoundAdapter.getBalance(USDC_ADDRESS);
        console.log("Adapter Compound balance before withdrawal:", adapterBalance.toString());

        // Withdraw what we actually have, not TEST_AMOUNT
        await expect(compoundAdapter.connect(whale).withdraw(USDC_ADDRESS, adapterBalance))
            .to.emit(compoundAdapter, "WithdrawSuccessful")
            .withArgs(USDC_ADDRESS, adapterBalance);

        const finalWhaleBalance = await usdc.balanceOf(USDC_WHALE);
        // Should get back what was actually in Compound
        expect(finalWhaleBalance).to.equal(initialWhaleBalance + adapterBalance);

        const finalAdapterBalance = await compoundAdapter.getBalance(USDC_ADDRESS);
        expect(finalAdapterBalance).to.equal(0);
    });

    after(async function() {
        // Only stop impersonation on forked network
        if (process.env.FORK_ENABLED === 'true') {
            await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
        }
    });
});

