// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import './ICompound.sol';

contract CAProposal {
    address payable public immutable proposer;

    // Proposal data
    address[] public targets;
    uint[] public values;
    string[] public signatures;
    bytes[] public calldatas;
    string public description;

    // Compound smart contracts
    address public immutable comp;
    address public immutable governor;

    // Real proposal id
    uint public proposalId;
    bool public voted;

    /// @notice An event emitted when an autonomous proposal is launched
    event CAProposalLaunched(address indexed proposal, address indexed proposer, uint proposalId);
    event CAProposalTerminated(address indexed proposal, address indexed proposer);

    constructor(address payable proposer_,
                address[] memory targets_,
                uint[] memory values_,
                string[] memory signatures_,
                bytes[] memory calldatas_,
                string memory description_,
                address comp_,
                address governor_) public {
        proposer = proposer_;

        // Save proposal data
        targets = targets_;
        values = values_;
        signatures = signatures_;
        calldatas = calldatas_;
        description = description_;

        comp = comp_;
        governor = governor_;
    }

    function launch() external returns (uint) {
        require(isReadyToLaunch(), 'Not enough delegations to launch proposal');

        proposalId = IGovernorAlpha(governor).propose(targets, values, signatures, calldatas, description);
        emit CAProposalLaunched(address(this), proposer, proposalId);

        return proposalId;
    }

    function vote() public {
        IGovernorAlpha(governor).castVote(proposalId, true);
        voted = true;
    }

    function terminate() external {
        require(msg.sender == proposer, 'Only proposer can terminate proposal');

        // Make sure that votes were transfered from autonomous proposal to real one
        if (proposalId > 0 && !voted) {
            vote();
        }

        // Transfer Comp tokens from proposal contract back to the proposer
        IComp(comp).transfer(proposer, IComp(comp).balanceOf(address(this)));
        emit CAProposalTerminated(address(this), proposer);

        selfdestruct(proposer);
    }

    /// @notice Proposal delegates votes for staked COMP to itself
    function selfDelegate() external {
        IComp(comp).delegate(address(this));
    }

    function isReadyToLaunch() public view returns (bool) {
        return IComp(comp).getCurrentVotes(address(this)) >= IGovernorAlpha(governor).proposalThreshold();
    }
}
