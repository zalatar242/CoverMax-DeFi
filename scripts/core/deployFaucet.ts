        import { ethers } from "hardhat";
import { ContractFactory } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();

    // Deploy MockUSDC if not already deployed
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const mockUSDCAddress = await mockUSDC.getAddress();
    console.log("MockUSDC deployed to:", mockUSDCAddress);

    // Deploy Faucet with MockUSDC
    // Set withdrawal amounts: 1000 USDC and 0.1 ETH
    const tokenWithdrawalAmount = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)
    const ethWithdrawalAmount = ethers.parseUnits("0.1", 18); // 0.1 ETH (18 decimals)

    const Faucet = (await ethers.getContractFactory("Faucet")) as ContractFactory & {
        deploy(
            tokenAddress: string,
            tokenWithdrawalAmount: bigint,
            ethWithdrawalAmount: bigint
        ): Promise<any>;
    };

    const faucet = await Faucet.deploy(
        mockUSDCAddress,
        tokenWithdrawalAmount,
        ethWithdrawalAmount
    );
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    console.log("Faucet deployed to:", faucetAddress);

    // Fund the faucet with initial USDC
    const initialUsdcBalance = ethers.parseUnits("100000", 6); // 100,000 USDC
    await mockUSDC.mint(faucetAddress, initialUsdcBalance);
    console.log("Minted initial USDC to faucet");

    // Fund the faucet with initial ETH
    const initialEthBalance = ethers.parseUnits("10", 18); // 10 ETH
    await deployer.sendTransaction({
        to: faucetAddress,
        value: initialEthBalance
    });
    console.log("Sent initial ETH to faucet");

    // Update the frontend contract addresses
    console.log("\nAdd these addresses to your frontend configuration:");
    console.log("USDC_ADDRESS=", mockUSDCAddress);
    console.log("FAUCET_ADDRESS=", faucetAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
