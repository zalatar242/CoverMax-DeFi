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

  // Extract the object literal from the file
  const match = content.match(/export const networks = ({[\s\S]*?}) as const;/);
  if (!match) {
    throw new Error("Could not find networks object in addresses.ts");
  }
  let networksObj: any;
  try {
    // Use eval in a sandboxed way to parse the object literal
    // eslint-disable-next-line no-eval
    networksObj = eval('(' + match[1] + ')');
  } catch (e) {
    throw new Error("Failed to parse networks object: " + e);
  }

  // Update or add the network config
  networksObj[network] = config;

  // Serialize back to TypeScript
  const serialized = Object.entries(networksObj)
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v, null, 2)}`)
    .join(",\n");

  const newContent =
    "export const networks = {\n" +
    serialized +
    "\n} as const;\n\n" +
    (() => {
        const extra = content.split(/} as const;[\s\S]*/)[1];
        return extra ? extra.replace(/^\n+/, "") : "";
    })();

  fs.writeFileSync(addressesPath, newContent);
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
