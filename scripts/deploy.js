import { network } from "hardhat";

async function main() {
  const connection = await network.create();
  const { ethers } = connection;

  const [deployer] = await ethers.getSigners();
  console.log("----------------------------------------------------");
  console.log("Deploying SomnArenaTournament.sol to Somnia Shannon Testnet...");
  console.log("Deploying account address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer account balance:", ethers.formatEther(balance), "STT");

  const SomnArenaTournament = await ethers.getContractFactory("SomnArenaTournament");
  console.log("Deploying contract...");
  const contract = await SomnArenaTournament.deploy();
  
  console.log("Transaction submitted. Waiting for block confirmation...");
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("SomnArenaTournament successfully deployed!");
  console.log("Contract Address:", address);
  console.log("Transaction Hash:", contract.deploymentTransaction()?.hash || "Unknown");
  console.log("----------------------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
