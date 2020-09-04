const Web3 = require('web3');

const web3 = new Web3(); // no provider, since we won't make any calls

function uint(n) {
  return web3.utils.toBN(n).toString();
}

function address(n) {
	return `0x${n.toString(16).padStart(40, '0')}`;
}


function encodeParameters(types, values) {
    return web3.eth.abi.encodeParameters(types, values);
}

function sendRPC(web3_, method, params) {
  return new Promise((resolve, reject) => {
    if (!web3_.currentProvider || typeof (web3_.currentProvider) === 'string') {
      return reject(`cannot send from currentProvider=${web3_.currentProvider}`);
    }

    web3_.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: new Date().getTime() // Id of the request; anything works, really
      },
      (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      }
    );
  });
}

module.exports = {
  sendRPC,
  address,
  uint,
  encodeParameters
};
