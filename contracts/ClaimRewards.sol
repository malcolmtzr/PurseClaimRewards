// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ClaimRewards is Ownable, ReentrancyGuard{
    using SafeERC20 for IERC20;
    
    //Mainnet PURSE: 0x29a63F4B209C29B4DC47f06FFA896F32667DAD2C
    address public constant PURSE = 0x29a63F4B209C29B4DC47f06FFA896F32667DAD2C;
    bytes32 public merkleRoot;
    uint256 public currentRewardPeriodId;
    struct RewardPeriod {
        uint128 startTime;
        uint128 endTime;
    }
    mapping(uint256 => RewardPeriod) public rewardPeriods;

    //address => rewardPeriodId => isClaim
    mapping(address => mapping(uint256 => bool)) public isClaim;

    event Claim(address indexed user, uint256 indexed id, uint256 amount);
    event UpdateMerkleRoot(bytes32 indexed merkleRoot);
    event UpdateRewardPeriodTime(uint256 indexed id, uint128 indexed startTime, uint128 indexed endTime);
    event UpdateRewardPeriodId(uint256 indexed id, uint128 indexed startTime, uint128 indexed endTime);
    event ReturnToken(address indexed token, uint256 indexed amount, address indexed to);

    constructor(bytes32 _merkleRoot) {
        merkleRoot = _merkleRoot;
        currentRewardPeriodId = 0;
        rewardPeriods[currentRewardPeriodId] = RewardPeriod(
            uint128(block.timestamp), 
            uint128(block.timestamp + 1 days)
        );
    }

    function updateMerkleRoot(bytes32 _newMerkleRoot) external onlyOwner {
        require(_newMerkleRoot != merkleRoot, "New merkle root must not be equal to existing merkle root");
        merkleRoot = _newMerkleRoot;

        emit UpdateMerkleRoot(merkleRoot);
    }

    //Updates to the next rewards period id, with the given start time and end time
    function updateRewardPeriodId(uint128 _startTime, uint128 _endTime) external onlyOwner {
        require(_endTime > _startTime, "End time must be greater than start time");
        require(_endTime > block.timestamp, "Invalid timestamp");

        currentRewardPeriodId++;
        rewardPeriods[currentRewardPeriodId] = RewardPeriod(_startTime, _endTime);

        emit UpdateRewardPeriodId(currentRewardPeriodId, _startTime, _endTime);
    }

    function updateCurrentRewardPeriodTimes(uint256 _id, uint128 _startTime, uint128 _endTime) external onlyOwner {
        require(_id == currentRewardPeriodId, "Only current reward period id");
        require(_endTime > _startTime, "End time must be greater than start time");
        require(_endTime > block.timestamp, "Invalid timestamp");

        RewardPeriod storage rewardPeriod = rewardPeriods[_id];
        rewardPeriod.startTime = _startTime;
        rewardPeriod.endTime = _endTime;

        emit UpdateRewardPeriodTime(_id, _startTime, _endTime);
    }

    function claimRewards(uint256 _amount, bytes32[] calldata _merkleProof) external nonReentrant {
        RewardPeriod memory rewardPeriod = rewardPeriods[currentRewardPeriodId];
        
        require(block.timestamp >= rewardPeriod.startTime, "Claim not started");
        require(block.timestamp <= rewardPeriod.endTime, "Claim ended");
        require(!isClaim[msg.sender][currentRewardPeriodId], "Already claimed");

        bytes32 node = keccak256(abi.encodePacked(msg.sender, _amount));
        require(MerkleProof.verifyCalldata(_merkleProof, merkleRoot, node), 'Invalid proof.');
        isClaim[msg.sender][currentRewardPeriodId] = true;

        emit Claim(msg.sender, currentRewardPeriodId, _amount);
        IERC20(PURSE).safeTransfer(msg.sender, _amount);
    }

    function returnToken(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "Zero address");
        require(amount > 0, "Amount must be greater than 0");
        emit ReturnToken(token, amount, to);
        IERC20(token).safeTransfer(to, amount);
    }
}
