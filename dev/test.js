const Blockchain = require('./blockchain');

const bitcoin = new Blockchain();

bitcoin.createNewBlock(0, '0x0000', '0x0001')
bitcoin.createNewTransaction(10, 'sender1', 'recipient1')

//mine a new block
bitcoin.createNewBlock(1, '0x0001', '0x0002')
// console.log(bitcoin);
console.log(bitcoin.chain[1]);