const { assert, expect } = require("chai");
require("dotenv").config();
const hre = require("hardhat");

//npx hardhat test --network bsctestnet test/testRewardsClaim.js
describe("RewardsClaim", function () {
    const mockERC20Address = "0x4176cC1D086dA2263b14559dF0a1e867987F2108"
    const mockERC20Symbol = "MockERC20";

    const claimContractAddress = "0x1A2A0272cCa417794c60328840C63c018CE2e648"
    const claimContractSymbol = "ClaimRewards";

    let owner;
    let ownerAmount = BigInt("104903780071000742319900");
    let ownerProof = [
        '0xdf31bd4af651fe32f62943b76045cdc7fcebb741a55830b724d4980a7e9fbb17',
        '0x7abf67a70a5918d2b324824a4a9e62150df588e9c8d08557393a6376064bacb6'
    ];

    let user2;
    let user2Amount = BigInt("257593361472049017641626");
    let user2Proof = [
        '0x8f454c4b093be0c04ba1002e18a8442b89dc68f7df400cd1babc328c9dec69e6',
        '0x7abf67a70a5918d2b324824a4a9e62150df588e9c8d08557393a6376064bacb6'
    ];

    let user3;
    let user3Amount = BigInt("546253633960647171721403");
    let user3Proof = [
        '0x77058b204956e02529e07cade6b253cc7cb30b2bfd3c7dad4e53fa347fb59c4d',
        '0x35b738109415d750e08e58f1cca87e29c82f196cf757261dbb0e1a0fa1472f35'
    ];

    let user4;
    let user4Amount = BigInt("156521576848631373786003");
    let user4Proof = [
        '0xd6b4f9151982bb6de6aa8b519ff0736cac12cee6cba5e06baa1957bb58565d5e',
        '0x35b738109415d750e08e58f1cca87e29c82f196cf757261dbb0e1a0fa1472f35'
    ];

    let mockERC20Contract;
    let claimContract;

    beforeEach(async () => {
        [owner, user2, user3, user4] = await hre.ethers.getSigners();

        mockERC20Contract = await hre.ethers.getContractAt(
            mockERC20Symbol,
            mockERC20Address
        );

        claimContract = await hre.ethers.getContractAt(
            claimContractSymbol,
            claimContractAddress
        );
    });

    describe("Test access control", function () {
        it("updateMerkleRoot should revert if not owner", async () => {
            await expect(
                claimContract.connect(user2).updateMerkleRoot(
                    "0x1231231231231231231231231231231231231231231231231231231231231231"
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("updateRewardPeriodId should revert if not owner", async () => {
            await expect(
                claimContract.connect(user3).updateRewardPeriodId(0, 0)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("updateCurrentRewardPeriodTimes should revert if not owner", async () => {
            await expect(
                claimContract.connect(user4).updateCurrentRewardPeriodTimes(0, 1, 2)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("returnToken should revert if not owner", async () => {
            await expect(
                claimContract.connect(user2).returnToken(mockERC20Address, 1, user3.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Test updateMerkleRoot", function () {
        let originalMerkleRoot;
        before(async () => {
            originalMerkleRoot = await claimContract.merkleRoot();
        });

        it("updateMerkleRoot should not update with same root", async () => {
            await expect(
                claimContract.connect(owner).updateMerkleRoot(originalMerkleRoot)
            ).to.be.revertedWith("New merkle root must not be equal to existing merkle root");
        });

        it("updateMerkleRoot should update merkleRoot", async () => {
            const tx1 = await claimContract.connect(owner).updateMerkleRoot(
                "0x1231231231231231231231231231231231231231231231231231231231231231"
            );
            await tx1.wait();
            await new Promise(resolve => setTimeout(resolve, 5000));
            const merkleRootAfter = await claimContract.merkleRoot();
            expect(merkleRootAfter).not.equal(originalMerkleRoot);

            const tx2 = await claimContract.connect(owner).updateMerkleRoot(originalMerkleRoot);
            await tx2.wait();
            await new Promise(resolve => setTimeout(resolve, 5000));
            const latestMerkleRoot = await claimContract.merkleRoot();
            expect(latestMerkleRoot).to.be.equal(originalMerkleRoot);
        });
    });

    describe("Test updateCurrentRewardPeriodTimes", function () {
        let originalStartTime;
        let originalEndTime;
        let currentRewardPeriodId;
        before(async () => {
            currentRewardPeriodId = await claimContract.currentRewardPeriodId();
            const currentRewardPeriod = await claimContract.rewardPeriods(currentRewardPeriodId);
            originalStartTime = currentRewardPeriod[0]; //BigInt
            originalEndTime = currentRewardPeriod[1]; //BigInt
        });

        it("Should not update with invalid period id, start and end times", async () => {
            await expect(
                claimContract.connect(owner).updateCurrentRewardPeriodTimes(5, 1, 2)
            ).to.be.revertedWith("Only current reward period id");

            await expect(
                claimContract.connect(owner).updateCurrentRewardPeriodTimes(0, 2, 1)
            ).to.be.revertedWith("End time must be greater than start time");

            await expect(
                claimContract.connect(owner).updateCurrentRewardPeriodTimes(0, 1602523520, 1602623521)
            ).to.be.revertedWith("Invalid timestamp");
        });

        it("Should update the current reward period start and end times", async () => {
            const tx1 = await claimContract.connect(owner).updateCurrentRewardPeriodTimes(
                0,
                1702684998,
                1702684999
            );
            await tx1.wait();
            await new Promise(resolve => setTimeout(resolve, 5000));
            const updatedCurrentRewardPeriod = await claimContract.rewardPeriods(currentRewardPeriodId);
            const updatedStartTime = updatedCurrentRewardPeriod[0];
            const updatedEndTime = updatedCurrentRewardPeriod[1];
            expect(originalStartTime).not.equal(updatedStartTime); //error herer?
            expect(originalEndTime).not.equal(updatedEndTime);
            expect(updatedStartTime).to.be.gt(originalStartTime);
            expect(updatedEndTime).to.be.gt(originalEndTime);
        });
    });

    describe("Test claimRewards", function () {
        before(async () => {
            const tx = await mockERC20Contract.connect(owner).transfer(
                claimContractAddress,
                BigInt(Number(10000000 * 10 ** 18))
            );
            await tx.wait();
            await new Promise(resolve => setTimeout(resolve, 5000));
        });

        it("Should revert if claim not started", async () => {
            await expect(
                claimContract.connect(owner).claimRewards(
                    ownerAmount,
                    ownerProof
                )
            ).to.be.revertedWith("Claim not started");
        });

        it("Should revert if merkle proof is invalid", async () => {
            const tx1 = await claimContract.connect(owner).updateCurrentRewardPeriodTimes(
                0,
                1702500000,
                1702683893 //~in two days from start
            );
            await tx1.wait();
            await new Promise(resolve => setTimeout(resolve, 5000));
            const invalidProof = [
                '0xaf31bd4af651fe32f62943b76045cdc7fcebb741a55830b724d4980a7e9fbb17',
                '0xaabf67a70a5918d2b324824a4a9e62150df588e9c8d08557393a6376064bacb6'
            ];
            await expect(
                claimContract.connect(user4).claimRewards(
                    user4Amount,
                    invalidProof
                )
            ).to.be.revertedWith("Invalid proof.");
        });

        it("Should be able to claim rewards", async () => {
            const userBalanceBefore = await mockERC20Contract.balanceOf(user4.address);
            const tx1 = await claimContract.connect(user4).claimRewards(
                user4Amount,
                user4Proof
            );
            await tx1.wait();
            await new Promise(resolve => setTimeout(resolve, 5000));
            const userBalanceAfter = await mockERC20Contract.balanceOf(user4.address);
            expect(userBalanceAfter).to.be.gt(userBalanceBefore);
            expect(userBalanceAfter).to.be.equal(userBalanceBefore + user4Amount);
        });

        it("Should not allow to claim rewards twice", async () => {
            await expect(
                claimContract.connect(user4).claimRewards(
                    user4Amount,
                    user4Proof
                )
            ).to.be.revertedWith("Already claimed");
        });
    });

    describe("Test returnToken", function () {
        it("Should revert accordingly", async () => {
            await expect(
                claimContract.connect(owner).returnToken(
                    mockERC20Address,
                    1,
                    "0x0000000000000000000000000000000000000000")
            ).to.be.revertedWith("Zero address");
            await expect(
                claimContract.connect(owner).returnToken(mockERC20Address, 0, owner.address)
            ).to.be.revertedWith("Amount must be greater than 0");
        });

        it("Should return token", async () => {
            const contractBalanceBefore = await mockERC20Contract.balanceOf(claimContractAddress);
            const ownerBalanceBefore = await mockERC20Contract.balanceOf(owner.address);
            const tx = await claimContract.connect(owner).returnToken(mockERC20Address, contractBalanceBefore, owner.address);
            await tx.wait();
            await new Promise(resolve => setTimeout(resolve, 5000));
            const contractBalanceAfter = await mockERC20Contract.balanceOf(claimContractAddress);
            const ownerBalanceAfter = await mockERC20Contract.balanceOf(owner.address);
            expect(contractBalanceAfter).to.be.equal(0);
            expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
        });
    });

    describe("Should update reward period id", function () {
        it("Should revert if invalid times", async () => {
            await expect(
                claimContract.connect(owner).updateRewardPeriodId(5, 0)
            ).to.be.revertedWith("End time must be greater than start time");

            await expect(
                claimContract.connect(owner).updateRewardPeriodId(1602523520, 1602623521)
            ).to.be.revertedWith("Invalid timestamp");
        });

        it("Should update reward period id", async () => {
            const rewardPeriodIdBefore = await claimContract.currentRewardPeriodId();
            const tx1 = await claimContract.connect(owner).updateRewardPeriodId(
                1702784998,
                1702784999
            );
            await tx1.wait();
            await new Promise(resolve => setTimeout(resolve, 5000));
            const rewardPeriodIdAfter = await claimContract.currentRewardPeriodId();
            expect(rewardPeriodIdAfter).to.be.equal(rewardPeriodIdBefore + BigInt(1));

            const updatedCurrentRewardPeriod = await claimContract.rewardPeriods(rewardPeriodIdAfter);
            const updatedStartTime = updatedCurrentRewardPeriod[0];
            const updatedEndTime = updatedCurrentRewardPeriod[1];
            expect(updatedStartTime).to.be.equal(1702784998);
            expect(updatedEndTime).to.be.equal(1702784999);
        });
    });

});