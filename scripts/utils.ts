import * as fs from 'fs';
import { BaseContract, Interface, Fragment } from 'ethers';
import path from 'path';

interface ContractData {
  address: string;
  abi: string[];
}

interface NetworkContracts {
  [contractName: string]: ContractData;
}

interface ContractsConfig {
  networks: {
    [networkName: string]: NetworkContracts;
  };
}

interface ContractUpdate {
  name: string;
  contract: BaseContract;
  abiStrings?: string[];
}

export async function updateContractsJson(
  networkName: string,
  contractUpdates: ContractUpdate[]
) {
  const contractsPath = path.join(__dirname, '../frontend/src/contracts.json');

  // Read existing contracts.json
  let contractsConfig: ContractsConfig = { networks: {} };
  if (fs.existsSync(contractsPath)) {
    contractsConfig = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
  }

  // Ensure network exists
  if (!contractsConfig.networks[networkName]) {
    contractsConfig.networks[networkName] = {};
  }

  // Update each contract
  for (const { name, contract, abiStrings } of contractUpdates) {
    const address = await contract.getAddress();

    // Get ABI - either from provided strings or from contract interface
    let abi = abiStrings;
    if (!abi) {
      const interface_ = contract.interface as Interface;
      abi = interface_.fragments.map((fragment: Fragment) => {
        // Skip constructor formatting as it doesn't support sighash
        if (fragment.type === "constructor") {
          return `constructor(${fragment.inputs.map(input => `${input.type} ${input.name}`).join(", ")})`;
        }
        return fragment.format();
      });
    }

    contractsConfig.networks[networkName][name] = {
      address,
      abi,
    };
  }

  // Write back to file
  fs.writeFileSync(
    contractsPath,
    JSON.stringify(contractsConfig, null, 2)
  );

  console.log(`Updated ${contractsPath} with new contract addresses for network: ${networkName}`);
}
