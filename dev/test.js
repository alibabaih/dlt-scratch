const Ledger = require('./ledger');
const Oracle = require('./oracle');
const ledger = new Ledger();

ledger.createNewBlock(0, '0x0000', '0x0001')
ledger.createNewTransaction(10, 'sender1', 'recipient1', evaluationDate, oracle)

ledger.createNewBlock(1, '0x0001', '0x0002')

console.log(ledger.chain[1]);
