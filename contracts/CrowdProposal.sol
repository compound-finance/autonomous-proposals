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

    // Governance proposal id
    uint public govProposalId;

    /// @notice An event emitted when an autonomous proposal is launched
    event CrowdProposalProposed(address indexed proposal, address indexed author, uint proposalId);
    event CrowdProposalTerminated(address indexed proposal, address indexed author);

    constructor(address payable author_,
                address[] memory targets_,
                uint[] memory values_,
                string[] memory signatures_,
                bytes[] memory calldatas_,
                string memory description_,
                address comp_,
                address governor_) public {
        author = author_;

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
        require(isReadyToLaunch(), 'Not enough delegations to launch proposal');

        govProposalId = IGovernorAlpha(governor).propose(targets, values, signatures, calldatas, description);
        emit CrowdProposalProposed(address(this), author, govProposalId);

        return govProposalId;
    }

    function terminate() external {
        require(msg.sender == author, 'Only author can terminate proposal');

        // Transfer votes from the crowd proposal to the governance proposal
        if (govProposalId > 0 && goIGovernorAlpha(governor).state(govProposalId) == IGovernorAlpha.ProposalState.Active) {
            IGovernorAlpha(governor).castVote(govProposalId, true);
        }

        // Transfer Comp tokens from proposal contract back to the author
        IComp(comp).transfer(author, IComp(comp).balanceOf(address(this)));
        emit CrowdProposalTerminated(address(this), author);

        selfdestruct(author);
    }

    /// @notice Proposal delegates votes for staked COMP to itself
    function selfDelegate() external {
        IComp(comp).delegate(address(this));
    }

    function isReadyToLaunch() public view returns (bool) {
        return IComp(comp).getCurrentVotes(address(this)) >= IGovernorAlpha(governor).proposalThreshold();
    }
}
