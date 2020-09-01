// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

interface IComp {
    function delegate(address delegatee) external;
    function getCurrentVotes(address account) external view returns (uint96);
    function balanceOf(address account) external view returns (uint);
    function transfer(address dst, uint rawAmount) external returns (bool);
    function transferFrom(address src, address dst, uint rawAmount) external returns (bool);
}

interface IGovernorAlpha {
    function proposalThreshold() external pure returns (uint);
    function propose(address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas, string memory description) external returns (uint);
    function castVote(uint proposalId, bool support) external;
}