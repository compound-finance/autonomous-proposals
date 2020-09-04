const { uint, address, encodeParameters } = require('./Helpers');

describe('CrowdProposalFactory', () => {
    let comp, gov, root, a1, accounts;
    let factory;

    const minCompThreshold = 100e18;

    beforeEach(async() => {
      [root, a1, ...accounts] = saddle.accounts;
      comp = await deploy('Comp', [root]);
      gov = await deploy('GovernorAlpha', [address(0), comp._address, root]);
      factory = await deploy('CrowdProposalFactory', [comp._address, gov._address, uint(minCompThreshold)]);
    });

    describe('metadata', () => {
      it('has given comp', async () => {
        expect(await call(factory, 'comp')).toEqual(comp._address);
      });

      it('has given governor', async () => {
        expect(await call(factory, 'governor')).toEqual(gov._address);
      });

      it('has given min comp threshold', async () => {
        expect(await call(factory, 'compStakeAmount')).toEqual("100000000000000000000");
      });
    });

    describe('createCrowdProposal', () => {
        it('successfully creates crowd proposal', async () => {
          const author = accounts[0];

          // Fund author account
          await send(comp, 'transfer', [author, uint(minCompThreshold)], { from: root });
          expect(await call(comp, 'balanceOf', [author])).toEqual(minCompThreshold.toString());

          // Approve factory to stake COMP tokens for proposal
          await send(comp, 'approve', [factory._address, uint(minCompThreshold)], {from: author});

          // Proposal data
          const targets = [root];
          const values = ["0"];
          const signatures = ["getBalanceOf(address)"];
          const callDatas = [encodeParameters(['address'], [a1])];
          const description = "do nothing";

          const trx = await send(factory, 'createCrowdProposal', [targets, values, signatures, callDatas, description], {from: author});

          // Check balance of proposal and delegated votes
          const proposalEvent = trx.events['CrowdProposalCreated'];
          expect(proposalEvent.returnValues.author).toEqual(author);
          const newProposal = proposalEvent.returnValues.proposal;
          expect(await call(comp, 'balanceOf', [newProposal])).toEqual(minCompThreshold.toString());
          expect(await call(comp, 'balanceOf', [author])).toEqual("0");
          expect(await call(comp, 'getCurrentVotes', [newProposal])).toEqual(minCompThreshold.toString());
        });

        it('revert if author does not have enough Comp', async () => {
          let author = accounts[0];

          // Fund author account
          const compBalance = 99e18;
          await send(comp, 'transfer', [author, uint(compBalance)], { from: root });
          expect(await call(comp, 'balanceOf', [author])).toEqual((compBalance).toString());

          // Approve factory to stake COMP tokens for proposal
          await send(comp, 'approve', [factory._address, uint(compBalance)], {from: author});

          // Proposal data
          const targets = [root];
          const values = ["0"];
          const signatures = ["getBalanceOf(address)"];
          const callDatas = [encodeParameters(['address'], [a1])];
          const description = "do nothing";

          await expect(send(factory, 'createCrowdProposal', [targets, values, signatures, callDatas, description], {from: author}))
          .rejects.toRevert("revert Comp::transferFrom: transfer amount exceeds spender allowance");
        });
    });
})