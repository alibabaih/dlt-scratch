const Blockchain = require('./blockchain');

const bitcoin = new Blockchain();

const previousBlockHash = 'dfgsdfgsdhsdg';
const currentBlockData = [
    {
        amount: 101,
        sender: 'asdfasdfasdfasdf',
        recipient: 'recipient1'
    },
    {
        amount: 30,
        sender: 'sender2',
        recipient: 'recipient2'
    },
    {
        amount: 200,
        sender: 'sender3',
        recipient: 'recipient3'
    }
]

let currentNonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData)
console.log("Nonce number is: " + currentNonce)

console.log("New block is: " + bitcoin.hashBlock(previousBlockHash, currentBlockData, currentNonce))
