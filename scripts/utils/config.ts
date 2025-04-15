import * as fs from "fs";
import * as path from "path";
import { BaseContract } from "ethers";
import { networks } from "../../config/addresses";

interface ContractInfo {
  name: string;
  contract: BaseContract;
}

interface ContractConfig {
  address: string;
  [key: string]: any;
}

interface NetworkConfig {
  [contractName: string]: ContractConfig;
}

interface ContractsJsonConfig {
  networks: {
    [networkName: string]: NetworkConfig;
  };
}

export function updateNetworkConfig(network: string, config: Record<string, any>) {
  const addressesPath = path.join(__dirname, "../../config/addresses.ts");
  let content = fs.readFileSync(addressesPath, "utf8");

  // Create or update network configuration
  const networkStart = content.indexOf(`${network}: {`);
  if (networkStart === -1) {
    // Add new network configuration
    content = content.replace(
      "export const networks = {",
      `export const networks = {\n  ${network}: ${JSON.stringify(config, null, 2)},`
    );
  } else {
    // Update existing network configuration
    const networkEnd = content.indexOf("}", networkStart) + 1;
    content = content.slice(0, networkStart) +
      `${network}: ${JSON.stringify(config, null, 2)}` +
      content.slice(networkEnd);
  }

  fs.writeFileSync(addressesPath, content);
  console.log(`Updated network configuration for ${network} in addresses.ts`);
}

export async function updateContractsJson(network: string, contracts: ContractInfo[]) {
  const contractsPath = path.join(__dirname, "../../frontend/src/contracts.json");
  let config: ContractsJsonConfig = { networks: {} };

  // Load existing configuration if it exists
  if (fs.existsSync(contractsPath)) {
    config = JSON.parse(fs.readFileSync(contractsPath, "utf8"));
  }

  // Create or update network configuration
  if (!config.networks[network]) {
    config.networks[network] = {};
  }

  // Update contract addresses and ABIs
  for (const { name, contract } of contracts) {
    if (!config.networks[network][name]) {
      config.networks[network][name] = { address: "", abi: [] };
    }
    config.networks[network][name].address = await contract.getAddress();
    // @ts-ignore - getInterface is available but not typed
    config.networks[network][name].abi = JSON.parse(contract.interface.formatJson());
  }

  fs.writeFileSync(contractsPath, JSON.stringify(config, null, 2));
  console.log(`Updated frontend configuration for ${network} in contracts.json`);
}
