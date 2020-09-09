Autonomous Proposals v1.0
=========================
Compound Autonomous Proposals allow anyone with 100 COMP to create/deploy a smart contract with proposal-code (title, description, governance actions) and gather support (via the public delegating to the autonomous proposal contract).

Their 100 COMP are locked into the autonomous proposal, and act as the first 100 votes.

Once the autonomous proposal reaches the Compound governance proposal threshold (currently 100k votes; subject to change), anyone can call the “launch proposal” function, setting it up for a public vote in the Governance system.

One block after the proposal is created (or, longer if the delay parameter changes in the Governance system), anyone can call the “vote” function, casting FOR votes on the proposal.

After the successful proposal execution or if the autonomous proposal sponsor doesn’t feel like the proposal will succeed, they can call the “terminate proposal” function, returning their 100 COMP and self-destructing the autonomous proposal.

Contracts
=========

We detail a few of the core contracts in the Autonomous Proposal.

<dl>
  <dt>CrowdProposalFactory</dt>
  <dd>The proposal factory contract, which creates autonomous proposals and transfer intitial staked COMP tokens to them.</dd>
</dl>

<dl>
  <dt>CrowdProposal</dt>
  <dd>The Autonomous Proposal contract that contains `propose`, `vote` and `terminate` methods.</dd>
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


Discussion
----------

For any concerns with the protocol, open an issue or visit us on [Discord](https://compound.finance/discord) to discuss.

For security concerns, please email [security@compound.finance](mailto:security@compound.finance).

_© Copyright 2020, Compound Labs_
