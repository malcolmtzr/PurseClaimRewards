const hre = require("hardhat");

//npx hardhat run --network bscmainnet scripts/deplyMainClaimRewards.js
//npx hardhat verify --network bscmainnet 0x... 0x...merkleRootConstructorArgument
async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer address: ", deployer.address);
    console.log();

    const ClaimRewards = await hre.ethers.getContractFactory("ClaimRewards");
    const claimRewards = await ClaimRewards.deploy(
        "0x36fd4d3242a2f02a43305d12622d88534073ed99c507185e78438e98740838f8"
    );
    await claimRewards.waitForDeployment();
    console.log("ClaimRewards address: ", claimRewards.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});