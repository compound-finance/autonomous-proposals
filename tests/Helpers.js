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

function mergeInterface(into, from) {
  const key = (item) => item.inputs ? `${item.name}/${item.inputs.length}` : item.name;
  const existing = into.options.jsonInterface.reduce((acc, item) => {
    acc[key(item)] = true;
    return acc;
  }, {});
  const extended = from.options.jsonInterface.reduce((acc, item) => {
    if (!(key(item) in existing))
      acc.push(item)
    return acc;
  }, into.options.jsonInterface.slice());
  into.options.jsonInterface = into.options.jsonInterface.concat(from.options.jsonInterface);
  return into;
}

module.exports = {
  sendRPC,
  address,
  uint,
  encodeParameters,
  mergeInterface
};
