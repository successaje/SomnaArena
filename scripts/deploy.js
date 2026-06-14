import { network } from "hardhat";

async function main() {
  const connection = await network.create();
  const { ethers } = connection;

  const [deployer] = await ethers.getSigners();
  console.log("----------------------------------------------------");
  console.log("Deploying SomnArena Civilization to Somnia Testnet...");
  console.log("Deployer account address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer account balance:", ethers.formatEther(balance), "STT");

  // 1. Deploy SomnArenaToken
  console.log("\nDeploying SomnArenaToken (ERC20)...");
  const SomnArenaToken = await ethers.getContractFactory("SomnArenaToken");
  const tokenContract = await SomnArenaToken.deploy();
  await tokenContract.waitForDeployment();
  const tokenAddress = await tokenContract.getAddress();
  console.log("SomnArenaToken successfully deployed at:", tokenAddress);
  console.log("Deployment Transaction Hash:", tokenContract.deploymentTransaction()?.hash || "Unknown");

  // 2. Deploy SomnArenaTournament
  console.log("\nDeploying SomnArenaTournament...");
  const SomnArenaTournament = await ethers.getContractFactory("SomnArenaTournament");
  const tournamentContract = await SomnArenaTournament.deploy(tokenAddress);
  await tournamentContract.waitForDeployment();
  const tournamentAddress = await tournamentContract.getAddress();
  console.log("SomnArenaTournament successfully deployed at:", tournamentAddress);
  console.log("Deployment Transaction Hash:", tournamentContract.deploymentTransaction()?.hash || "Unknown");
  console.log("----------------------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
