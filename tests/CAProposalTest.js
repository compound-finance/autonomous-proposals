const { uint, address, encodeParameters, sendRPC } = require('./Helpers');
const BigNumber = require("bignumber.js");

describe('CAProposal', () => {
    let comp, gov, root, a1, accounts;
    let proposer, proposal;

    const minCompThreshold = 100e18;

    beforeEach(async() => {
      [root, a1, ...accounts] = saddle.accounts;
      comp = await deploy('Comp', [root]);
      gov = await deploy('GovernorAlpha', [address(0), comp._address, root]);

      proposer = accounts[0];
      // Proposal data
      const targets = [root];
      const values = ["0"];
      const signatures = ["getBalanceOf(address)"];
      const callDatas = [encodeParameters(['address'], [a1])];
      const description = "do nothing";
      proposal = await deploy('CAProposal', [proposer, targets, values, signatures, callDatas, description, comp._address, gov._address]);
    });

    describe('successful workflow', () => {

      it('whole workflow', async () => {
        // Fund proposal
        await send(comp, 'transfer', [proposal._address, uint(minCompThreshold)], { from: root });

        // Delegate votes to proposal
        await call(proposal, 'selfDelegate', {from: root});

        // Delegate votes to proposal
        const compWhale = accounts[1];

        const proposalThreshold = await call(gov, 'proposalThreshold');
        const currentVotes = await call(comp, 'getCurrentVotes', [proposal._address]);
        const remainingVotes = new BigNumber(proposalThreshold).minus(new BigNumber(currentVotes)).plus(1);

        expect(await call(proposal, 'isReadyToLaunch')).toEqual(false);

        // Create Compound mini whale
        await send(comp, 'transfer', [compWhale, uint(remainingVotes.toFixed())], { from: root });
        // Whale delegates just enough to push proposal through
        await send(comp, 'delegate', [proposal._address], {from: compWhale});

        // TODO fix this line
        // expect(await call(comp, 'getCurrentVotes', [proposal._address])).toEqual(proposalThreshold + 1);
        expect(await call(proposal, 'isReadyToLaunch')).toEqual(true);

        await sendRPC(web3, "evm_mine", []);

        // Launch proposal
        const trx = await send(proposal, 'propose', {from: root});
        const proposalEvent = trx.events['CAProposalProposed'];

        expect(proposalEvent.returnValues.proposer).toEqual(proposer);
        expect(proposalEvent.returnValues.proposal).toEqual(proposal._address);
        const proposalId = proposalEvent.returnValues.proposalId;

        expect(await call(proposal, 'proposalId')).toEqual(proposalId);

        await sendRPC(web3, "evm_mine", []);

        // TODO check votes for proposal and voted field
        await send(proposal, 'vote', {from: root});
        // TODO check votes for proposal and voted field

        expect(await call(comp, 'balanceOf', [proposer])).toEqual("0");
        await send(proposal, 'terminate', {from: proposer});

        // Staked COMP is transfered back to proposer
        expect(await call(comp, 'balanceOf', [proposer])).toEqual(minCompThreshold.toString());
      });
    })
})