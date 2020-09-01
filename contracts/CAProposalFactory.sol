// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import './ICompound.sol';
import './CAProposal.sol';

contract CAProposalFactory {
    /// @notice `COMP` token contract address
    address public immutable comp;
    /// @notice Compound protocol `GovernorAlpha` contract address
    address public immutable governor;
    /// @notice Minimum Comp tokens required to create an autonomous proposal
    uint public immutable compProposalThreshold;

    /// @notice An event emitted when a new autonomous proposal is created
    event CAProposalCreated(address indexed proposal, address indexed proposer, address[] targets, uint[] values, string[] signatures, bytes[] calldatas, string description);

     /**
     * @notice Construct a proposal factory for creating new Compound autonomous proposals
     * @dev Draft mode
     * @param comp_ `COMP` token contract address
     * @param governor_ Compound protocol `GovernorAlpha` contract address
     * @param compProposalThreshold_ The minimum amount of Comp tokes required for creation of new proposal
     */
    constructor(address comp_,
                address governor_,
                uint compProposalThreshold_) public {
        comp = comp_;
        governor = governor_;
        compProposalThreshold = compProposalThreshold_;
    }

    /// @notice create a new CAP - Compound Autonomous Proposal
    /// @dev call `Comp.approve(factory_address, compProposalThreshold)` before calling this method
    function createCAProposal(address[] memory targets,
                       uint[] memory values,
                       string[] memory signatures,
                       bytes[] memory calldatas,
                       string memory description) external {
        require(IComp(comp).balanceOf(msg.sender) >= compProposalThreshold, 'Min Comp balance requirement is not met');

        CAProposal cap = new CAProposal(msg.sender, targets, values, signatures, calldatas, description, comp, governor);

        emit CAProposalCreated(address(cap), msg.sender, targets, values, signatures, calldatas, description);

        IComp(comp).transferFrom(msg.sender, address(cap), compProposalThreshold);
    }

}