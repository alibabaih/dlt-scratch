const Ledger = require('./ledger');
const Oracle = require('./oracle');
const ledger = new Ledger();

// ledger.createNewBlock(0, '0x0000', '0x0001')
// ledger.createNewTransaction(10, 'sender1', 'recipient1', evaluationDate, oracle)

// ledger.createNewBlock(1, '0x0001', '0x0002')

// console.log(ledger.chain[1]);



const weather_oracle_1 = new Oracle();
weather_oracle_1.setConditions(true)
weather_oracle_1.setDate("date")
const weather_oracle_2 = new Oracle("date", false);

console.log('weather_oracle_1: ' + weather_oracle_1.date + weather_oracle_1.conditions, 'weather_oracle_2' + weather_oracle_2);
