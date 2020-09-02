const { uint, address, encodeParameters, sendRPC } = require('./Helpers');
const BigNumber = require("bignumber.js");

describe('CrowdProposal', () => {
    let comp, gov, root, a1, accounts;
    let author, proposal;

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
      const targets = [root];
      const values = ["0"];
      const signatures = ["getBalanceOf(address)"];
      const callDatas = [encodeParameters(['address'], [a1])];
      const description = "do nothing";
      proposal = await deploy('CrowdProposal', [author, targets, values, signatures, callDatas, description, comp._address, gov._address]);
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
        const quorum = new BigNumber(proposalThreshold).plus(1);
        const remainingVotes = quorum.minus(new BigNumber(currentVotes));

        expect(await call(proposal, 'isReadyToLaunch')).toEqual(false);

        // Create Compound mini whale
        await send(comp, 'transfer', [compWhale, uint(remainingVotes.toFixed())], { from: root });
        // Whale delegates just enough to push proposal through
        await send(comp, 'delegate', [proposal._address], {from: compWhale});

        expect(await call(comp, 'getCurrentVotes', [proposal._address])).toEqual(quorum.toFixed());
        expect(await call(proposal, 'isReadyToLaunch')).toEqual(true);

        // Launch proposal
        const trx = await send(proposal, 'propose', {from: root});

        const proposalEvent = trx.events['CrowdProposalProposed'];
        expect(proposalEvent.returnValues.author).toEqual(author);
        expect(proposalEvent.returnValues.proposal).toEqual(proposal._address);
        const govProposalId = proposalEvent.returnValues.proposalId;

        expect(await call(proposal, 'govProposalId')).toEqual(govProposalId);

        await sendRPC(web3, "evm_mine", []);

        expect(await call(comp, 'balanceOf', [author])).toEqual("0");
        await send(proposal, 'terminate', {from: author});

        // Staked COMP is transfered back to author
        expect(await call(comp, 'balanceOf', [author])).toEqual(minCompThreshold.toString());
      });
    })
})