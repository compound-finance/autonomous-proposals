// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import './ICompound.sol';

contract CrowdProposal {
    address payable public immutable author;

    // Proposal data
    address[] public targets;
    uint[] public values;
    string[] public signatures;
    bytes[] public calldatas;
    string public description;

    // Compound smart contracts
    address public immutable comp;
    address public immutable governor;

    uint public immutable compProposalThreshold;

    // Governance proposal id
    uint public govProposalId;
    bool public voted;

    /// @notice An event emitted when an autonomous proposal is launched
    event CrowdProposalProposed(address indexed proposal, address indexed author, uint proposalId);
    event CrowdProposalTerminated(address indexed proposal, address indexed author);

    constructor(address payable author_,
                uint compProposalThreshold_,
                address[] memory targets_,
                uint[] memory values_,
                string[] memory signatures_,
                bytes[] memory calldatas_,
                string memory description_,
                address comp_,
                address governor_) public {
        author = author_;
        compProposalThreshold = compProposalThreshold_;

        // Save proposal data
        targets = targets_;
        values = values_;
        signatures = signatures_;
        calldatas = calldatas_;
        description = description_;

        comp = comp_;
        governor = governor_;
    }

    function propose() external returns (uint) {
        require(IComp(comp).balanceOf(address(this)) >= compProposalThreshold, 'Not enough staked COMP');
        require(isReadyToPropose(), 'Not enough delegations or was already proposed');

        govProposalId = IGovernorAlpha(governor).propose(targets, values, signatures, calldatas, description);
        emit CrowdProposalProposed(address(this), author, govProposalId);

        return govProposalId;
    }

    function terminate() external {
        require(msg.sender == author, 'Only author can terminate proposal');

        // Transfer votes from the crowd proposal to the governance proposal
        if (isReadyToVote()) {
            vote();
        }

        // Transfer Comp tokens from the crowdproposal contract back to the author
        IComp(comp).transfer(author, IComp(comp).balanceOf(address(this)));

        emit CrowdProposalTerminated(address(this), author);
    }

    /// @notice Proposal delegates votes for staked COMP to itself
    function selfDelegate() external {
        IComp(comp).delegate(address(this));
    }

    function vote() public {
        require(isReadyToVote(), 'No active gov proposal or was already voted');
        IGovernorAlpha(governor).castVote(govProposalId, true);
        voted = true;
    }

    function isReadyToPropose() public view returns (bool) {
        return govProposalId == 0 &&
            IComp(comp).getCurrentVotes(address(this)) >= IGovernorAlpha(governor).proposalThreshold();
    }

    function isReadyToVote() public view returns (bool) {
        return !voted && govProposalId > 0 &&
            IGovernorAlpha(governor).state(govProposalId) == IGovernorAlpha.ProposalState.Active;
    }
}
