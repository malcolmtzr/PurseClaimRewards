const hre = require("hardhat");

//npx hardhat run --network bsctestnet scripts/deployTestClaimRewards.js
//npx hardhat verify --network bsctestnet 0x... 0x21e355...merkleRootConstructorArgument
async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer address: ", deployer.address);
    console.log();

    const ClaimRewards = await hre.ethers.getContractFactory("ClaimRewards");
    const claimRewards = await ClaimRewards.deploy(
        "0x21e355e07f9efc7591d406770fcfa833afcd6b808364ef5c730b4279e279a33f"
    );
    await claimRewards.waitForDeployment();
    console.log("ClaimRewards address: ", claimRewards.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});