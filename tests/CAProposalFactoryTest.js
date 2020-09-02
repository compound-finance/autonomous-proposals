const { uint, address, encodeParameters } = require('./Helpers');

describe('CAProposalFactory', () => {
    let comp, gov, root, a1, accounts;
    let factory;

    const minCompThreshold = 100e18;

    beforeEach(async() => {
      [root, a1, ...accounts] = saddle.accounts;
      comp = await deploy('Comp', [root]);
      gov = await deploy('GovernorAlpha', [address(0), comp._address, root]);
      factory = await deploy('CAProposalFactory', [comp._address, gov._address, uint(minCompThreshold)]);
    });

    describe('metadata', () => {
      it('has given comp', async () => {
        expect(await call(factory, 'comp')).toEqual(comp._address);
      });

      it('has given governor', async () => {
        expect(await call(factory, 'governor')).toEqual(gov._address);
      });

      it('has given min comp threshold', async () => {
        expect(await call(factory, 'compProposalThreshold')).toEqual("100000000000000000000");
      });
    });

    describe('createCAProposal', () => {
        it('successfully creates crowd proposal', async () => {
          const proposer = accounts[0];

          // Fund proposer account
          await send(comp, 'transfer', [proposer, uint(minCompThreshold)], { from: root });
          expect(await call(comp, 'balanceOf', [proposer])).toEqual(minCompThreshold.toString());

          // Approve factory to stake COMP tokens for proposal
          await send(comp, 'approve', [factory._address, uint(minCompThreshold)], {from: proposer});

          // Proposal data
          const targets = [root];
          const values = ["0"];
          const signatures = ["getBalanceOf(address)"];
          const callDatas = [encodeParameters(['address'], [a1])];
          const description = "do nothing";

          const trx = await send(factory, 'createCAProposal', [targets, values, signatures, callDatas, description], {from: proposer});

          // Check balance of proposal and delegated votes
          const proposalEvent = trx.events['CAProposalCreated'];
          expect(proposalEvent.returnValues.proposer).toEqual(proposer);
          const newProposal = proposalEvent.returnValues.proposal;
          expect(await call(comp, 'balanceOf', [newProposal])).toEqual(minCompThreshold.toString());
          expect(await call(comp, 'balanceOf', [proposer])).toEqual("0");
          expect(await call(comp, 'getCurrentVotes', [newProposal])).toEqual(minCompThreshold.toString());
        });

        it('revert if proposer does not have enough Comp', async () => {
          let proposer = accounts[1];

          // Fund proposer account
          const compBalance = 99e18;
          await send(comp, 'transfer', [proposer, uint(compBalance)], { from: root });
          expect(await call(comp, 'balanceOf', [proposer])).toEqual((compBalance).toString());

          // Approve factory to stake COMP tokens for proposal
          await send(comp, 'approve', [factory._address, uint(compBalance)], {from: proposer});

          // Proposal data
          const targets = [root];
          const values = ["0"];
          const signatures = ["getBalanceOf(address)"];
          const callDatas = [encodeParameters(['address'], [a1])];
          const description = "do nothing";

          await expect(send(factory, 'createCAProposal', [targets, values, signatures, callDatas, description], {from: proposer}))
          .rejects.toRevert("revert Min Comp balance requirement is not met");
        });
    });
})