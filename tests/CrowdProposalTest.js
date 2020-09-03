const { uint, address, encodeParameters, sendRPC } = require('./Helpers');
const BigNumber = require("bignumber.js");
const path = require('path');
const solparse = require('solparse');

const governorAlphaPath = path.join(__dirname, './', 'contracts', 'GovernorAlpha.sol');

const statesInverted = solparse
  .parseFile(governorAlphaPath)
  .body
  .find(k => k.type === 'ContractStatement')
  .body
  .find(k => k.name == 'ProposalState')
  .members

const states = Object.entries(statesInverted).reduce((obj, [key, value]) => ({ ...obj, [value]: key }), {});

describe('CrowdProposal', () => {
    let comp, gov, root, a1, accounts;
    let author, proposal;

    let targets, values, signatures, callDatas, description;

    const minCompThreshold = 100e18;

    async function getCurrentBlock() {
      return parseInt((await sendRPC(web3, "eth_blockNumber", [])).result);
    }

    beforeEach(async() => {
      [root, a1, ...accounts] = saddle.accounts;
      comp = await deploy('Comp', [root]);
      gov = await deploy('GovernorAlpha', [address(0), comp._address, root]);

      author = accounts[0];

      // Proposal data
      targets = [root];
      values = ["0"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [a1])];
      description = "do nothing";

      // Create proposal, mimic factory behavior
      proposal = await deploy('CrowdProposal', [author, targets, values, signatures, callDatas, description, comp._address, gov._address]);
      // 1. Stake COMP
      await send(comp, 'transfer', [proposal._address, uint(minCompThreshold)], { from: root });
      // 2. Delegate votes from staked COMP
      await send(proposal, 'selfDelegate', {from: root});
    });

    describe('metadata', () => {
      it('has govProposalId set to 0', async () => {
        expect(await call(proposal, 'govProposalId')).toEqual('0');
      });

      it('has votesTransfered set to false', async () => {
        expect(await call(proposal, 'voted')).toEqual(false);
      });

      it('has given author', async () => {
        expect(await call(proposal, 'author')).toEqual(author);
      });

      it('has given comp', async () => {
        expect(await call(proposal, 'comp')).toEqual(comp._address);
      });

      it('has given governor', async () => {
        expect(await call(proposal, 'governor')).toEqual(gov._address);
      });

      it('has given targets', async () => {
        expect(await call(proposal, 'targets', [0])).toEqual(targets[0]);
      });

      it('has given values', async () => {
        expect(await call(proposal, 'values', [0])).toEqual(values[0]);
      });

      it('has given signatures', async () => {
        expect(await call(proposal, 'signatures', [0])).toEqual(signatures[0]);
      });

      it('has given calldatas', async () => {
        expect(await call(proposal, 'calldatas', [0])).toEqual(callDatas[0]);
      });

      it('has given description', async () => {
        expect(await call(proposal, 'description')).toEqual(description);
      });
    });

    describe('propose', () => {
      it('should pass if enough votes were delegated', async() => {
        // Check start balance of votes
        const minComp = new BigNumber(minCompThreshold).toFixed();
        expect(await call(comp, 'balanceOf', [proposal._address])).toEqual(minComp);
        expect(await call(comp, 'getCurrentVotes', [proposal._address])).toEqual(minComp);

        // Check that gov proposal has not beem proposed yet
        expect(await call(proposal, 'govProposalId')).toEqual('0');

        // Delegate all votes to proposal
        await send(comp, 'delegate', [proposal._address], {from: root});

        // Propose
        const trx = await send(proposal, 'propose', {from: root});

        // Check trx data
        const proposalEvent = trx.events['CrowdProposalProposed'];
        expect(proposalEvent.returnValues.author).toEqual(author);
        expect(proposalEvent.returnValues.proposal).toEqual(proposal._address);
        const govProposalId = proposalEvent.returnValues.proposalId;
        expect(await call(proposal, 'govProposalId')).toEqual(govProposalId);

        // Check state of government proposal
        const proposalData = await call(gov, 'proposals', [govProposalId]);
        expect(proposalData.againstVotes).toBe('0');
        expect(proposalData.forVotes).toBe('0');
        expect(await call(gov, 'state', [govProposalId], {})).toEqual(states["Pending"]);

        await sendRPC(web3, "evm_mine", []);
        await sendRPC(web3, "evm_mine", []);

        expect(await call(gov, 'state', [govProposalId], {})).toEqual(states["Active"]);
      })

      it('should revert if gov proposal was already proposed', async() => {
        // Delegate all votes to proposal
        await send(comp, 'delegate', [proposal._address], {from: root});

        // Propose successful
        await send(proposal, 'propose', {from: root});
        expect(parseInt(await call(proposal, 'govProposalId'))).toBeGreaterThan(0);

        // Propose reverts
        await expect(send(proposal, 'propose', {from: root}))
        .rejects.toRevert("revert Not enough delegations or was already proposed");
      })

      it('should revert if not enough votes were delegated', async() => {
        // Check that there are some initial votes delegated
        expect(await call(comp, 'getCurrentVotes', [proposal._address]))
          .toEqual(new BigNumber(minCompThreshold).toFixed());

        // Propose reverts, not enough votes were delegated
        await expect(send(proposal, 'propose', {from: root}))
        .rejects.toRevert("revert Not enough delegations or was already proposed");

        expect(await call(proposal, 'govProposalId')).toEqual('0');
      })
    });

    describe('terminate', () => {
      it('should terminate after gov proposal was created', async() => {
        // Delegate all votes to proposal
        await send(comp, 'delegate', [proposal._address], {from: root});

        // Propose
        await send(proposal, 'propose', {from: root});
        const govProposalId = await call(proposal, 'govProposalId');

        await sendRPC(web3, "evm_mine", []);

        // Terminate crowdsale proposal
        const trx  = await send(proposal, 'terminate', {from: author});
        const terminateEvent = trx.events['CrowdProposalTerminated'];
        expect(terminateEvent.returnValues.author).toEqual(author);
        expect(terminateEvent.returnValues.proposal).toEqual(proposal._address);

        // Staked COMP is transfered back to author
        expect(await call(comp, 'balanceOf', [author])).toEqual(minCompThreshold.toString());

        // Check state and governance proposal votes
        expect(await call(gov, 'state', [govProposalId])).toEqual(states["Active"]);
        const proposalData = await call(gov, 'proposals', [govProposalId]);
        expect(proposalData.againstVotes).toBe('0');
        expect(proposalData.forVotes).toBe(await call(comp, 'totalSupply'));
      })

      // TODO discuss if this is OK?
      it('should terminate without transfering votes!!!', async() => {
        // Delegate all votes to proposal
        await send(comp, 'delegate', [proposal._address], {from: root});

        // Propose
        await send(proposal, 'propose', {from: root});
        const govProposalId = await call(proposal, 'govProposalId');

        // Terminate crowdsale proposal
        await send(proposal, 'terminate', {from: author});

        // Staked COMP is transfered back to author
        expect(await call(comp, 'balanceOf', [author])).toEqual(minCompThreshold.toString());

        // Check state and governance proposal votes
        expect(await call(gov, 'state', [govProposalId])).toEqual(states["Pending"]);
        const proposalData = await call(gov, 'proposals', [govProposalId]);
        expect(proposalData.againstVotes).toBe('0');
        expect(proposalData.forVotes).toBe('0');
      })

      it('should terminate without proposing, not enough votes were delegated', async() => {
        expect(await call(proposal, 'govProposalId')).toEqual('0');
        // Terminate crowdsale proposal
        await send(proposal, 'terminate', {from: author});

        // Staked COMP is transfered back to author
        expect(await call(comp, 'balanceOf', [author])).toEqual(minCompThreshold.toString());
      })

      // TODO discuss if this is OK?
      it('should terminate without proposing, even with enough delegated votes', async() => {
        // Delegate all votes to proposal
        await send(comp, 'delegate', [proposal._address], {from: root});

        expect(await call(proposal, 'govProposalId')).toEqual('0');
        // Terminate crowdsale proposal
        await send(proposal, 'terminate', {from: author});

        // Staked COMP is transfered back to author
        expect(await call(comp, 'balanceOf', [author])).toEqual(minCompThreshold.toString());
      })

      it('should revert if called not by author', async() => {
        // Terminate reverts
        await expect(send(proposal, 'terminate', {from: root}))
        .rejects.toRevert("revert Only author can terminate proposal");
      })

    });

    describe('full workflows', () => {
      it('CrowdProposal is successful', async () => {
        // Delegate more votes to the proposal
        const compWhale = accounts[1];
        const proposalThreshold = await call(gov, 'proposalThreshold');
        const currentVotes = await call(comp, 'getCurrentVotes', [proposal._address]);
        const quorum = new BigNumber(proposalThreshold).plus(1);
        const remainingVotes = quorum.minus(new BigNumber(currentVotes));

        expect(await call(proposal, 'isReadyToPropose')).toEqual(false);

        // Create Compound mini whale
        await send(comp, 'transfer', [compWhale, uint(remainingVotes.toFixed())], { from: root });
        // Whale delegates just enough to push proposal through
        await send(comp, 'delegate', [proposal._address], {from: compWhale});

        expect(await call(comp, 'getCurrentVotes', [proposal._address])).toEqual(quorum.toFixed());
        expect(await call(proposal, 'isReadyToPropose')).toEqual(true);

        // Launch governance proposal
        await send(proposal, 'propose', {from: root});
        const govProposalId = await call(proposal, 'govProposalId');

        await sendRPC(web3, "evm_mine", []);

        expect(await call(comp, 'balanceOf', [author])).toEqual("0");

        await send(proposal, 'terminate', {from: author});

        // Staked COMP is transfered back to author
        expect(await call(comp, 'balanceOf', [author])).toEqual(minCompThreshold.toString());

        // Check votes for governance proposal
        const proposalData = await call(gov, 'proposals', [govProposalId]);
        expect(proposalData.againstVotes).toBe('0');
        expect(proposalData.forVotes).toBe(quorum.toFixed());
      });

      it('CrowdProposal fails if not enough votes were delegated', async () => {
        // Delegate more votes to the crowd proposal
        const delegator1 = accounts[1];
        const delegator2 = accounts[2];

        const proposalThreshold = await call(gov, 'proposalThreshold');
        const currentVotes = await call(comp, 'getCurrentVotes', [proposal._address]);
        const quorum = new BigNumber(proposalThreshold).plus(1);
        const remainingVotes = quorum.minus(new BigNumber(currentVotes));

        // Proposal doesn't have enough votes to create governance proposal
        expect(await call(proposal, 'isReadyToPropose')).toEqual(false);

        // Fund delegators with some COMP, but not enough for proposal to pass
        await send(comp, 'transfer', [delegator1, uint(remainingVotes.dividedToIntegerBy(10).toFixed())], { from: root });
        await send(comp, 'transfer', [delegator2, uint(remainingVotes.dividedToIntegerBy(10).toFixed())], { from: root });

        // Delegation period
        await send(comp, 'delegate', [proposal._address], {from: delegator1});
        await send(comp, 'delegate', [proposal._address], {from: delegator2});
        expect(await call(proposal, 'isReadyToPropose')).toEqual(false);

        // Time passes ..., nobody delegates, proposal author gives up and wants their staked COMP back
        expect(await call(proposal, 'govProposalId')).toEqual("0");
        await send(proposal, 'terminate', {from: author});

        // Staked COMP is transfered back to author
        expect(await call(comp, 'balanceOf', [author])).toEqual(minCompThreshold.toString());
      });
    });
})