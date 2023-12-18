const hre = require("hardhat");

//npx hardhat run --network bsctestnet scripts/deployMockERC20.js
//npx hardhat verify --network bsctestnet 0x...
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address: ", deployer.address);
  console.log();

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const mockERC20 = await MockERC20.deploy();
  await mockERC20.waitForDeployment();
  console.log("MockERC20 address: ", mockERC20.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
