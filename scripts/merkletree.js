const hre = require("hardhat");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const { Web3 } = require("web3");

//UPDATE THIS ACCORDINGLY
const data = require("../purseBusdUserAmounts.json")

// npx hardhat run --network bscmainnet scripts/merkletree.js
async function main() {
    const web3 = new Web3();
    const keys = Object.keys(data);
    const values = Object.values(data);
    const balances = [];

    for (let i = 0; i < keys.length; i++) {
        address = keys[i];
        amount = values[i]["Amount"];
        if (amount > 0) {
            balances.push({
                address: address,
                amount: web3.eth.abi.encodeParameter(
                    "uint256",
                    amount
                )
            });
        }
    }

    const leafNodes = balances.map((balance) =>
        keccak256(
            Buffer.concat([
                Buffer.from(balance.address.replace("0x", ""), "hex"),
                Buffer.from(balance.amount.replace("0x", ""), "hex"),
            ])
        )
    );

    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    console.log();
    console.log("Merkle root:", merkleTree.getHexRoot());
    console.log();
    for (let i = 0; i < keys.length; i++) {
        address = keys[i];
        amount = values[i]["Amount"];
        if (amount > 0) {
            console.log("Merkle proof for address", address, ":");
            const proof = await merkleTree.getHexProof(leafNodes[i]);
            console.log(proof);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});