Autonomous Proposals
====================
Compound Autonomous Proposals allow anyone with enough COMP stake (currently 100; subject to change) to create an autonomous proposal and gather public support by receiving delegations to the autonomous proposal contract.

The staked COMP tokens are locked into the autonomous proposal contract, and act as the first 100 votes for the future governance proposal.

Once the autonomous proposal reaches the governance proposal threshold (currently 100k votes; subject to change), anyone can call the __propose__ method, setting it up for a public vote in the Compound Governance system.

One block after the proposal is created (or, longer if the delay parameter changes in the Governance system), anyone can call the __vote__ function, casting FOR votes on the proposal.

After the successful proposal execution or if the autonomous proposal author doesn’t feel like the proposal will succeed, they can call the __terminate__ method, terminating autonomous proposal and returning their staked COMP tokens.

Contracts
=========

We detail a few of the core contracts in the Autonomous Proposals v1.0:

<dl>
  <dt>CrowdProposalFactory</dt>
  <dd>The proposal factory contract, which creates autonomous proposals and transfer intitial staked COMP tokens to them with <strong>createCrowdProposal</strong> method.</dd>
</dl>

<dl>
  <dt>CrowdProposal</dt>
  <dd>The Autonomous Proposal contract that contains <strong>propose</strong>, <strong>vote</strong> and <strong>terminate</strong> methods.</dd>
</dl>

Installation
------------
To run autonomous proposals, pull the repository from GitHub and install its dependencies. You will need [yarn](https://yarnpkg.com/lang/en/docs/install/) or [npm](https://docs.npmjs.com/cli/install) installed.

    git clone https://github.com/compound-finance/autonomous-proposals
    cd autonomous-proposals
    yarn install --lock-file # or `npm install`

Testing
-------
Jest contract tests are defined under the [tests directory](https://github.com/compound-finance/autonomous-proposals/tree/master/tests). To run the tests run:

    yarn test
    
Deployment
-------
To deploy autonomous proposal factory:

``` npx saddle deploy CrowdProposalFactory "COMP_address" "Governor_address" "100000000000000000000" --network ropsten ```


Discussion
----------

For any concerns with the protocol, open an issue or visit us on [Discord](https://compound.finance/discord) to discuss.

For security concerns, please email [security@compound.finance](mailto:security@compound.finance).

_© Copyright 2020, Compound Labs_
