import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractTransactionResponse, parseUnits } from "ethers";

describe("Lending Adapters", function() {
    // Initialize variables
    let USDC_ADDRESS: string;
    let USDC_WHALE: string;
    let AAVE_POOL: string;
    let AAVE_DATA_PROVIDER: string;
    let mockCompoundPool: any;
    let MOONWELL_MUSDC: string;

    // Set addresses based on network before tests
    before(async function() {
        const isTestnet = process.env.NETWORK === 'sepolia';

        USDC_ADDRESS = isTestnet
            ? process.env.TESTNET_USDC_ADDRESS!
            : process.env.MAINNET_USDC_ADDRESS!;
        USDC_WHALE = isTestnet
            ? process.env.TESTNET_USDC_WHALE!
            : process.env.MAINNET_USDC_WHALE!;
        AAVE_POOL = isTestnet
            ? process.env.TESTNET_AAVE_V3_POOL!
            : process.env.MAINNET_AAVE_V3_POOL!;
        AAVE_DATA_PROVIDER = isTestnet
            ? process.env.TESTNET_AAVE_DATA_PROVIDER!
            : process.env.MAINNET_AAVE_DATA_PROVIDER!;
        MOONWELL_MUSDC = isTestnet
            ? process.env.TESTNET_MOONWELL_USDC!
            : process.env.MAINNET_MOONWELL_USDC!;

        // Verify required addresses are available
        if (!USDC_ADDRESS || !AAVE_POOL || !AAVE_DATA_PROVIDER || !MOONWELL_MUSDC || !USDC_WHALE) {
            throw new Error('Required addresses not found in environment variables');
        }
    });

    let owner: any;
    let usdc: any;
    let aaveAdapter: any;
    let moonwellAdapter: any;
    let compoundAdapter: any;
    let whale: any;

    const TEST_AMOUNT = parseUnits("10", 6); // 10 USDC - reduced amount for testing
    const ZERO_AMOUNT = parseUnits("0", 6);

    async function logBalanceAndAllowance(token: any, owner: any, spender: any, label: string) {
        const balance = await token.balanceOf(owner.address);
        const allowance = await token.allowance(owner.address, spender);
        console.log(`${label} Balance:`, ethers.formatUnits(balance, 6));
        console.log(`${label} Allowance for ${await spender.getAddress()}:`, ethers.formatUnits(allowance, 6));
    }

    before(async function() {
        [owner] = await ethers.getSigners();

        // Get USDC contract with full ERC20 ABI
        const usdcAbi = [
            "function approve(address spender, uint256 amount) external returns (bool)",
            "function transfer(address to, uint256 amount) external returns (bool)",
            "function balanceOf(address account) external view returns (uint256)",
            "function allowance(address owner, address spender) external view returns (uint256)",
            "function decimals() external view returns (uint8)"
        ];
        usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, owner);

        // Deploy adapters with real addresses
        const AaveAdapter = await ethers.getContractFactory("AaveLendingAdapter");
        aaveAdapter = await AaveAdapter.deploy(AAVE_POOL, AAVE_DATA_PROVIDER);
        await aaveAdapter.waitForDeployment();
        console.log("Aave Adapter deployed to:", await aaveAdapter.getAddress());

        // Deploy MockCompoundPool first
        const MockCompoundPool = await ethers.getContractFactory("MockCompoundPool");
        mockCompoundPool = await MockCompoundPool.deploy();
        await mockCompoundPool.waitForDeployment();
        console.log("Mock Compound Pool deployed to:", await mockCompoundPool.getAddress());

        const CompoundAdapter = await ethers.getContractFactory("CompoundLendingAdapter");
        compoundAdapter = await CompoundAdapter.deploy(await mockCompoundPool.getAddress());
        await compoundAdapter.waitForDeployment();
        console.log("Compound Adapter deployed to:", await compoundAdapter.getAddress());

        const MoonwellAdapter = await ethers.getContractFactory("MoonwellLendingAdapter");
        moonwellAdapter = await MoonwellAdapter.deploy(MOONWELL_MUSDC);
        await moonwellAdapter.waitForDeployment();
        console.log("Moonwell Adapter deployed to:", await moonwellAdapter.getAddress());

        // Fund the whale account with ETH for gas
        await ethers.provider.send("hardhat_setBalance", [
            USDC_WHALE,
            "0x" + (10n ** 18n * 1000n).toString(16) // 1000 ETH
        ]);

        // Impersonate whale account
        await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
        whale = await ethers.getSigner(USDC_WHALE);

        // Check whale's initial state
        await logBalanceAndAllowance(usdc, whale, aaveAdapter, "Initial Whale");

        // Approve adapters to spend whale's USDC
        const tx1 = await usdc.connect(whale).approve(await aaveAdapter.getAddress(), TEST_AMOUNT);
        await tx1.wait();

        const tx2 = await usdc.connect(whale).approve(await compoundAdapter.getAddress(), TEST_AMOUNT);
        await tx2.wait();

        const tx3 = await usdc.connect(whale).approve(await moonwellAdapter.getAddress(), TEST_AMOUNT);
        await tx3.wait();

        // Verify approvals
        await logBalanceAndAllowance(usdc, whale, aaveAdapter, "After Approval - Aave");
        await logBalanceAndAllowance(usdc, whale, compoundAdapter, "After Approval - Compound");
        await logBalanceAndAllowance(usdc, whale, moonwellAdapter, "After Approval - Moonwell");
    });

    describe("Aave Adapter", function() {
        it("should successfully deposit and emit event", async function() {
            console.log("\nTesting Aave Deposit:");
            await logBalanceAndAllowance(usdc, whale, aaveAdapter, "Before Deposit");

            await expect(aaveAdapter.connect(whale).deposit(USDC_ADDRESS, TEST_AMOUNT))
                .to.emit(aaveAdapter, "DepositSuccessful")
                .withArgs(USDC_ADDRESS, TEST_AMOUNT);

            const balance = await aaveAdapter.getBalance(USDC_ADDRESS);
            console.log("Aave adapter balance after deposit:", ethers.formatUnits(balance, 6));
            expect(balance).to.equal(TEST_AMOUNT);
        });

        it("should successfully withdraw and emit event", async function() {
            console.log("\nTesting Aave Withdraw:");
            const initialBalance = await aaveAdapter.getBalance(USDC_ADDRESS);
            console.log("Initial balance in Aave:", ethers.formatUnits(initialBalance, 6));

            await expect(aaveAdapter.connect(whale).withdraw(USDC_ADDRESS, TEST_AMOUNT))
                .to.emit(aaveAdapter, "WithdrawSuccessful")
                .withArgs(USDC_ADDRESS, TEST_AMOUNT);

            const finalBalance = await aaveAdapter.getBalance(USDC_ADDRESS);
            console.log("Final balance in Aave:", ethers.formatUnits(finalBalance, 6));
        });
    });

    describe("Compound Adapter", function() {
        it("should successfully deposit and emit event", async function() {
            console.log("\nTesting Compound Deposit:");
            await logBalanceAndAllowance(usdc, whale, compoundAdapter, "Before Deposit");

            await expect(compoundAdapter.connect(whale).deposit(USDC_ADDRESS, TEST_AMOUNT))
                .to.emit(compoundAdapter, "DepositSuccessful")
                .withArgs(USDC_ADDRESS, TEST_AMOUNT, TEST_AMOUNT);

            const balance = await compoundAdapter.getBalance(USDC_ADDRESS);
            console.log("Compound adapter balance after deposit:", ethers.formatUnits(balance, 6));
            expect(balance).to.equal(TEST_AMOUNT);
        });

        it("should successfully withdraw and emit event", async function() {
            console.log("\nTesting Compound Withdraw:");
            const initialBalance = await compoundAdapter.getBalance(USDC_ADDRESS);
            console.log("Initial balance in Compound:", ethers.formatUnits(initialBalance, 6));

            await expect(compoundAdapter.connect(whale).withdraw(USDC_ADDRESS, TEST_AMOUNT))
                .to.emit(compoundAdapter, "WithdrawSuccessful")
                .withArgs(USDC_ADDRESS, TEST_AMOUNT);

            const finalBalance = await compoundAdapter.getBalance(USDC_ADDRESS);
            console.log("Final balance in Compound:", ethers.formatUnits(finalBalance, 6));
        });
    });

    after(async function() {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
    });
});
