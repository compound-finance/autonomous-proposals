const { uint256, keccak256, time, numToHex, address, sendRPC, currentBlockTimestamp, fixed } = require('./Helpers');

describe('CAProposalFactory', () => {
    describe('constructor', () => {
      beforeEach(async () => {})

      it('simple test', async () => {
       const dummyAddress1 = address(0);
       const dummyAddress2 = address(1);
       await deploy('CAProposalFactory', [dummyAddress1, dummyAddress2, uint256(100)]);
      });
    })
})